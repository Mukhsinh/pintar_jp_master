'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RefreshCw, MessageCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import Image from 'next/image'

function getErrorMessage(code: string | null): string | null {
  if (!code) return null
  const msgs: Record<string, string> = {
    session_expired: 'Sesi Anda telah berakhir, silakan masuk kembali',
    inactive: 'Akun Anda tidak aktif, hubungi administrator',
    user_not_found: 'Data pengguna tidak ditemukan',
    unexpected: 'Terjadi kesalahan, silakan coba lagi',
  }
  return msgs[code] || 'Terjadi kesalahan, silakan coba lagi'
}

export default function LoginPage() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [showClear, setShowClear]       = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('error')
    if (code) setError(getErrorMessage(code))
    clearOldSession()
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearOldSession = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      ;['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'].forEach(n => {
        document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      })
    } catch { /* ignore */ }
  }

  const handleClearStorage = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(';').forEach(c => {
        document.cookie = `${c.split('=')[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      })
      window.location.reload()
    } catch { /* ignore */ }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (authErr)    { setError(authErr.message || 'Email atau kata sandi salah'); setShowClear(true); setIsLoading(false); return }
      if (!auth.user) { setError('Gagal membuat sesi, silakan coba lagi'); setIsLoading(false); return }
      try { await fetch('/api/users/sync-role', { method: 'POST' }) } catch { /* ignore */ }
      window.location.href = '/dashboard'
    } catch {
      setError('Terjadi kesalahan sistem, silakan coba lagi')
      setShowClear(true)
      setIsLoading(false)
    }
  }

  const waUrl = `https://wa.me/6285726112001?text=${encodeURIComponent('Halo, saya memerlukan bantuan untuk mengakses aplikasi JASPEL. Mohon bantuannya.')}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-4 py-10 font-sans">

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo & Nama Rumah Sakit */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center mb-4 overflow-hidden">
            <Image
              src="/Logo rsud goeteng.jpeg"
              alt="Logo RSUD Goeteng"
              width={88}
              height={88}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center leading-tight">
            RSUD GOETENG
          </h1>
          <p className="text-xs text-slate-400 font-semibold tracking-widest uppercase mt-1">
            Taroenadibrata Purbalingga
          </p>
          <div className="w-12 h-[2px] bg-blue-200 rounded-full mt-3" />
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.07)] border border-slate-100 p-8">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 text-center">
            Masuk ke Sistem
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</Label>
              <div className="relative group">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-0 rounded-xl pl-10 text-sm font-medium text-slate-800 shadow-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kata Sandi</Label>
              <div className="relative group">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-0 rounded-xl pl-10 pr-11 text-sm font-medium text-slate-800 shadow-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm border-0 mt-1"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Masuk'}
            </Button>

            {showClear && (
              <button
                type="button"
                onClick={handleClearStorage}
                className="w-full text-[11px] font-bold text-slate-300 hover:text-red-400 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={10} /> Reset Sesi &amp; Muat Ulang
              </button>
            )}
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-all border border-emerald-100"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Hubungi Bantuan Admin
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-600 font-medium mt-6 leading-relaxed">
          APLIKASI PINTAR-JP &copy;2026. Mukhsin Hadi. All Right Reserved
        </p>
      </div>
    </div>
  )
}
