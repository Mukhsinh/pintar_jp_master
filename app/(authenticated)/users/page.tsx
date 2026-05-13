'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUsers, type UserWithPegawai } from './actions'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { UserTable } from '@/components/users/UserTable'
import { UserFormDialog } from '@/components/users/UserFormDialog'

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithPegawai[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithPegawai | null>(null)

  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const result = await getUsers(currentPage, pageSize, debouncedSearchTerm, roleFilter)
    if (!result.error) {
      setUsers(result.data)
      setTotalCount(result.count)
    } else {
      console.error('Gagal memuat pengguna:', result.error)
    }
    setLoading(false)
  }, [currentPage, pageSize, debouncedSearchTerm, roleFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page on search
  }, [])

  const handleEdit = useCallback((user: UserWithPegawai) => {
    setSelectedUser(user)
    setShowCreateDialog(true)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setShowCreateDialog(false)
    setSelectedUser(null)
  }, [])

  const handleSuccess = useCallback(() => {
    loadUsers()
    handleCloseDialog()
  }, [loadUsers, handleCloseDialog])

  const handleDelete = useCallback(async (user: UserWithPegawai) => {
    const userName = user.pegawai?.full_name || user.email
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus pengguna ${userName}?\n\nTindakan ini akan menghapus:\n- Akun pengguna\n- Data pegawai terkait\n- Semua data KPI dan realisasi\n\nTindakan ini TIDAK DAPAT DIBATALKAN!`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const result = await response.json()

      if (result.success) {
        alert('Pengguna berhasil dihapus')
        loadUsers()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
    setLoading(false)
  }, [loadUsers])

  const handleDownloadTemplate = () => {
    window.open('/api/users/template', '_blank')
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/users/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Import berhasil!\nBerhasil: ${result.success}\nGagal: ${result.failed}${result.errors.length > 0 ? '\n\nError:\n' + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n... dan lainnya' : '') : ''}`)
        loadUsers()
      } else {
        alert(`Import gagal: ${result.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Terjadi kesalahan saat import')
    }

    event.target.value = ''
  }

  const handleDownloadReport = (format: 'excel' | 'pdf') => {
    window.open(`/api/users/export?format=${format}`, '_blank')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
          <p className="text-gray-500">Kelola pengguna sistem dan peran mereka</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Tambah Pengguna
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>
            Total: {totalCount} pengguna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama, email, unit, atau peran..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-10 shadow-sm"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 shadow-sm">
                  <SelectValue placeholder="Semua Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Seluruh Pegawai</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="unit_manager">Manajer Unit</SelectItem>
                  <SelectItem value="employee">Pegawai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <UserTable
            users={users}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={loadUsers}
          />

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              <span className="flex items-center px-4">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={showCreateDialog}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
        user={selectedUser}
      />
    </div>
  )
}
