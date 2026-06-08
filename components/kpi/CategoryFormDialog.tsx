'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { KPICategory } from '@/lib/types/kpi.types'
import { Download, FileSpreadsheet } from 'lucide-react'
import ExcelImportDialog from './ExcelImportDialog'

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: KPICategory | null
  unitId: string | null
  existingCategories: KPICategory[]
  onSuccess: () => void
}

export default function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  unitId,
  existingCategories,
  onSuccess
}: CategoryFormDialogProps) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category: 'P1' as 'P1' | 'P2' | 'P3',
    category_name: '',
    weight_percentage: '',
    description: '',
    configuration_style: 'percentage' as 'percentage' | 'activity',
    is_weighted: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [unitName, setUnitName] = useState<string>('')

  useEffect(() => {
    async function fetchUnit() {
      const id = unitId || category?.unit_id
      if (!id) return

      const { data, error } = await supabase
        .from('m_units')
        .select('name')
        .eq('id', id)
        .single()

      if (data) {
        setUnitName(data.name)
      }
    }
    fetchUnit()
  }, [unitId, category])

  useEffect(() => {
    if (category) {
      setFormData({
        category: category.category,
        category_name: category.category_name,
        weight_percentage: category.weight_percentage.toString(),
        description: category.description || '',
        configuration_style: category.configuration_style || 'percentage',
        is_weighted: category.is_weighted ?? true
      })
    } else {
      setFormData({
        category: 'P1',
        category_name: '',
        weight_percentage: '',
        description: '',
        configuration_style: 'percentage',
        is_weighted: true
      })
    }
    setErrors({})
  }, [category, open])

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.category_name.trim()) {
      newErrors.category_name = 'Nama kategori wajib diisi'
    }

    if (formData.is_weighted && formData.configuration_style === 'percentage') {
      if (!formData.weight_percentage) {
        newErrors.weight_percentage = 'Persentase bobot wajib diisi'
      } else {
        const weight = parseFloat(formData.weight_percentage)
        if (isNaN(weight) || weight <= 0) {
          newErrors.weight_percentage = 'Bobot harus lebih besar dari 0'
        } else {
          // Check if total weight would exceed 100%
          const otherCategories = existingCategories.filter(
            c => c.id !== category?.id && c.configuration_style !== 'activity' && c.is_weighted !== false
          )
          const otherWeightsSum = otherCategories.reduce((sum, c) => sum + Number(c.weight_percentage), 0)
          const totalWeight = otherWeightsSum + weight

          if (totalWeight > 100.01) { // Allow small floating point tolerance
            newErrors.weight_percentage = `Total bobot akan menjadi ${totalWeight.toFixed(2)}% (maksimal 100%)`
          }
        }
      }
    }

    // Check if category type already exists (only for new categories)
    if (!category) {
      const categoryExists = existingCategories.some(c => c.category === formData.category)
      if (categoryExists) {
        newErrors.category = `Kategori ${formData.category} sudah ada untuk unit ini`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function getTotalWeightInfo(): { total: number; isValid: boolean; message: string } {
    if (!formData.is_weighted || formData.configuration_style === 'activity') {
      return { total: 0, isValid: true, message: 'Kategori Tanpa Bobot tidak menggunakan bobot.' }
    }

    const weight = parseFloat(formData.weight_percentage) || 0
    const otherCategories = existingCategories.filter(
      c => c.id !== category?.id && c.configuration_style !== 'activity' && c.is_weighted !== false
    )
    const otherWeightsSum = otherCategories.reduce((sum, c) => sum + Number(c.weight_percentage), 0)
    const totalWeight = otherWeightsSum + weight
    const isValid = Math.abs(totalWeight - 100) < 0.01

    return {
      total: totalWeight,
      isValid,
      message: isValid
        ? `Total bobot: ${totalWeight.toFixed(2)}% ✓`
        : `Total bobot: ${totalWeight.toFixed(2)}% (harus 100%)`
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return
    if (!unitId && !category) return

    setIsSubmitting(true)

    try {
      const data = {
        unit_id: category?.unit_id || unitId,
        category: formData.category,
        category_name: formData.category_name.trim(),
        weight_percentage: (!formData.is_weighted || formData.configuration_style === 'activity') ? 0 : parseFloat(formData.weight_percentage),
        description: formData.description.trim() || null,
        is_active: true,
        configuration_style: formData.configuration_style,
        is_weighted: formData.is_weighted
      }

      if (category) {
        // Update existing category
        const { error } = await supabase
          .from('m_kpi_categories')
          .update(data)
          .eq('id', category.id)

        if (error) throw error
      } else {
        // Create new category
        const { error } = await supabase
          .from('m_kpi_categories')
          .insert(data)

        if (error) throw error
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving category:', error)
      alert(error.message || 'Gagal menyimpan kategori')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{category ? 'Ubah Kategori' : 'Tambah Kategori'}</DialogTitle>
            <DialogDescription>
              {category ? 'Perbarui informasi kategori' : 'Buat kategori KPI baru (P1, P2, atau P3)'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="space-y-4 py-4">
              {/* Weighted or Unweighted */}
              <div className="space-y-2">
                <Label htmlFor="is_weighted">Tipe Bobot *</Label>
                <select
                  id="is_weighted"
                  value={formData.is_weighted ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_weighted: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="true">Dengan Bobot (Weighted)</option>
                  <option value="false">Tanpa Bobot (Unweighted)</option>
                </select>
                <p className="text-xs text-gray-500">
                  Kategori tanpa bobot tidak akan dikalikan dengan bobot pada saat penilaian dan perhitungan.
                </p>
              </div>

              {/* Category Type */}
              <div className="space-y-2">
                <Label htmlFor="category">Tipe Kategori *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as 'P1' | 'P2' | 'P3' })}
                  disabled={!!category}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Configuration Style */}
              <div className="space-y-2">
                <Label htmlFor="configuration_style">Metode Perhitungan</Label>
                <select
                  id="configuration_style"
                  value={formData.configuration_style}
                  onChange={(e) => setFormData({ ...formData, configuration_style: e.target.value as 'percentage' | 'activity' })}
                  disabled={!!category}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="percentage">Berbasis Persentase (Standar)</option>
                  <option value="activity">Berbasis Aktivitas (Nilai Dasar Indeks)</option>
                </select>
                <p className="text-xs text-gray-500">
                  Unit Medis biasanya menggunakan metode Berbasis Aktivitas untuk menentukan Nilai Dasar Indeks.
                </p>
              </div>

              {/* Category Name */}
              <div className="space-y-2">
                <Label htmlFor="category_name">Nama Kategori *</Label>
                <Input
                  id="category_name"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  placeholder="contoh: Pelayanan Medis"
                />
                {errors.category_name && (
                  <p className="text-sm text-red-600">{errors.category_name}</p>
                )}
              </div>

              {/* Weight Percentage */}
              {formData.is_weighted && formData.configuration_style === 'percentage' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight_percentage">Persentase Bobot (%) *</Label>
                    <Input
                      id="weight_percentage"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={formData.weight_percentage}
                      onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
                      placeholder="contoh: 33.33"
                    />
                    {errors.weight_percentage && (
                      <p className="text-sm text-red-600">{errors.weight_percentage}</p>
                    )}
                    {formData.weight_percentage && !errors.weight_percentage && (() => {
                      const weightInfo = getTotalWeightInfo()
                      return (
                        <p className={`text-sm font-medium ${weightInfo.isValid ? 'text-green-600' : 'text-amber-600'}`}>
                          {weightInfo.message}
                        </p>
                      )
                    })()}
                  </div>

                  {/* Import/Template Section for Medical - only if category already exists to have an ID and unit is MEDIS */}
                  {category && unitName === 'MEDIS' && (
                    <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Struktur Indikator</Label>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-bold">Medis</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('/Index_Dokter_Detail.xls', '_blank')}
                          className="text-xs border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Template
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsImportDialogOpen(true)}
                          className="text-xs border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                          Import Data
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">
                        Gunakan fitur ini untuk mengisi otomatis indikator berdasarkan template standar.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Total semua bobot kategori (P1 + P2 + P3) harus sama dengan 100%. Bobot individual bisa kurang dari 100%.
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                  placeholder="Deskripsi opsional"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : category ? 'Perbarui' : 'Buat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {category && (
        <ExcelImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          unitId={unitId || category.unit_id}
          categoryId={category.id}
          categoryCode={category.category}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  )
}
