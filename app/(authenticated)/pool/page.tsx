'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'
import PoolTable from '@/components/pool/PoolTable'
import PoolFormDialog from '@/components/pool/PoolFormDialog'
import PoolDetailsDialog from '@/components/pool/PoolDetailsDialog'
import PoolCharts from '@/components/pool/PoolCharts'
import { isSuperAdmin, isUnitManager } from '@/lib/auth-utils'

interface Pool {
  id: string
  period: string
  revenue_total: number
  deduction_total: number
  net_pool: number | null
  global_allocation_percentage: number
  allocated_amount: number | null
  status: 'draft' | 'approved' | 'distributed'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export default function PoolManagementPage() {
  const [pools, setPools] = useState<Pool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloadingGuide, setIsDownloadingGuide] = useState(false)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)

  const loadPools = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      // Fetch user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        if (isSuperAdmin(user as any)) {
          setUserRole('superadmin')
        } else if (isUnitManager(user as any)) {
          setUserRole('unit_manager')
        } else {
          // Fallback to m_employees table for other roles
          const { data: employeeData } = await supabase
            .from('m_employees')
            .select('role')
            .eq('user_id', user.id)
            .single()

          if (employeeData) {
            setUserRole(employeeData.role)
          }
        }
      }

      const { data, error } = await supabase
        .from('t_pool')
        .select('*')
        .order('period', { ascending: false })

      if (error) throw error
      setPools(data || [])

      if (data && data.length > 0) {
        const latestPoolId = data[0].id
        const { data: revData } = await supabase
          .from('t_pool_revenue')
          .select('category, amount, patient_count')
          .eq('pool_id', latestPoolId)

        // Aggregate by category
        const aggregated = (revData || []).reduce((acc: any, curr: any) => {
          const cat = curr.category || 'Lainnya'
          if (!acc[cat]) acc[cat] = { category: cat, amount: 0, patient_count: 0 }
          acc[cat].amount += Number(curr.amount)
          acc[cat].patient_count += Number(curr.patient_count || 0)
          return acc
        }, {})

        setRevenueData(Object.values(aggregated))
      }
    } catch (error: any) {
      console.error('Error loading pools:', error)
      setError(error.message || 'Gagal memuat data pool')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPools()
  }, [loadPools])

  const handleCreatePool = useCallback(() => {
    setSelectedPool(null)
    setIsFormDialogOpen(true)
  }, [])

  const handleViewPool = useCallback((pool: Pool) => {
    setSelectedPool(pool)
    setIsDetailsDialogOpen(true)
  }, [])

  const handleApprovePool = useCallback(async (poolId: string) => {
    if (!confirm('Apakah Anda yakin ingin menyetujui pool ini? Setelah disetujui, pool tidak dapat diubah lagi.')) {
      return
    }

    try {
      const supabase = createClient()
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Pengguna tidak terautentikasi')

      const { data: employee } = await supabase
        .from('m_employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!employee) throw new Error('Data pegawai tidak ditemukan')

      // Update pool status
      const { error } = await supabase
        .from('t_pool')
        .update({
          status: 'approved',
          approved_by: employee.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', poolId)

      if (error) throw error

      alert('Pool berhasil disetujui!')
      await loadPools()
    } catch (error: any) {
      console.error('Error approving pool:', error)
      alert(error.message || 'Gagal menyetujui pool')
    }
  }, [loadPools])

  const handleDownloadGuide = useCallback(async () => {
    setIsDownloadingGuide(true)
    try {
      const response = await fetch('/api/kpi-config/guide')
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Gagal mengunduh petunjuk')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Panduan_Konfigurasi_KPI.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Error downloading guide:', error)
      alert(error.message || 'Gagal mengunduh petunjuk. Silakan coba lagi.')
    } finally {
      setIsDownloadingGuide(false)
    }
  }, [])


  const trendData = useMemo(() => {
    return [...pools].reverse().slice(-6).map(p => ({
      period: p.period,
      revenue: Number(p.revenue_total)
    }))
  }, [pools])

  return (
    <div className="p-6 space-y-6 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Pool</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Kelola pool keuangan untuk distribusi insentif kinerja</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleDownloadGuide}
            variant="outline"
            disabled={isDownloadingGuide}
            className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {isDownloadingGuide ? 'Mengunduh...' : 'Unduh Panduan'}
          </Button>
          {userRole === 'superadmin' && (
            <Button
              onClick={handleCreatePool}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 shadow-md shadow-blue-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buat Periode Baru
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {pools.length > 0 && (
        <PoolCharts
          revenueData={revenueData}
          trendData={trendData}
          selectedPeriod={pools[0].period}
        />
      )}

      <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-6">
          <CardTitle className="text-xl font-bold text-slate-800">Riwayat Pool Keuangan</CardTitle>
          <CardDescription>Daftar lengkap alokasi pendapatan dan potongan tiap periode</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Memuat data pool...
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada pool. Klik "Buat Pool" untuk membuat pool baru.
            </div>
          ) : (
            <PoolTable
              pools={pools}
              onView={handleViewPool}
              onApprove={handleApprovePool}
              userRole={userRole}
            />
          )}
        </CardContent>
      </Card>

      <PoolFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSuccess={loadPools}
      />

      <PoolDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        pool={selectedPool}
        onUpdate={loadPools}
        userRole={userRole}
      />
    </div>
  )
}
