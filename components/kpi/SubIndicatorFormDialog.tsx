'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createSubIndicator, updateSubIndicator } from '@/app/actions/sub-indicator-actions'
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Banknote, AlertCircle } from 'lucide-react'
import type { KPIIndicator, KPISubIndicator, ScoringCriterion } from '@/lib/types/kpi.types'

interface SubIndicatorFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subIndicator: KPISubIndicator | null
    indicator: KPIIndicator | null
    existingSubIndicators: KPISubIndicator[]
    onSuccess: () => void
    isMedicalUnit?: boolean
}


const SERVICE_TYPES = [
    'Garansi Fee',
    'Rawat Jalan',
    'Rawat Inap',
    'IBS',
    'Anestesi IBS',
    'Cathlab',
    'Patologi Klinik',
    'Patologi Anatomi',
    'Mikrobiologi Klinik',
    'Radiologi',
    'Farmasi',
    'Nutrisionis',
    'Keperawatan'
]

export default function SubIndicatorFormDialog({
    open,
    onOpenChange,
    subIndicator,
    indicator,
    existingSubIndicators,
    onSuccess,
    isMedicalUnit = false
}: SubIndicatorFormDialogProps) {
    const supabase = createClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        weight_percentage: '',
        target_value: '0',
        measurement_unit: '',
        scoring_criteria: [
            { score: 20, label: 'Sangat Kurang' },
            { score: 40, label: 'Kurang' },
            { score: 60, label: 'Cukup' },
            { score: 80, label: 'Baik' },
            { score: 100, label: 'Sangat Baik' }
        ] as ScoringCriterion[],
        measurement_type: 'scoring' as 'scoring' | 'quantitative',
        unit_tariff: '',
        base_index_value: '',
        service_types: [] as string[]
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [masterTariffs, setMasterTariffs] = useState<any[]>([])
    const [selectedMasterTariffId, setSelectedMasterTariffId] = useState<string>('')

    useEffect(() => {
        async function fetchMasterTariffs() {
            try {
                const { data, error } = await supabase
                    .from('m_master_tariffs')
                    .select('*')
                    .eq('is_active', true)
                    .order('name', { ascending: true })

                if (error) throw error
                setMasterTariffs(data || [])
            } catch (err) {
                console.error('Error fetching master tariffs:', err)
            }
        }

        if (open) {
            fetchMasterTariffs()
            setSelectedMasterTariffId('')
        }
    }, [open])

    useEffect(() => {
        if (subIndicator) {
            setFormData({
                name: subIndicator.name,
                description: subIndicator.description || '',
                weight_percentage: subIndicator.weight_percentage.toString(),
                target_value: subIndicator.target_value?.toString() || '0',
                measurement_unit: subIndicator.measurement_unit || '',
                scoring_criteria: subIndicator.scoring_criteria || [
                    { score: 20, label: 'Sangat Kurang' },
                    { score: 40, label: 'Kurang' },
                    { score: 60, label: 'Cukup' },
                    { score: 80, label: 'Baik' },
                    { score: 100, label: 'Sangat Baik' }
                ],
                measurement_type: (subIndicator.measurement_type as any) || 'scoring',
                unit_tariff: subIndicator.unit_tariff?.toString() || '',
                base_index_value: subIndicator.base_index_value?.toString() || '',
                service_types: subIndicator.service_types || []
            })
        } else {
            setFormData({
                name: '',
                description: '',
                weight_percentage: '',
                target_value: '0',
                measurement_unit: '',
                scoring_criteria: [
                    { score: 20, label: 'Sangat Kurang' },
                    { score: 40, label: 'Kurang' },
                    { score: 60, label: 'Cukup' },
                    { score: 80, label: 'Baik' },
                    { score: 100, label: 'Sangat Baik' }
                ],
                measurement_type: 'scoring',
                unit_tariff: '',
                base_index_value: '',
                service_types: []
            })
        }
        setErrors({})
    }, [subIndicator, open])

    function getTotalWeightInfo(): { total: number; isValid: boolean; message: string } {
        const weight = parseFloat(formData.weight_percentage) || 0
        const others = existingSubIndicators.filter(s => s.id !== subIndicator?.id)
        const otherWeightsSum = others.reduce((sum, s) => sum + Number(s.weight_percentage), 0)
        const totalWeight = otherWeightsSum + weight
        const isValid = Math.abs(totalWeight - 100) < 0.01

        return {
            total: totalWeight,
            isValid,
            message: isValid
                ? `Total bobot: ${totalWeight.toFixed(2)}% ✓`
                : `Total bobot: ${totalWeight.toFixed(2)}% (target 100%)`
        }
    }

    function addScoringCriterion() {
        const newCriteria = [...formData.scoring_criteria]
        const lastScore = newCriteria.length > 0 ? newCriteria[newCriteria.length - 1].score : 0
        newCriteria.push({
            score: lastScore + 20,
            label: `Kriteria ${newCriteria.length + 1}`
        })
        setFormData({ ...formData, scoring_criteria: newCriteria })
    }

    function removeScoringCriterion(index: number) {
        if (formData.scoring_criteria.length <= 1) return // Keep at least one criterion
        const newCriteria = formData.scoring_criteria.filter((_, i) => i !== index)
        setFormData({ ...formData, scoring_criteria: newCriteria })
    }

    function updateScoringCriterion(index: number, field: 'score' | 'label', value: string | number) {
        const newCriteria = [...formData.scoring_criteria]
        if (field === 'score') {
            newCriteria[index].score = typeof value === 'string' ? parseFloat(value) || 0 : value
        } else {
            newCriteria[index].label = value.toString()
        }
        setFormData({ ...formData, scoring_criteria: newCriteria })
    }

    function validateForm(): boolean {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Nama sub indikator wajib diisi'
        }

        if (!isMedicalUnit && !formData.weight_percentage) {
            newErrors.weight_percentage = 'Bobot wajib diisi'
        } else if (!isMedicalUnit) {
            const weight = parseFloat(formData.weight_percentage)
            if (isNaN(weight) || weight <= 0) {
                newErrors.weight_percentage = 'Bobot harus lebih besar dari 0'
            } else if (weight > 100) {
                newErrors.weight_percentage = 'Bobot tidak boleh lebih dari 100%'
            } else {
                // Validate total weight doesn't exceed 100%
                const others = existingSubIndicators.filter(s => s.id !== subIndicator?.id)
                const otherWeightsSum = others.reduce((sum, s) => sum + Number(s.weight_percentage), 0)
                const totalWeight = otherWeightsSum + weight

                if (totalWeight > 100.01) { // Allow small floating point tolerance
                    newErrors.weight_percentage = `Total bobot akan menjadi ${totalWeight.toFixed(2)}% (maksimal 100%)`
                }
            }
        }

        if (formData.target_value && isNaN(parseFloat(formData.target_value))) {
            newErrors.target_value = 'Nilai target harus berupa angka'
        }

        // Validate scoring criteria
        if (formData.scoring_criteria.length === 0) {
            newErrors.scoring_criteria = 'Minimal harus ada satu kriteria penilaian'
        } else {
            formData.scoring_criteria.forEach((criterion, index) => {
                if (isNaN(criterion.score) || criterion.score < 0) {
                    newErrors[`score_${index}`] = `Skor kriteria ${index + 1} harus berupa angka positif`
                }
                if (!criterion.label.trim()) {
                    newErrors[`label_${index}`] = `Label kriteria ${index + 1} wajib diisi`
                }
            })

            // Check for duplicate scores
            const scores = formData.scoring_criteria.map(c => c.score)
            const duplicateScores = scores.filter((score, index) => scores.indexOf(score) !== index)
            if (duplicateScores.length > 0) {
                newErrors.scoring_criteria = 'Skor kriteria tidak boleh sama'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!validateForm()) return
        if (!indicator && !subIndicator) return

        setIsSubmitting(true)

        try {
            const data = {
                indicator_id: subIndicator?.indicator_id || indicator?.id!,
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                weight_percentage: isMedicalUnit ? 0 : parseFloat(formData.weight_percentage),
                target_value: formData.target_value ? parseFloat(formData.target_value) : 0,
                measurement_unit: formData.measurement_unit.trim() || undefined,
                scoring_criteria: formData.scoring_criteria,
                measurement_type: formData.measurement_type,
                unit_tariff: formData.unit_tariff ? parseFloat(formData.unit_tariff) : undefined,
                base_index_value: formData.base_index_value ? parseFloat(formData.base_index_value) : undefined,
                service_types: formData.service_types
            }

            let result
            if (subIndicator) {
                // Update existing sub indicator
                result = await updateSubIndicator(subIndicator.id, data)
            } else {
                // Create new sub indicator
                result = await createSubIndicator(data)
            }

            if (result.success) {
                onSuccess()
                onOpenChange(false)
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error('Error saving sub indicator:', error)

            // Show user-friendly error message
            let errorMessage = 'Gagal menyimpan sub indikator'

            if (error.message) {
                errorMessage = error.message
            }

            alert(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{subIndicator ? 'Ubah Sub Indikator' : 'Tambah Sub Indikator'}</DialogTitle>
                        <DialogDescription>
                            {subIndicator
                                ? 'Perbarui informasi sub indikator'
                                : `Buat sub indikator baru untuk ${indicator?.name}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="sub_name">Nama Sub Indikator *</Label>
                            <Input
                                id="sub_name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="contoh: Ketepatan Waktu Pelayanan"
                            />
                            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                        </div>

                        {!isMedicalUnit && (
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sub_weight">Bobot (%) *</Label>
                                    <Input
                                        id="sub_weight"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max="100"
                                        value={formData.weight_percentage}
                                        onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
                                        placeholder="25.00"
                                    />
                                    {errors.weight_percentage && <p className="text-sm text-red-600">{errors.weight_percentage}</p>}
                                    {formData.weight_percentage && !errors.weight_percentage && (() => {
                                        const weightInfo = getTotalWeightInfo()
                                        return (
                                            <p className={`text-xs font-medium ${weightInfo.isValid ? 'text-green-600' : 'text-amber-600'}`}>
                                                {weightInfo.message}
                                            </p>
                                        )
                                    })()}
                                    <p className="text-xs text-gray-500">
                                        Total semua bobot sub indikator dalam indikator ini harus sama dengan 100%. Bobot individual dapat diisi kurang dari 100%.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="sub_unit">Satuan</Label>
                            <Input
                                id="sub_unit"
                                value={formData.measurement_unit}
                                onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
                                placeholder="%, pasien, jam"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sub_description">Deskripsi</Label>
                            <Textarea
                                id="sub_description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Deskripsi opsional"
                                rows={3}
                            />
                        </div>

                    </div>

                    {/* Measurement Type Selection */}
                    <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="measurement_type">Kriteria Pengukuran *</Label>
                            <select
                                id="measurement_type"
                                value={formData.measurement_type}
                                onChange={(e) => setFormData({ ...formData, measurement_type: e.target.value as 'scoring' | 'quantitative' })}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="scoring">Pemberian Skor (seperti biasa)</option>
                                <option value="quantitative">Nilai Kuantitatif (Volume × Tarif/Indeks)</option>
                            </select>
                        </div>

                        {formData.measurement_type === 'quantitative' && (
                            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-bold flex items-center gap-2">
                                            Jenis Layanan *
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                                if (formData.service_types.length === SERVICE_TYPES.length) {
                                                    setFormData({ ...formData, service_types: [] })
                                                } else {
                                                    setFormData({ ...formData, service_types: [...SERVICE_TYPES] })
                                                }
                                            }}
                                        >
                                            {formData.service_types.length === SERVICE_TYPES.length ? 'Batal Semua' : 'Pilih Semua'}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded border">
                                        {SERVICE_TYPES.map((type) => (
                                            <div key={type} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`st-${type}`}
                                                    checked={formData.service_types.includes(type)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        const newTypes = checked
                                                            ? [...formData.service_types, type]
                                                            : formData.service_types.filter(t => t !== type)
                                                        setFormData({ ...formData, service_types: newTypes })
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                                />
                                                <label htmlFor={`st-${type}`} className="text-xs text-gray-700 cursor-pointer">
                                                    {type}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 italic">
                                        Pilih layanan yang akan diintegrasikan dengan sub indikator ini. Pengisian volume dilakukan di penilaian.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Kriteria Pengukuran - Dynamic (Only show if scoring) */}
                    {formData.measurement_type === 'scoring' && (
                        <div className="space-y-4">
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base font-semibold">Kriteria Pengukuran Nilai/Skor</Label>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Tentukan kriteria penilaian untuk setiap level skor. Anda dapat menambah atau mengurangi kriteria sesuai kebutuhan.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addScoringCriterion}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Tambah Kriteria
                                    </Button>
                                </div>
                                {errors.scoring_criteria && <p className="text-sm text-red-600 mt-2">{errors.scoring_criteria}</p>}
                            </div>

                            <div className="space-y-3">
                                {formData.scoring_criteria.map((criterion, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                                        <div className="col-span-2 space-y-1">
                                            <Label htmlFor={`score_${index}`} className="text-sm">
                                                Skor {index + 1}
                                            </Label>
                                            <Input
                                                id={`score_${index}`}
                                                type="number"
                                                step="0.01"
                                                value={criterion.score}
                                                onChange={(e) => updateScoringCriterion(index, 'score', e.target.value)}
                                                placeholder="0"
                                            />
                                            {errors[`score_${index}`] && (
                                                <p className="text-xs text-red-600">{errors[`score_${index}`]}</p>
                                            )}
                                        </div>
                                        <div className="col-span-8 space-y-1">
                                            <Label htmlFor={`label_${index}`} className="text-sm">
                                                Label/Kriteria
                                            </Label>
                                            <Input
                                                id={`label_${index}`}
                                                value={criterion.label}
                                                onChange={(e) => updateScoringCriterion(index, 'label', e.target.value)}
                                                placeholder="Deskripsi kriteria"
                                            />
                                            {errors[`label_${index}`] && (
                                                <p className="text-xs text-red-600">{errors[`label_${index}`]}</p>
                                            )}
                                        </div>
                                        <div className="col-span-2 flex items-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeScoringCriterion(index)}
                                                disabled={formData.scoring_criteria.length <= 1}
                                                className="w-full"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 p-3 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Petunjuk:</strong> Skor menunjukkan nilai yang akan diberikan untuk setiap level pencapaian.
                                    Label/Kriteria menjelaskan kondisi atau pencapaian yang diperlukan untuk mendapat skor tersebut.
                                    Anda dapat menambah kriteria sebanyak yang diperlukan dengan mengklik tombol "Tambah Kriteria".
                                </p>
                            </div>
                        </div>
                    )}
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
                            {isSubmitting ? 'Menyimpan...' : subIndicator ? 'Perbarui' : 'Buat'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    )
}
