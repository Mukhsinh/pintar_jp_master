'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, RefreshCw, PieChart, Building2, Users } from 'lucide-react'
import { UnitTable } from '@/components/units/UnitTable'
import { getUnitsWithCounts } from './actions'

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function UnitsPage() {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const loadUnits = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getUnitsWithCounts()

      if (result.error) {
        console.error('Error loading units:', result.error)
      } else {
        setUnits(result.data || [])
      }
    } catch (error) {
      console.error('Error loading units:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Filter units based on search term
  const filteredUnits = units.filter(unit => {
    if (!debouncedSearchTerm) return true
    const searchLower = debouncedSearchTerm.toLowerCase()
    return (
      unit.code?.toLowerCase().includes(searchLower) ||
      unit.name?.toLowerCase().includes(searchLower)
    )
  })

  // Calculate total proportion from all units
  const totalProportion = useMemo(() => {
    return units.reduce((sum, unit) => {
      return sum + (parseFloat(unit.proportion_percentage) || 0)
    }, 0)
  }, [units])

  // Calculate total employees across all units
  const totalEmployees = useMemo(() => {
    return units
      .filter(u => u.name?.toUpperCase() !== 'SUPERADMIN')
      .reduce((sum, unit) => {
        const empCount = unit.employees?.[0]?.count || 0
        return sum + empCount
      }, 0)
  }, [units])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Unit</h1>
          <p className="text-gray-500">Kelola unit organisasi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUnits} disabled={loading}>
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg hover:border-blue-200 transition-all duration-300 border border-gray-100 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Unit</CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{units.length}</div>
            <p className="text-sm text-gray-500 font-medium">unit terdaftar</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:border-emerald-200 transition-all duration-300 border border-gray-100 bg-gradient-to-br from-white to-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Pegawai</CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{totalEmployees}</div>
            <p className="text-sm text-gray-500 font-medium">pegawai di semua unit</p>
          </CardContent>
        </Card>

        <Card className={`hover:shadow-lg transition-all duration-300 border ${totalProportion === 100 ? 'border-green-200 hover:border-green-300 bg-gradient-to-br from-white to-green-50/30' : 'border-amber-200 hover:border-amber-300 bg-gradient-to-br from-white to-amber-50/30'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Proporsi</CardTitle>
            <div className={`p-2.5 rounded-lg ${totalProportion === 100 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-amber-50 to-amber-100'}`}>
              <PieChart className={`h-5 w-5 ${totalProportion === 100 ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${totalProportion === 100 ? 'text-green-700' : 'text-amber-700'}`}>
              {totalProportion.toFixed(2)}%
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {totalProportion === 100
                ? '✓ Proporsi seimbang (100%)'
                : 'dari total klaim terverifikasi dan terbayar'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Unit</CardTitle>
          <CardDescription>
            Total: {filteredUnits.length} unit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan kode atau nama unit..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <UnitTable units={filteredUnits} onSuccess={loadUnits} />
        </CardContent>
      </Card>
    </div>
  )
}

