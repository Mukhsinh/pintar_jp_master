'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUsers, type UserWithPegawai } from './actions'
import { Plus, Search, RefreshCw, Users as UsersIcon, Filter, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import { UserTable } from '@/components/users/UserTable'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { cn } from '@/lib/utils'

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

  const pageSize = 15 // Smaller page size for better performance and UI fit
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
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus pengguna ${userName}?\n\nTindakan ini akan menghapus akun jaspel pengguna.\n\nTindakan ini TIDAK DAPAT DIBATALKAN!`)) {
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

  const handleDownloadReport = (format: 'excel' | 'pdf') => {
    window.open(`/api/users/export?format=${format}`, '_blank')
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">

      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1.25rem] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <UsersIcon className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight leading-none">Otoritas Pengguna</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Manajemen Akses &amp; Role Sistem</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button
            variant="outline"
            onClick={loadUsers}
            disabled={loading}
            className="h-9 px-4 rounded-xl text-sm font-medium text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all flex-1 lg:flex-none"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Muat Ulang
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="h-9 px-4 premium-gradient text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex-1 lg:flex-none text-[11px]"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-all font-black" />
          <Input
            placeholder="Cari Nama, NIP, atau Email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-14 pl-12 bg-white/70 backdrop-blur-md border-slate-200 rounded-[1.25rem] text-sm font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300 transition-all"
          />
        </div>
        <div className="md:col-span-4">
          <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setCurrentPage(1); }}>
            <SelectTrigger className="h-14 bg-white/70 backdrop-blur-md border-slate-200 rounded-[1.25rem] text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm focus:ring-4 focus:ring-blue-100 px-6 px-12">
              <div className="flex items-center gap-3">
                <Filter size={16} className="text-slate-300 shrink-0" />
                <SelectValue placeholder="Semua Peran" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 p-2 shadow-2xl">
              <SelectItem value="all" className="rounded-xl font-bold text-xs uppercase tracking-widest py-3">Semua Pegawai</SelectItem>
              <SelectItem value="superadmin" className="rounded-xl font-bold text-xs uppercase tracking-widest py-3">Superadmin</SelectItem>
              <SelectItem value="unit_manager" className="rounded-xl font-bold text-xs uppercase tracking-widest py-3">Manajer Unit</SelectItem>
              <SelectItem value="employee" className="rounded-xl font-bold text-xs uppercase tracking-widest py-3">Pegawai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <UserTable
          users={users}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadUsers}
        />

        {/* Premium Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Menampilkan {users.length} dari {totalCount} Pengguna
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1
                  // Show limited pages if many
                  if (totalPages > 5 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                    if (Math.abs(page - currentPage) === 3) return <span key={page} className="px-1 text-slate-300">...</span>
                    return null
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'ghost'}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-10 w-10 p-0 rounded-xl font-black text-xs transition-all",
                        currentPage === page
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "text-slate-400 hover:bg-white hover:shadow-md"
                      )}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserFormDialog
        open={showCreateDialog}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
        user={selectedUser}
      />
    </div>
  )
}
