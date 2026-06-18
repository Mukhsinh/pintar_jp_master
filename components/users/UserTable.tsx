'use client'

import { useState } from 'react'
import { type UserWithPegawai } from '@/app/(authenticated)/users/actions'
import { deactivateUser } from '@/lib/services/user-management.service'
import { Button } from '@/components/ui/button'
import { Edit, Ban, CheckCircle, Trash2, User, ShieldCheck, Mail, Briefcase, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserTableProps {
  users: UserWithPegawai[]
  loading: boolean
  onEdit: (user: UserWithPegawai) => void
  onDelete: (user: UserWithPegawai) => void
  onRefresh: () => void
}

const roleStyles: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  superadmin: {
    label: 'Superadmin',
    bg: 'bg-indigo-50 border-indigo-100/50',
    text: 'text-indigo-600',
    icon: ShieldCheck
  },
  unit_manager: {
    label: 'Manajer Unit',
    bg: 'bg-blue-50 border-blue-100/50',
    text: 'text-blue-600',
    icon: Briefcase
  },
  employee: {
    label: 'Pegawai',
    bg: 'bg-slate-50 border-slate-100/50',
    text: 'text-slate-600',
    icon: User
  }
}

export function UserTable({ users, loading, onEdit, onDelete, onRefresh }: UserTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleDeactivate = async (user: UserWithPegawai) => {
    const userName = user.pegawai?.full_name || user.email
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan ${userName}?`)) {
      return
    }

    setActionLoading(user.id)
    const result = await deactivateUser(user.id)
    setActionLoading(null)

    if (result.success) {
      onRefresh()
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <User className="h-8 w-8 text-slate-200" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Tidak Ada Pengguna</h3>
        <p className="text-sm font-medium text-slate-400 mt-1 max-w-xs mx-auto">
          Coba sesuaikan filter atau gunakan tombol "Tambah Pengguna" untuk memulai.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm relative">
      {loading && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer" />
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="text-left p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Identitas Pegawai</th>
              <th className="text-left p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Akses &amp; Kontak</th>
              <th className="text-left p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Peran</th>
              <th className="text-left p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-right p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Opsi Manajemen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => {
              const style = roleStyles[user.role] || roleStyles.employee
              const RoleIcon = style.icon

              return (
                <tr
                  key={user.id}
                  className="group hover:bg-blue-50/30 transition-all duration-300"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 duration-500",
                        style.bg
                      )}>
                        <RoleIcon className={cn("h-6 w-6", style.text)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-slate-800 tracking-tight truncate">
                          {user.pegawai?.full_name || 'Tidak Terhubung'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                            {user.pegawai?.employee_code || '---'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 tracking-tight truncate max-w-[150px]">
                            {user.unit?.name || 'Unit Belum Diset'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={12} className="text-slate-300" />
                        <span className="text-sm font-bold tracking-tight">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Dibuat: {new Date(user.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className={cn(
                      "inline-flex items-center px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-widest gap-2 shadow-sm",
                      style.bg, style.text
                    )}>
                      <RoleIcon size={14} />
                      {style.label}
                    </div>
                  </td>
                  <td className="p-6">
                    {user.is_active ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100/50 text-emerald-600 font-black text-[10px] uppercase tracking-widest shadow-sm w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        Aktif
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100/50 text-rose-500 font-black text-[10px] uppercase tracking-widest shadow-sm w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Nonaktif
                      </div>
                    )}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(user)}
                        className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all text-slate-400 hover:text-blue-600"
                        title="Edit Akses"
                      >
                        <Edit className="h-5 w-5" />
                      </Button>

                      {user.is_active && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeactivate(user)}
                          disabled={actionLoading === user.id}
                          className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all text-slate-400 hover:text-amber-600"
                          title="Nonaktifkan"
                        >
                          <Ban className="h-5 w-5" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(user)}
                        disabled={actionLoading === user.id}
                        className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:shadow-md transition-all text-slate-300 hover:text-rose-600"
                        title="Hapus Permanen"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
