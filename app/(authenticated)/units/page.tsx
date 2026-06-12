'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { UnitTable } from '@/components/units/UnitTable'
import { createClient } from '@/lib/supabase/client'

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
      const supabase = createClient()

      // Get all units with employee count in one go if possible
      // Otherwise fallback to individual counts if join fails
      const { data: units, error: unitsError } = await supabase
        .from('m_units')
        .select(`
          *,
          employees:m_employees(count)
        `)
        .neq('code', 'superadmin')
        .order('code', { ascending: true })

      if (unitsError) {
        console.error('Error fetching units with counts:', unitsError)

        // Fallback: fetch units normally then counts
        const { data: simpleUnits, error: simpleError } = await supabase
          .from('m_units')
          .select('*')
          .order('code', { ascending: true })

        if (simpleError) throw simpleError

        const unitsWithCounts = await Promise.all(
          (simpleUnits || []).map(async (unit) => {
            const { count } = await supabase
              .from('m_employees')
              .select('*', { count: 'exact', head: true })
              .eq('unit_id', unit.id)

            return {
              ...unit,
              employees: [{ count: count || 0 }]
            }
          })
        )
        setUnits(unitsWithCounts)
      } else {
        console.log('Units with counts from DB:', units)
        setUnits(units || [])
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
