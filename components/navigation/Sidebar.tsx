'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { OptimizedLink } from '@/components/ui/optimized-link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Target,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  email: string
  role: 'superadmin' | 'unit_manager' | 'employee'
  full_name?: string
  unit_id?: string
}

interface MenuItem {
  id: string
  label: string
  path: string
  icon: string
}

interface SidebarInnerProps {
  isCollapsed: boolean
  setIsCollapsed: (c: boolean | ((c: boolean) => boolean)) => void
  isMobileOpen: boolean
  setIsMobileOpen: (o: boolean) => void
  companyInfo: any
  user: UserProfile | null
  unitName: string
  unreadCount: number
  showLogoutDialog: boolean
  setShowLogoutDialog: (s: boolean) => void
  handleLogout: () => Promise<void>
  isActive: (path: string) => boolean
  menuItems: MenuItem[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Target,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  Shield,
  User,
  Bell,
  ClipboardCheck,
}

const ALL_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
  { id: 'users', label: 'Manajemen Pengguna', path: '/users', icon: 'Users' },
  { id: 'pegawai', label: 'Data Pegawai', path: '/pegawai', icon: 'UserCheck' },
  { id: 'units', label: 'Unit Kerja', path: '/units', icon: 'Building2' },
  // { id: 'master-tarif', label: 'Master Tarif', path: '/master-tarif', icon: 'Banknote' }, // hidden
  { id: 'kpi-config', label: 'Konfigurasi KPI', path: '/kpi-config', icon: 'Target' },
  { id: 'pool', label: 'Pool Insentif', path: '/pool', icon: 'Wallet' },
  { id: 'assessment', label: 'Penilaian KPI', path: '/assessment', icon: 'ClipboardCheck' },
  { id: 'reports', label: 'Laporan', path: '/reports', icon: 'BarChart3' },
  { id: 'audit', label: 'Audit Trail', path: '/audit', icon: 'Shield' },
  { id: 'settings', label: 'Pengaturan', path: '/settings', icon: 'Settings' },
  { id: 'notifications', label: 'Notifikasi', path: '/notifications', icon: 'Bell' },
]

function getMenuItems(role: string): MenuItem[] {
  if (role === 'superadmin') return ALL_MENU_ITEMS
  if (role === 'unit_manager') {
    return ALL_MENU_ITEMS.filter(i =>
      i && ['dashboard', 'kpi-config', 'assessment', 'reports', 'notifications'].includes(i.id)
    )
  }
  return [] // Employees have no access as per requirement
}

// ── Auth Hook ────────────────────────────────────────────────────────────────

function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ; (async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const role = session.user.user_metadata?.role || 'employee'
          const { data: emp } = await supabase
            .from('m_employees')
            .select('full_name, unit_id')
            .eq('user_id', session.user.id)
            .maybeSingle()
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role,
            full_name: emp?.full_name || session.user.user_metadata?.full_name,
            unit_id: emp?.unit_id,
          })
        }
      } catch (e) {
        console.error('Sidebar auth error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { user, loading }
}

// ── Sidebar Component ─────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [unitName, setUnitName] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Persist collapsed state
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved) setIsCollapsed(JSON.parse(saved))
    } catch { }
  }, [])

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
        // Update CSS variable for layout
        document.documentElement.style.setProperty(
          '--sidebar-width',
          isCollapsed ? '80px' : '288px'
        )
      } catch { }
    }
  }, [isCollapsed, mounted])

  // Load sidebar data once user is ready — all in parallel for speed
  useEffect(() => {
    if (!user) return
      ; (async () => {
        try {
          const supabase = createClient()

          // Check localStorage cache for company info (valid 10 min)
          let companyInfoData = null
          try {
            const cached = localStorage.getItem('sidebar-company-info')
            if (cached) {
              const { value, ts } = JSON.parse(cached)
              if (Date.now() - ts < 10 * 60 * 1000) companyInfoData = value
            }
          } catch { }

          // Run all fetches in parallel
          const [settingsRes, unitRes, notifRes] = await Promise.all([
            companyInfoData ? Promise.resolve(null) : supabase.from('t_settings').select('value').eq('key', 'company_info').maybeSingle(),
            (user.role !== 'superadmin' && user.unit_id)
              ? supabase.from('m_units').select('name').eq('id', user.unit_id).single()
              : Promise.resolve(null),
            supabase.from('t_notification').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
          ])

          if (settingsRes?.data) {
            companyInfoData = settingsRes.data.value
            try { localStorage.setItem('sidebar-company-info', JSON.stringify({ value: companyInfoData, ts: Date.now() })) } catch { }
          }
          if (companyInfoData) setCompanyInfo(companyInfoData)
          if (unitRes?.data) setUnitName(unitRes.data.name || '')
          setUnreadCount(notifRes?.count || 0)
        } catch { }
      })()
  }, [user])

  const handleLogout = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (e) {
      console.error('Logout error:', e)
    }
  }, [])

  const isActive = useCallback(
    (path: string) => pathname === path || pathname.startsWith(path + '/'),
    [pathname]
  )

  const menuItems = user ? getMenuItems(user.role) : []

  // ── Skeleton (shown while loading or not mounted) ──────────────────────────
  const SkeletonContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="h-8 bg-blue-500/50 rounded animate-pulse" />
      </div>
      <div className="p-4 space-y-2 flex-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )

  // ── Sidebar Inner Component ───────────────────────────────────────────────
  const SidebarInner = ({
    isCollapsed,
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen,
    companyInfo,
    user,
    unitName,
    unreadCount,
    showLogoutDialog,
    setShowLogoutDialog,
    handleLogout,
    isActive,
    menuItems
  }: SidebarInnerProps) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-blue-700 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                {companyInfo?.logo
                  ? <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                  : <span className="text-blue-600 font-black text-base">P</span>
                }
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black text-white truncate leading-tight">
                  {companyInfo?.appName || 'PINTAR-JP'}
                </h1>
                <p className="text-xs text-blue-100 truncate">Sistem Insentif KPI</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors text-white flex-shrink-0 hidden lg:flex"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors text-white flex-shrink-0 lg:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && user && (
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow flex-shrink-0">
              {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {user.full_name || user.email}
              </div>
              {unitName && <div className="text-xs text-gray-500 truncate">{unitName}</div>}
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 inline-block',
                user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'unit_manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
              )}>
                {user.role === 'superadmin' ? 'Superadmin' :
                  user.role === 'unit_manager' ? 'Manager Unit' : 'Pegawai'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map(item => {
          if (!item) return null
          const Icon = iconMap[item.icon] || User
          const active = isActive(item.path)
          const isNotif = item.id === 'notifications'

          return (
            <OptimizedLink
              key={item.id}
              href={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                active
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                isCollapsed && 'justify-center'
              )}
            >
              <div className="relative flex-shrink-0">
                <Icon className={cn('h-5 w-5', active ? 'text-white' : 'text-gray-500 group-hover:text-blue-600')} />
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <span className={cn('text-sm font-semibold truncate', active ? 'text-white' : '')}>
                  {item.label}
                </span>
              )}
            </OptimizedLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        {showLogoutDialog ? (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-gray-700 font-semibold mb-3 text-center">Yakin ingin keluar?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 h-8 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-8 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutDialog(true)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors',
              isCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-semibold">Keluar</span>}
          </button>
        )}
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Mobile hamburger button (always visible on mobile) ── */}
      <button
        onClick={() => setIsMobileOpen(o => !o)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Mobile backdrop ── */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slides in from left) ── */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 shadow-xl z-[60] transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {!mounted || loading ? <SkeletonContent /> : (
          <SidebarInner
            isCollapsed={false} // Always expanded on mobile
            setIsCollapsed={() => { }}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
            companyInfo={companyInfo}
            user={user}
            unitName={unitName}
            unreadCount={unreadCount}
            showLogoutDialog={showLogoutDialog}
            setShowLogoutDialog={setShowLogoutDialog}
            handleLogout={handleLogout}
            isActive={isActive}
            menuItems={menuItems}
          />
        )}
      </aside>

      {/* ── Desktop sidebar (always visible, collapsible) ── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-sm z-[50] transition-all duration-300',
          mounted && isCollapsed ? 'w-20' : 'w-72'
        )}
      >
        {!mounted || loading ? <SkeletonContent /> : (
          <SidebarInner
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            isMobileOpen={false}
            setIsMobileOpen={() => { }}
            companyInfo={companyInfo}
            user={user}
            unitName={unitName}
            unreadCount={unreadCount}
            showLogoutDialog={showLogoutDialog}
            setShowLogoutDialog={setShowLogoutDialog}
            handleLogout={handleLogout}
            isActive={isActive}
            menuItems={menuItems}
          />
        )}
      </aside>
    </>
  )
}