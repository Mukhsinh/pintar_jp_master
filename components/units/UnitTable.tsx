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
import { Edit, Trash2, Power, PowerOff, Plus, Download, Upload, FileSpreadsheet, FileText } from 'lucide-react'
import { UnitFormDialog } from './UnitFormDialog'
import { DeleteUnitDialog } from './DeleteUnitDialog'
import { createClient } from '@/lib/supabase/client'

interface Unit {
  id: string
  code: string
  name: string
  proportion_percentage: number
  is_active: boolean
  employees?: { count: number }[]
}

interface UnitTableProps {
  units: Unit[]
}

export const UnitTable = memo(function UnitTable({ units }: UnitTableProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const handleAdd = () => {
    setSelectedUnit(null)
    setIsFormOpen(true)
  }

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit)
    setIsFormOpen(true)
  }

  const handleDelete = (unit: Unit) => {
    setSelectedUnit(unit)
    setIsDeleteOpen(true)
  }

  const handleToggleActive = async (unit: Unit) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('m_units')
        .update({
          is_active: !unit.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', unit.id)

      if (error) throw error

      // Refresh the page to show updated data
      window.location.reload()
    } catch (err) {
      console.error('Error toggling unit status:', err)
    }
  }

  const getEmployeeCount = (unit: Unit) => {
    return unit.employees?.[0]?.count || 0
  }

  const handleDownloadTemplate = () => {
    window.open('/api/units/template', '_blank')
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/units/import', {
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
    window.open(`/api/units/export?format=${format}`, '_blank')
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={handleDownloadTemplate}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Template
          </Button>

          <Button
            onClick={() => document.getElementById('import-units')?.click()}
            className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleDownloadReport('excel')}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-9"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-green-600" />
              Excel
            </Button>

            <Button
              onClick={() => handleDownloadReport('pdf')}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-9"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5 text-red-600" />
              PDF
            </Button>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Unit
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-[100px]">Kode</TableHead>
              <TableHead>Nama Unit</TableHead>
              <TableHead className="hidden md:table-cell">Proporsi</TableHead>
              <TableHead className="hidden sm:table-cell">Pegawai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  Tidak ada unit ditemukan
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.code}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{unit.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{unit.proportion_percentage.toFixed(2)}%</TableCell>
                  <TableCell className="hidden sm:table-cell">{getEmployeeCount(unit)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${unit.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {unit.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => handleEdit(unit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${unit.is_active ? 'text-amber-600' : 'text-emerald-600'}`}
                        onClick={() => handleToggleActive(unit)}
                      >
                        {unit.is_active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => handleDelete(unit)}
                        disabled={getEmployeeCount(unit) > 0}
                      >
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

      <UnitFormDialog
        unit={selectedUnit}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <DeleteUnitDialog
        unit={selectedUnit}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  )
})
