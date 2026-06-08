'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'
import PoolTable from '@/components/pool/PoolTable'
import PoolFormDialog from '@/components/pool/PoolFormDialog'
import PoolDetailsDialog from '@/components/pool/PoolDetailsDialog'

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

  const loadPools = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('t_pool')
        .select('*')
        .order('period', { ascending: false })

      if (error) throw error
      setPools(data || [])

      // Update selected pool if it's currently being viewed/edited
      if (data) {
        setSelectedPool(prev => {
          if (!prev) return null
          const updated = data.find(p => p.id === prev.id)
          return updated || prev
        })
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pool</h1>
          <p className="text-gray-600 mt-1">Kelola pool keuangan untuk distribusi insentif</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleDownloadGuide}
            disabled={isDownloadingGuide}
            className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {isDownloadingGuide ? 'Mengunduh...' : 'Unduh Petunjuk'}
          </Button>
          <Button onClick={handleCreatePool}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Pool
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pool</CardTitle>
          <CardDescription>Lihat dan kelola semua pool keuangan</CardDescription>
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
      />
    </div>
  )
}
