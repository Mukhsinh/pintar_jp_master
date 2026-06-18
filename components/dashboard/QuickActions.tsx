'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Upload, Download, FileText, Settings, Users } from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  title: string
  description: string
  icon: any
  href: string
  variant?: 'default' | 'outline' | 'secondary'
}

interface QuickActionsProps {
  role: 'superadmin' | 'unit_manager' | 'employee'
}

export function QuickActions({ role }: QuickActionsProps) {
  const getActions = (): QuickAction[] => {
    switch (role) {
      case 'superadmin':
        return [
          { title: 'Tambah Unit', description: 'Buat unit baru', icon: Plus, href: '/units' },
          { title: 'Tambah Pengguna', description: 'Daftarkan pengguna', icon: Users, href: '/users' },
          { title: 'Buat Pool', description: 'Pool insentif baru', icon: Plus, href: '/pool' },
          { title: 'Import Data', description: 'Upload data bulk', icon: Upload, href: '/import' },
          { title: 'Export Laporan', description: 'Unduh laporan', icon: Download, href: '/reports' },
          { title: 'Konfigurasi', description: 'Atur sistem', icon: Settings, href: '/settings' },
        ]
      case 'unit_manager':
        return [
          { title: 'Input Realisasi', description: 'Input data KPI', icon: Plus, href: '/realization' },
          { title: 'Import Realisasi', description: 'Upload data Excel', icon: Upload, href: '/import' },
          { title: 'Lihat Laporan', description: 'Laporan unit', icon: FileText, href: '/reports' },
        ]
      case 'employee':
        return [
          { title: 'Lihat Slip', description: 'Slip insentif', icon: FileText, href: '/reports' },
          { title: 'Download PDF', description: 'Unduh slip PDF', icon: Download, href: '/reports' },
        ]
      default:
        return []
    }
  }

  const actions = getActions()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aksi Cepat</CardTitle>
        <CardDescription>Akses fitur yang sering digunakan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.title} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto flex flex-col items-center gap-2 p-4 hover:bg-blue-50 hover:border-blue-300"
                >
                  <Icon className="h-6 w-6 text-blue-600" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-gray-500">{action.description}</div>
                  </div>
                </Button>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
