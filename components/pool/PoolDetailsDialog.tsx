'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface Pool {
  id: string
  period: string
  revenue_total: number
  deduction_total: number
  net_pool: number | null
  global_allocation_percentage: number
  allocated_amount: number | null
  status: 'draft' | 'approved' | 'distributed'
}

interface RevenueItem {
  id: string
  pool_id: string
  description: string
  amount: number
}

interface DeductionItem {
  id: string
  pool_id: string
  description: string
  amount: number
}

interface PoolDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pool: Pool | null
  onUpdate: () => void
}

export default function PoolDetailsDialog({
  open,
  onOpenChange,
  pool,
  onUpdate
}: PoolDetailsDialogProps) {
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([])
  const [deductionItems, setDeductionItems] = useState<DeductionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Revenue form
  const [revenueForm, setRevenueForm] = useState({ description: '', amount: '' })
  const [editingRevenue, setEditingRevenue] = useState<string | null>(null)

  // Deduction form
  const [deductionForm, setDeductionForm] = useState({ description: '', amount: '' })
  const [editingDeduction, setEditingDeduction] = useState<string | null>(null)
  const [allocationPercentage, setAllocationPercentage] = useState('')

  useEffect(() => {
    if (pool && open) {
      loadPoolItems()
      setAllocationPercentage(pool.global_allocation_percentage.toString())
    }
  }, [pool, open])

  async function loadPoolItems() {
    if (!pool) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      // Load revenue items
      const { data: revenueData, error: revenueError } = await supabase
        .from('t_pool_revenue')
        .select('*')
        .eq('pool_id', pool.id)
        .order('created_at')

      if (revenueError) throw revenueError
      setRevenueItems(revenueData || [])

      // Load deduction items
      const { data: deductionData, error: deductionError } = await supabase
        .from('t_pool_deduction')
        .select('*')
        .eq('pool_id', pool.id)
        .order('created_at')

      if (deductionError) throw deductionError
      setDeductionItems(deductionData || [])
    } catch (error) {
      console.error('Error loading pool items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddRevenue() {
    if (!pool || !revenueForm.description || !revenueForm.amount) return
    if (pool.status !== 'draft') {
      alert('Tidak dapat mengubah pool yang sudah disetujui')
      return
    }

    try {
      const supabase = createClient()

      if (editingRevenue) {
        // Update existing revenue
        const { error } = await supabase
          .from('t_pool_revenue')
          .update({
            description: revenueForm.description,
            amount: parseFloat(revenueForm.amount)
          })
          .eq('id', editingRevenue)

        if (error) throw error
        setEditingRevenue(null)
      } else {
        // Insert new revenue
        const { error } = await supabase
          .from('t_pool_revenue')
          .insert({
            pool_id: pool.id,
            description: revenueForm.description,
            amount: parseFloat(revenueForm.amount)
          })

        if (error) throw error
      }

      await updatePoolTotals()
      setRevenueForm({ description: '', amount: '' })
      await loadPoolItems()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving revenue:', error)
      alert(error.message || 'Gagal menyimpan pendapatan')
    }
  }

  function handleEditRevenue(item: RevenueItem) {
    setEditingRevenue(item.id)
    setRevenueForm({
      description: item.description,
      amount: item.amount.toString()
    })
  }

  function handleCancelEditRevenue() {
    setEditingRevenue(null)
    setRevenueForm({ description: '', amount: '' })
  }

  async function handleDeleteRevenue(id: string) {
    if (!pool || pool.status !== 'draft') {
      alert('Tidak dapat mengubah pool yang sudah disetujui')
      return
    }

    if (!confirm('Hapus item pendapatan ini?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('t_pool_revenue')
        .delete()
        .eq('id', id)

      if (error) throw error

      await updatePoolTotals()
      await loadPoolItems()
      onUpdate()
    } catch (error: any) {
      console.error('Error deleting revenue:', error)
      alert(error.message || 'Gagal menghapus pendapatan')
    }
  }

  async function handleAddDeduction() {
    if (!pool || !deductionForm.description || !deductionForm.amount) return
    if (pool.status !== 'draft') {
      alert('Tidak dapat mengubah pool yang sudah disetujui')
      return
    }

    try {
      const supabase = createClient()

      if (editingDeduction) {
        // Update existing deduction
        const { error } = await supabase
          .from('t_pool_deduction')
          .update({
            description: deductionForm.description,
            amount: parseFloat(deductionForm.amount)
          })
          .eq('id', editingDeduction)

        if (error) throw error
        setEditingDeduction(null)
      } else {
        // Insert new deduction
        const { error } = await supabase
          .from('t_pool_deduction')
          .insert({
            pool_id: pool.id,
            description: deductionForm.description,
            amount: parseFloat(deductionForm.amount)
          })

        if (error) throw error
      }

      await updatePoolTotals()
      setDeductionForm({ description: '', amount: '' })
      await loadPoolItems()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving deduction:', error)
      alert(error.message || 'Gagal menyimpan potongan')
    }
  }

  function handleEditDeduction(item: DeductionItem) {
    setEditingDeduction(item.id)
    setDeductionForm({
      description: item.description,
      amount: item.amount.toString()
    })
  }

  function handleCancelEditDeduction() {
    setEditingDeduction(null)
    setDeductionForm({ description: '', amount: '' })
  }

  async function handleDeleteDeduction(id: string) {
    if (!pool || pool.status !== 'draft') {
      alert('Tidak dapat mengubah pool yang sudah disetujui')
      return
    }

    if (!confirm('Hapus item potongan ini?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('t_pool_deduction')
        .delete()
        .eq('id', id)

      if (error) throw error

      await updatePoolTotals()
      await loadPoolItems()
      onUpdate()
    } catch (error: any) {
      console.error('Error deleting deduction:', error)
      alert(error.message || 'Gagal menghapus potongan')
    }
  }

  async function updatePoolTotals() {
    if (!pool) return

    try {
      const supabase = createClient()
      // Calculate revenue total
      const { data: revenueData } = await supabase
        .from('t_pool_revenue')
        .select('amount')
        .eq('pool_id', pool.id)

      const revenueTotal = revenueData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0

      // Calculate deduction total
      const { data: deductionData } = await supabase
        .from('t_pool_deduction')
        .select('amount')
        .eq('pool_id', pool.id)

      const deductionTotal = deductionData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0

      // Update pool
      const { error } = await supabase
        .from('t_pool')
        .update({
          revenue_total: revenueTotal,
          deduction_total: deductionTotal
        })
        .eq('id', pool.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating pool totals:', error)
    }
  }

  async function handleUpdatePercentage() {
    if (!pool || !allocationPercentage) return
    if (pool.status !== 'draft') return

    const percentage = parseFloat(allocationPercentage)
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Persentase harus antara 0 dan 100')
      setAllocationPercentage(pool.global_allocation_percentage.toString())
      return
    }

    if (percentage === pool.global_allocation_percentage) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('t_pool')
        .update({
          global_allocation_percentage: percentage
        })
        .eq('id', pool.id)

      if (error) throw error
      onUpdate()
    } catch (error: any) {
      console.error('Error updating percentage:', error)
      alert(error.message || 'Gagal memperbarui persentase')
      setAllocationPercentage(pool.global_allocation_percentage.toString())
    }
  }

  async function handleFinalSave() {
    if (isDraft) {
      const percentage = parseFloat(allocationPercentage)
      if (!isNaN(percentage) && percentage !== pool.global_allocation_percentage) {
        await handleUpdatePercentage()
      }
    }
    onOpenChange(false)
  }

  if (!pool) return null

  const isDraft = pool.status === 'draft'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Pool - {pool.period}</DialogTitle>
          <DialogDescription>
            Status: <span className="font-semibold">{pool.status.toUpperCase()}</span>
            {!isDraft && ' (Hanya Baca)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg mb-6">
            <div className="px-2">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Total Pendapatan</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(pool.revenue_total)}</p>
            </div>
            <div className="px-2 border-l border-gray-200">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Total Potongan</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(pool.deduction_total)}</p>
            </div>
            <div className="px-2 border-l border-gray-200">
              <p className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Pool Bersih</p>
              <p className="text-base font-bold text-blue-700">{formatCurrency(pool.net_pool || 0)}</p>
            </div>
            <div className="px-2 border-l border-gray-200">
              <p className="text-[10px] uppercase font-bold text-green-600 mb-0.5">Dialokasikan ({pool.global_allocation_percentage}%)</p>
              <p className="text-base font-bold text-green-700">{formatCurrency(pool.allocated_amount || 0)}</p>
            </div>
          </div>

          {/* Revenue Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Item Pendapatan</h3>
            </div>

            {isDraft && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Deskripsi"
                  value={revenueForm.description}
                  onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Jumlah"
                  value={revenueForm.amount}
                  onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                  className="w-40"
                />
                <Button onClick={handleAddRevenue} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {editingRevenue ? 'Simpan' : 'Tambah'}
                </Button>
                {editingRevenue && (
                  <Button onClick={handleCancelEditRevenue} size="sm" variant="outline">
                    Batal
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {revenueItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada item pendapatan</p>
              ) : (
                revenueItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-white border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{formatCurrency(item.amount)}</p>
                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRevenue(item)}
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRevenue(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deduction Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Item Potongan</h3>
            </div>

            {isDraft && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Deskripsi"
                  value={deductionForm.description}
                  onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Jumlah"
                  value={deductionForm.amount}
                  onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                  className="w-40"
                />
                <Button onClick={handleAddDeduction} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {editingDeduction ? 'Simpan' : 'Tambah'}
                </Button>
                {editingDeduction && (
                  <Button onClick={handleCancelEditDeduction} size="sm" variant="outline">
                    Batal
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {deductionItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada item potongan</p>
              ) : (
                deductionItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-white border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{formatCurrency(item.amount)}</p>
                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDeduction(item)}
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDeduction(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 px-6 pb-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {isDraft && (
                <>
                  <span className="text-xs font-semibold text-gray-600">Konfigurasi Alokasi:</span>
                  <div className="flex items-center bg-white border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-blue-500">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-16 h-8 text-xs font-bold text-right focus:outline-none px-2"
                      value={allocationPercentage}
                      onChange={(e) => setAllocationPercentage(e.target.value)}
                    />
                    <div className="bg-gray-50 border-l border-gray-200 px-2 h-8 flex items-center">
                      <span className="text-[10px] font-bold text-gray-400">%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleFinalSave}
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-8"
            >
              Simpan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
