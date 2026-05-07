'use client'

import { useState, useEffect } from 'react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Save, AlertCircle } from 'lucide-react'

interface Tariff {
    id: string
    code: string
    name: string
    service_type?: string
    amount: number
    type: 'index' | 'activity'
    is_active: boolean
}

interface TariffFormDialogProps {
    tariff: Tariff | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TariffFormDialog({ tariff, open, onOpenChange }: TariffFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        service_type: '',
        amount: 0,
        type: 'index' as 'index' | 'activity',
        is_active: true
    })

    useEffect(() => {
        if (tariff) {
            setFormData({
                code: tariff.code,
                name: tariff.name,
                service_type: tariff.service_type || '',
                amount: tariff.amount,
                type: tariff.type,
                is_active: tariff.is_active
            })
        } else {
            setFormData({
                code: '',
                name: '',
                service_type: '',
                amount: 0,
                type: 'index',
                is_active: true
            })
        }
        setError(null)
    }, [tariff, open])

    const handleSave = async () => {
        if (!formData.code || !formData.name || !formData.service_type) {
            setError('Kode, Nama, dan Jenis Layanan wajib diisi')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const payload = {
                ...formData,
                updated_at: new Date().toISOString()
            }

            if (tariff) {
                const { error: updateError } = await supabase
                    .from('m_master_tariffs')
                    .update(payload)
                    .eq('id', tariff.id)

                if (updateError) throw updateError
            } else {
                const { error: insertError } = await supabase
                    .from('m_master_tariffs')
                    .insert([payload])

                if (insertError) throw insertError
            }

            onOpenChange(false)
            window.location.reload()
        } catch (err: any) {
            console.error('Error saving tariff:', err)
            setError(err.message || 'Terjadi kesalahan saat menyimpan data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{tariff ? 'Edit Master Tarif' : 'Tambah Master Tarif'}</DialogTitle>
                    <DialogDescription>
                        Atur nilai dasar indeks atau tarif aktivitas yang akan digunakan pada konfigurasi KPI.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Kode</Label>
                        <Input
                            id="code"
                            placeholder="e.g. TRF-001"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="service_type" className="text-right whitespace-nowrap">Jenis Layanan</Label>
                        <Select
                            value={formData.service_type}
                            onValueChange={(val) => setFormData({ ...formData, service_type: val })}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Pilih jenis layanan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                                <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
                                <SelectItem value="IBS">IBS</SelectItem>
                                <SelectItem value="Anestesi IBS">Anestesi IBS</SelectItem>
                                <SelectItem value="Cathlab">Cathlab</SelectItem>
                                <SelectItem value="Patologi Klinik">Patologi Klinik</SelectItem>
                                <SelectItem value="Patologi Anatomi">Patologi Anatomi</SelectItem>
                                <SelectItem value="Mikrobiologi Klinik">Mikrobiologi Klinik</SelectItem>
                                <SelectItem value="Radiologi">Radiologi</SelectItem>
                                <SelectItem value="Farmasi">Farmasi</SelectItem>
                                <SelectItem value="Nutrisionis">Nutrisionis</SelectItem>
                                <SelectItem value="Keperawatan">Keperawatan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right text-gray-700">Nama</Label>
                        <Input
                            id="name"
                            placeholder="Nama tarif atau aktivitas"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Tipe</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="index">Berbasis Indeks (Poin)</SelectItem>
                                <SelectItem value="activity">Berbasis Aktivitas (Rupiah)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            {formData.type === 'activity' ? 'Tarif (Rp)' : 'Nilai Indeks'}
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            step={formData.type === 'activity' ? '1' : '0.01'}
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            className="col-span-3"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Batal
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Menyimpan...' : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Simpan Data
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
