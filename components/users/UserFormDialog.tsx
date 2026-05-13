'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { type UserWithPegawai } from '@/app/(authenticated)/users/actions'

interface UserFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  user?: UserWithPegawai | null
}

interface Pegawai {
  id: string
  employee_code: string
  full_name: string
  unit_id: string
}

interface Unit {
  id: string
  name: string
}

const roleLabels: Record<string, string> = {
  superadmin: 'Superadmin',
  unit_manager: 'Manajer Unit',
  employee: 'Pegawai'
}

export function UserFormDialog({ open, onClose, onSuccess, user }: UserFormDialogProps) {
  const [formData, setFormData] = useState({
    role: 'employee' as 'superadmin' | 'unit_manager' | 'employee',
    unit_id: '',
    password: '',
    employee_ids: [] as string[],
  })
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([])
  const [unitList, setUnitList] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState('')

  useEffect(() => {
    if (open) {
      loadPegawai()
      loadUnits()
      if (user) {
        setFormData({
          role: user.role,
          unit_id: user.pegawai?.unit_id || '',
          password: '',
          employee_ids: user.employee_id ? [user.employee_id] : [],
        })
      } else {
        setFormData({
          role: 'employee',
          unit_id: '',
          password: '',
          employee_ids: [],
        })
      }
      setError('')
      setTempPassword('')
    }
  }, [open, user])

  const loadPegawai = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('m_employees')
      .select('id, employee_code, full_name, unit_id')
      .eq('is_active', true)
      .is('user_id', null)
      .order('full_name')

    if (data) {
      setPegawaiList(data)
    }
  }

  const loadUnits = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('m_units')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (data) {
      setUnitList(data)
    }
  }

  const handleEmployeeToggle = (employeeId: string) => {
    setFormData(prev => {
      const isSelected = prev.employee_ids.includes(employeeId)
      if (isSelected) {
        return {
          ...prev,
          employee_ids: prev.employee_ids.filter(id => id !== employeeId)
        }
      } else {
        return {
          ...prev,
          employee_ids: [...prev.employee_ids, employeeId]
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!user) {
        // Create new user
        if (!formData.password) {
          setError('Password wajib diisi untuk pengguna baru')
          setLoading(false)
          return
        }

        if (formData.employee_ids.length === 0) {
          setError('Pilih minimal satu pegawai')
          setLoading(false)
          return
        }

        let successCount = 0
        let failedEmployees: string[] = []

        for (const employeeId of formData.employee_ids) {
          const employee = pegawaiList.find(p => p.id === employeeId)
          if (!employee) continue

          const email = `${employee.employee_code.toLowerCase()}@jaspel.local`

          const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: formData.password,
              role: formData.role,
              employee_id: employeeId,
            })
          })

          const result = await response.json()

          if (result.success) {
            successCount++
          } else {
            failedEmployees.push(employee.full_name)
          }
        }

        if (successCount > 0) {
          setTempPassword(formData.password)
          let message = `Berhasil membuat ${successCount} pengguna. Password: ${formData.password}`
          if (failedEmployees.length > 0) {
            message += `\n\nGagal membuat pengguna untuk: ${failedEmployees.join(', ')}`
          }
          alert(message)
          onSuccess()
        } else {
          setError('Gagal membuat pengguna')
        }
      } else {
        // Update existing user
        if (!formData.role) {
          setError('Peran wajib dipilih')
          setLoading(false)
          return
        }

        if (!formData.unit_id) {
          setError('Unit wajib dipilih')
          setLoading(false)
          return
        }

        const response = await fetch('/api/users/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            role: formData.role,
            unit_id: formData.unit_id,
            password: formData.password || undefined,
            employee_id: formData.employee_ids[0] || null,
          })
        })

        const result = await response.json()

        if (result.success) {
          alert('Pengguna berhasil diperbarui')
          onSuccess()
        } else {
          setError(result.error || 'Gagal memperbarui pengguna')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    }

    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {user ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {user && (
            <>
              <div>
                <Label>Nama</Label>
                <Input
                  value={user.pegawai?.full_name || '-'}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="role">Peran *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="superadmin">{roleLabels.superadmin}</option>
              <option value="unit_manager">{roleLabels.unit_manager}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Pilih peran untuk menentukan hak akses pengguna
            </p>
          </div>

          {user && (
            <div>
              <Label htmlFor="unit_id">Unit *</Label>
              <select
                id="unit_id"
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Pilih Unit --</option>
                {unitList.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pilih unit untuk pegawai ini
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="password">{user ? 'Reset Password' : 'Password *'}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              placeholder={user ? "Biarkan kosong jika tidak ingin mengubah" : "Minimal 6 karakter"}
            />
            <p className="text-xs text-gray-500 mt-1">
              {user
                ? 'Isi hanya jika ingin mengubah password pengguna'
                : 'Password ini akan digunakan untuk semua pegawai yang dipilih'}
            </p>
          </div>

          {!user && (
            <>
              <div>
                <Label htmlFor="employee_ids">Pilih Pegawai *</Label>
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                  {pegawaiList.length === 0 ? (
                    <p className="text-sm text-gray-500">Tidak ada pegawai tersedia</p>
                  ) : (
                    pegawaiList.map((pegawai) => {
                      const unit = unitList.find(u => u.id === pegawai.unit_id)
                      return (
                        <label
                          key={pegawai.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.employee_ids.includes(pegawai.id)}
                            onChange={() => handleEmployeeToggle(pegawai.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">
                            {pegawai.employee_code} - {pegawai.full_name}
                            {unit && <span className="text-gray-500"> ({unit.name})</span>}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pilih satu atau lebih pegawai dengan peran yang sama
                </p>
                {formData.employee_ids.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {formData.employee_ids.length} pegawai dipilih
                  </p>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {tempPassword && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              Password sementara: <strong>{tempPassword}</strong>
              <br />
              <small>Simpan password ini dan bagikan kepada pengguna.</small>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Menyimpan...' : user ? 'Perbarui' : 'Buat'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
