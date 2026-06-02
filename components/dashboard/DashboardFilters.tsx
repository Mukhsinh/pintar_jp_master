'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar, Filter, Download } from 'lucide-react'

interface DashboardFiltersProps {
  onFilterChange?: (filters: FilterState) => void
  showUnitFilter?: boolean
  showPeriodFilter?: boolean
  showExport?: boolean
  units?: Array<{ id: string, name: string }>
}

export interface FilterState {
  period: string
  unit?: string
  year: string
}

export function DashboardFilters({
  onFilterChange,
  showUnitFilter = false,
  showPeriodFilter = true,
  showExport = true,
  units = []
}: DashboardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentYear = new Date().getFullYear()

  const currentUnit = searchParams.get('unit_id') || 'all'
  const currentYearVal = searchParams.get('year') || currentYear.toString()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || !value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <Card className="mb-6 overflow-visible">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">Filter</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 md:gap-4 flex-1">
            {showPeriodFilter && (
              <div className="flex items-center gap-2 w-full">
                <Calendar className="h-4 w-4 text-gray-400 hidden sm:block" />
                <select
                  value={searchParams.get('period') || 'month'}
                  onChange={(e) => handleFilterChange('period', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <optgroup label="Bulan">
                    <option value="M-01">Januari</option>
                    <option value="M-02">Februari</option>
                    <option value="M-03">Maret</option>
                    <option value="M-04">April</option>
                    <option value="M-05">Mei</option>
                    <option value="M-06">Juni</option>
                    <option value="M-07">Juli</option>
                    <option value="M-08">Agustus</option>
                    <option value="M-09">September</option>
                    <option value="M-10">Oktober</option>
                    <option value="M-11">November</option>
                    <option value="M-12">Desember</option>
                  </optgroup>
                  <optgroup label="Kuartal">
                    <option value="Q-1">Kuartal 1</option>
                    <option value="Q-2">Kuartal 2</option>
                    <option value="Q-3">Kuartal 3</option>
                    <option value="Q-4">Kuartal 4</option>
                  </optgroup>
                  <optgroup label="Semester">
                    <option value="S-1">Semester 1</option>
                    <option value="S-2">Semester 2</option>
                  </optgroup>
                  <optgroup label="Lainnya">
                    <option value="full-year">Akhir Tahun</option>
                    <option value="month">Bulan Ini</option>
                  </optgroup>
                </select>
              </div>
            )}

            <div className="w-full sm:w-auto">
              <select
                value={currentYearVal}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {showUnitFilter && (
              <div className="w-full lg:min-w-[200px]">
                <select
                  value={currentUnit}
                  onChange={(e) => handleFilterChange('unit_id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="all">Semua Unit</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
            )}

            {showExport && (
              <div className="sm:col-span-2 lg:ml-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto font-semibold text-blue-600 border-blue-100 hover:bg-blue-50">
                  <Download className="h-4 w-4 mr-2" />
                  Eksport
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
