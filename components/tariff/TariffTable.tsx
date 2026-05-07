'use client'

import { useState, memo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Power, PowerOff, Plus, Download, Upload, FileSpreadsheet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TariffFormDialog } from './TariffFormDialog'
import { cn } from '@/lib/utils'

interface Tariff {
    id: string
    code: string
    name: string
    service_type?: string
    amount: number
    type: 'index' | 'activity'
    is_active: boolean
}

interface TariffTableProps {
    tariffs: Tariff[]
}

export const TariffTable = memo(function TariffTable({ tariffs }: TariffTableProps) {
    const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)

    const handleAdd = () => {
        setSelectedTariff(null)
        setIsFormOpen(true)
    }

    const handleEdit = (tariff: Tariff) => {
        setSelectedTariff(tariff)
        setIsFormOpen(true)
    }

    const handleToggleActive = async (tariff: Tariff) => {
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('m_master_tariffs')
                .update({
                    is_active: !tariff.is_active,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', tariff.id)

            if (error) throw error
            window.location.reload()
        } catch (err) {
            console.error('Error toggling tariff status:', err)
        }
    }

    const handleDownloadTemplate = () => {
        window.open('/api/master-tarif/template', '_blank')
    }

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/master-tarif/import', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (response.ok) {
                alert(`Import berhasil!\nBerhasil: ${result.success}\nGagal: ${result.failed}${result.errors.length > 0 ? '\n\nError:\n' + result.errors.join('\n') : ''}`)
                window.location.reload()
            } else {
                alert(`Import gagal: ${result.error}`)
            }
        } catch (error) {
            console.error('Import error:', error)
            alert('Terjadi kesalahan saat import')
        }

        // Reset input
        event.target.value = ''
    }

    const handleDownloadReport = (format: 'excel' | 'pdf') => {
        // Optional: implement export for tariffs
        window.open(`/api/master-tarif/export?format=${format}`, '_blank')
    }

    const handleDelete = async (tariff: Tariff) => {
        if (!confirm(`Yakin ingin menghapus tarif ${tariff.name}?`)) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('m_master_tariffs')
                .delete()
                .eq('id', tariff.id)

            if (error) throw error
            window.location.reload()
        } catch (err) {
            console.error('Error deleting tariff:', err)
            alert('Gagal menghapus tarif. Mungkin masih digunakan.')
        }
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    <Button
                        onClick={handleDownloadTemplate}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Unduh Template
                    </Button>

                    <Button
                        onClick={() => document.getElementById('import-tariffs')?.click()}
                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm border-none"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Import Data
                    </Button>
                    <input
                        id="import-tariffs"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImport}
                        className="hidden"
                    />
                </div>

                <Button
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md border-none transition-all active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Tarif
                </Button>
            </div>

            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[120px]">Kode</TableHead>
                            <TableHead className="w-[150px]">Jenis Layanan</TableHead>
                            <TableHead>Nama Tarif / Aktivitas</TableHead>
                            <TableHead className="w-[150px]">Tipe</TableHead>
                            <TableHead className="w-[150px] text-right">Nilai / Tarif</TableHead>
                            <TableHead className="w-[120px] text-center">Status</TableHead>
                            <TableHead className="w-[120px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tariffs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                    Tidak ada data tarif ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            tariffs.map((tariff) => (
                                <TableRow key={tariff.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="font-mono text-xs font-bold text-gray-600">{tariff.code}</TableCell>
                                    <TableCell>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                            {tariff.service_type || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">{tariff.name}</TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            tariff.type === 'activity'
                                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                                : "bg-blue-100 text-blue-700 border border-blue-200"
                                        )}>
                                            {tariff.type === 'activity' ? 'Berbasis Aktivitas' : 'Berbasis Indeks'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {tariff.type === 'activity'
                                            ? `Rp ${tariff.amount.toLocaleString('id-ID')}`
                                            : tariff.amount.toFixed(2)
                                        }
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                                            tariff.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {tariff.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(tariff)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className={cn("h-8 w-8", tariff.is_active ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50")} onClick={() => handleToggleActive(tariff)}>
                                                {tariff.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(tariff)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <TariffFormDialog
                tariff={selectedTariff}
                open={isFormOpen}
                onOpenChange={(open: boolean) => {
                    setIsFormOpen(open)
                    if (!open) setSelectedTariff(null)
                }}
            />
        </>
    )
})
