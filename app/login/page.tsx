'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, Mail, Lock, MessageCircle } from 'lucide-react'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsMounted(true)
    const code = searchParams.get('error')
    if (code) setError(getErrorMessage(code))
    clearOldSession()
  }, [searchParams])

  const clearOldSession = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
        ;['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'].forEach(n => {
          document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        })
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

      if (authErr) {
        setError(authErr.message || 'Email atau kata sandi salah')
        setIsLoading(false)
        return
      }

      if (!auth.user || !auth.session) {
        setError('Gagal membuat sesi, silakan coba lagi')
        setIsLoading(false)
        return
      }

      try {
        await fetch('/api/users/sync-role', { method: 'POST' })
      } catch (syncErr) {
        console.error('[LOGIN] Sync role failed:', syncErr)
      }

      await new Promise(resolve => setTimeout(resolve, 800))
      window.location.replace('/dashboard')
    } catch (err: any) {
      console.error('[LOGIN] Unexpected error:', err)
      setError('Terjadi kesalahan sistem: ' + (err.message || 'Silakan coba lagi'))
      setIsLoading(false)
    }
  }

  const waUrl = `https://wa.me/6285726112001?text=${encodeURIComponent('Halo, saya memerlukan bantuan untuk mengakses aplikasi JASPEL. Mohon bantuannya.')}`

  if (!isMounted) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 p-6 font-sans">

      {/* Header Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden mb-4 border border-gray-100">
          <Image
            src="/Logo rsud goeteng.jpeg"
            alt="Logo RSUD Goeteng"
            width={75}
            height={75}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight text-center m-0 uppercase">
          RSUD Goeteng
        </h1>
        <p className="text-[11px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1 text-center">
          Taroenadibrata Purbalingga
        </p>
        <div className="flex items-center gap-1 mt-3">
          <div className="w-10 h-1 bg-blue-500 rounded-full" />
          <div className="w-4 h-1 bg-blue-300 rounded-full" />
          <div className="w-2 h-1 bg-blue-100 rounded-full" />
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 md:p-10">
        <h2 className="text-center text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-8">
          Masuk ke Sistem
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium transition-all focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50/50"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium transition-all focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk</span>
            )}
          </button>
        </form>

        {/* Support Section */}
        <div className="mt-8 pt-6 border-t border-gray-50">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-[#16a34a] text-xs font-bold hover:bg-[#dcfce7] transition-all"
          >
            <MessageCircle size={16} />
            Hubungi Bantuan Admin
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-center">
        <p className="text-[10px] text-gray-400 font-semibold tracking-wider">
          PINTAR JP © 2026, Mukhsin Hadi. All Right Reserved
        </p>
      </footer>
    </div>
  )
}
