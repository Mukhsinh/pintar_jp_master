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
import type { KPICategory, KPIIndicator } from '@/lib/types/kpi.types'

interface IndicatorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  indicator: KPIIndicator | null
  category: KPICategory | null
  existingIndicators: KPIIndicator[]
  onSuccess: () => void
}

export default function IndicatorFormDialog({
  open,
  onOpenChange,
  indicator,
  category,
  existingIndicators,
  onSuccess
}: IndicatorFormDialogProps) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    target_value: '100.00',
    weight_percentage: '',
    measurement_unit: '',
    description: '',
    basic_index_value: '0.0000'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (indicator) {
      setFormData({
        code: indicator.code,
        name: indicator.name,
        target_value: indicator.target_value.toString(),
        weight_percentage: indicator.weight_percentage.toString(),
        measurement_unit: indicator.measurement_unit || '',
        description: indicator.description || '',
        basic_index_value: indicator.basic_index_value?.toString() || '0.0000'
      })
    } else {
      setFormData({
        code: '',
        name: '',
        target_value: '100.00',
        weight_percentage: '',
        measurement_unit: '',
        description: '',
        basic_index_value: '0.0000'
      })
    }
    setErrors({})
  }, [indicator, open])

  function getTotalWeightInfo(): { total: number; isValid: boolean; message: string } {
    const weight = parseFloat(formData.weight_percentage) || 0
    const others = existingIndicators.filter(i => i.id !== indicator?.id)
    const otherWeightsSum = others.reduce((sum, i) => sum + Number(i.weight_percentage), 0)
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

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Kode indikator wajib diisi'
    } else {
      // Check if code already exists (only for new indicators)
      if (!indicator) {
        const codeExists = existingIndicators.some(i => i.code === formData.code.trim())
        if (codeExists) {
          newErrors.code = 'Kode indikator sudah ada dalam kategori ini'
        }
      }
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nama indikator wajib diisi'
    }

    if (!formData.target_value) {
      newErrors.target_value = category?.configuration_style === 'activity'
        ? 'Target Volume wajib diisi'
        : 'Nilai target wajib diisi'
    } else {
      const target = parseFloat(formData.target_value)
      if (isNaN(target) || target <= 0) {
        newErrors.target_value = 'Nilai target harus lebih besar dari 0'
      }
    }

    if (!formData.weight_percentage) {
      newErrors.weight_percentage = category?.configuration_style === 'activity'
        ? 'Poin Indeks wajib diisi'
        : 'Persentase bobot wajib diisi'
    } else {
      const weight = parseFloat(formData.weight_percentage)
      if (isNaN(weight) || weight <= 0) {
        newErrors.weight_percentage = 'Bobot harus lebih besar dari 0'
      } else {
        // Check if total weight would exceed 100%
        const otherIndicators = existingIndicators.filter(i => i.id !== indicator?.id)
        const otherWeightsSum = otherIndicators.reduce((sum, i) => sum + Number(i.weight_percentage), 0)
        const totalWeight = otherWeightsSum + weight

        if (totalWeight > 100.01) { // Allow small floating point tolerance
          newErrors.weight_percentage = `Total bobot akan menjadi ${totalWeight.toFixed(2)}% (maksimal 100%)`
        }
      }
    }

    if (category?.configuration_style === 'activity') {
      if (!formData.basic_index_value) {
        newErrors.basic_index_value = 'Nilai Dasar Indeks wajib diisi'
      } else {
        const iv = parseFloat(formData.basic_index_value)
        if (isNaN(iv) || iv <= 0) {
          newErrors.basic_index_value = 'Nilai Dasar Indeks harus lebih besar dari 0'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return
    if (!category && !indicator) return

    setIsSubmitting(true)

    try {
      const data = {
        category_id: indicator?.category_id || category?.id,
        code: formData.code.trim(),
        name: formData.name.trim(),
        target_value: parseFloat(formData.target_value),
        weight_percentage: parseFloat(formData.weight_percentage),
        measurement_unit: formData.measurement_unit.trim() || null,
        description: formData.description.trim() || null,
        is_active: true,
        basic_index_value: category?.configuration_style === 'activity' ? parseFloat(formData.basic_index_value) : null
      }

      if (indicator) {
        // Update existing indicator
        const { error } = await supabase
          .from('m_kpi_indicators')
          .update(data)
          .eq('id', indicator.id)

        if (error) throw error

        // Trigger recalculation for current period
        // This would be handled by a separate calculation service
        console.log('Indicator updated, recalculation needed')
      } else {
        // Create new indicator
        const { error } = await supabase
          .from('m_kpi_indicators')
          .insert(data)

        if (error) throw error
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving indicator:', error)
      alert(error.message || 'Gagal menyimpan indikator')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{indicator ? 'Ubah Indikator' : 'Tambah Indikator'}</DialogTitle>
            <DialogDescription>
              {indicator ? 'Perbarui informasi indikator' : `Buat indikator baru untuk ${category?.category} - ${category?.category_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Indicator Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Kode Indikator *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="contoh: IND-001"
                disabled={!!indicator}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            {/* Indicator Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Indikator *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="contoh: Jumlah Pasien Rawat Jalan"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Target Value */}
            <div className="space-y-2">
              <Label htmlFor="target_value">
                {category?.configuration_style === 'activity' ? 'Target Volume *' : 'Nilai Target *'}
              </Label>
              <Input
                id="target_value"
                type="number"
                step="0.01"
                min="0"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                placeholder={category?.configuration_style === 'activity' ? "contoh: 1500" : "contoh: 100.00"}
              />
              {errors.target_value && (
                <p className="text-sm text-red-600">{errors.target_value}</p>
              )}
              <p className="text-xs text-gray-500">
                {category?.configuration_style === 'activity'
                  ? 'Target volume aktivitas bulanan untuk indikator ini'
                  : 'Nilai target default untuk indikator ini'}
              </p>
            </div>

            {/* Weight Percentage */}
            <div className="space-y-2">
              <Label htmlFor="weight_percentage">
                {category?.configuration_style === 'activity' ? 'Poin Indeks (%) *' : 'Persentase Bobot (%) *'}
              </Label>
              <Input
                id="weight_percentage"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={formData.weight_percentage}
                onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
                placeholder="contoh: 25.00"
              />
              {errors.weight_percentage && (
                <p className="text-sm text-red-600">{errors.weight_percentage}</p>
              )}
              {formData.weight_percentage && !errors.weight_percentage && (() => {
                const weightInfo = getTotalWeightInfo()
                return (
                  <p className={`text-xs font-medium ${weightInfo.isValid ? 'text-green-600' : 'text-amber-600'}`}>
                    {weightInfo.message}
                  </p>
                )
              })()}
              <p className="text-xs text-gray-500">
                Total semua bobot indikator dalam kategori ini harus sama dengan 100%. Bobot individual bisa kurang dari 100%.
              </p>
            </div>

            {/* Basic Index Value (Only for Activity Style) */}
            {category?.configuration_style === 'activity' && (
              <div className="space-y-2">
                <Label htmlFor="basic_index_value">Nilai Dasar Indeks *</Label>
                <Input
                  id="basic_index_value"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.basic_index_value}
                  onChange={(e) => setFormData({ ...formData, basic_index_value: e.target.value })}
                  placeholder="contoh: 0.1250"
                />
                {errors.basic_index_value && (
                  <p className="text-sm text-red-600">{errors.basic_index_value}</p>
                )}
                <p className="text-xs text-gray-500">
                  Nilai dasar (basic index) per satuan aktivitas. Gunakan desimal hingga 4 angka (contoh: 0.1250).
                </p>
              </div>
            )}

            {/* Measurement Unit */}
            <div className="space-y-2">
              <Label htmlFor="measurement_unit">Satuan Pengukuran</Label>
              <Input
                id="measurement_unit"
                value={formData.measurement_unit}
                onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
                placeholder="contoh: pasien, jam, persentase"
              />
            </div>

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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : indicator ? 'Perbarui' : 'Buat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}