'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  RefreshCw,
  MessageCircle,
  CheckCircle2,
  BarChart3,
  Trophy,
  Eye,
  EyeOff,
  Mail,
  Lock
} from 'lucide-react'
import Image from 'next/image'

function getErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) return null

  const errorMessages: Record<string, string> = {
    'session_expired': 'Sesi Anda telah berakhir, silakan masuk kembali',
    'inactive': 'Akun Anda tidak aktif, hubungi administrator',
    'user_not_found': 'Data pengguna tidak ditemukan',
    'unexpected': 'Terjadi kesalahan, silakan coba lagi',
  }

  return errorMessages[errorCode] || 'Terjadi kesalahan, silakan coba lagi'
}

const ADVANTAGES = [
  {
    title: 'Manajemen KPI Terpadu',
    description: 'Monitor dan kelola KPI dengan presisi tinggi.',
    icon: BarChart3,
  },
  {
    title: 'Integrasi Insentif',
    description: 'Perhitungan JASPEL (P1, P2, P3) otomatis.',
    icon: Trophy,
  }
]

const Typewriter = ({ text, speed = 50, delay = 3000 }: { text: string, speed?: number, delay?: number }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isDeleting) {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(text.substring(0, displayedText.length - 1))
        }, speed / 2)
      } else {
        setIsDeleting(false)
      }
    } else {
      if (displayedText.length < text.length) {
        timer = setTimeout(() => {
          setDisplayedText(text.substring(0, displayedText.length + 1))
        }, speed)
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true)
        }, delay)
      }
    }

    return () => clearTimeout(timer)
  }, [displayedText, isDeleting, text, speed, delay])

  return (
    <div className="relative">
      <p className="text-2xl lg:text-3xl font-black leading-tight text-slate-900 drop-shadow-[0_0_15px_rgba(59,130,246,0.2)] tracking-tight">
        <span className="text-blue-600">STOP</span> {displayedText.slice(5)}
        <span className="inline-block w-[4px] h-8 lg:h-9 bg-blue-500 ml-1 animate-blink align-middle"></span>
      </p>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClearStorage, setShowClearStorage] = useState(false)
  const [footerText, setFooterText] = useState('© 2026 PINTAR-JP. Mukhsin Hadi - All Rights Reserved')
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(getErrorMessage(errorParam))
    }
    checkStuckSession()
    loadSettings()
  }, [searchParams])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('t_settings').select('value').eq('key', 'footer').maybeSingle()
      if (data?.value?.text) {
        setFooterText(data.value.text)
      }
    } catch (e) {
      console.warn('Failed to load settings:', e)
    }
  }

  const checkStuckSession = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.signOut({ scope: 'local' })
        localStorage.clear()
        sessionStorage.clear()
      }
    } catch (e) {
      console.warn('[LOGIN] Error checking session:', e)
    }
  }

  const handleClearStorage = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim()
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      })
      window.location.reload()
    } catch (e) {
      console.error('[LOGIN] Error clearing storage:', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (authError) {
        setError(authError.message || 'Email atau kata sandi salah')
        setShowClearStorage(true)
        setIsLoading(false)
        return
      }

      if (!authData.user || !authData.session) {
        setError('Gagal membuat sesi, silakan coba lagi')
        setIsLoading(false)
        return
      }

      // Post-login: sync role from auth metadata to m_employees table
      // This repairs any previously broken role changes using server-side admin client
      try {
        await fetch('/api/users/sync-role', { method: 'POST' })
      } catch (syncErr) {
        console.warn('[LOGIN] Role sync warning:', syncErr)
        // Non-blocking: continue to dashboard even if sync fails
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError('Terjadi kesalahan sistem, silakan coba lagi')
      setShowClearStorage(true)
      setIsLoading(false)
    }
  }

  const waMessage = encodeURIComponent(
    "Selamat datang pada aplikasi PINTAR-JP, aplikasi yang mengintegrasikan manajamen KPI pegawai dengan Insentif Jasa Pelayanan secara komprehensif. Mohon informasi lebih lanjut."
  )
  const waUrl = `https://wa.me/6285726112001?text=${waMessage}`

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-[1400px] flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-16">

          {/* Left Section: Illustration & Slogan */}
          <div className="w-full lg:w-[60%] flex flex-col items-center lg:items-start justify-center p-4 lg:p-8 text-center lg:text-left space-y-8">
            <div className="max-w-xl w-full min-h-[140px] lg:min-h-[160px] flex items-start overflow-hidden">
              <Typewriter text="STOP membuang energi pada hal yang bisa otomatis. Gunakan PINTAR JP, dan bersiaplah kaget melihat betapa banyak waktu yang kamu sia-siakan selama ini" />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 w-full">
              {/* Illustration */}
              <div className="relative w-full max-w-[240px] lg:max-w-[300px] aspect-square flex-shrink-0">
                <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-[80px] opacity-30 -z-10 scale-125"></div>
                <Image
                  src="/login-illustration.png"
                  alt="Illustration"
                  width={340}
                  height={340}
                  className="w-full h-full object-contain relative z-10 drop-shadow-xl"
                  priority
                />
              </div>

              {/* Advantages Cards (Moved Next to Illustration) */}
              <div className="grid grid-cols-1 gap-4 w-full">
                {ADVANTAGES.map((adv, i) => (
                  <div key={i} className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex flex-col items-start transition-all hover:shadow-md hover:scale-[1.02]">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                      <adv.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 mb-1 leading-tight">{adv.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">{adv.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section: Form Container */}
          <div className="w-full lg:w-[40%] flex items-center justify-center">
            <div className="w-full max-w-md lg:max-w-lg bg-white p-8 lg:p-12 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-50 relative flex flex-col">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">P</div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">PINTAR-JP</h2>
              </div>

              <div className="mb-10">
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-2 tracking-tighter italic font-serif">
                  Selamat Datang
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Alamat Email</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                        <Mail size={18} />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        required
                        className="h-12 bg-white border border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl pl-12 transition-all font-bold text-slate-800 text-sm shadow-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" title="Kata Sandi" className="text-sm font-bold text-slate-700 ml-1">Kata Sandi</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                        <Lock size={18} />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="h-12 bg-white border border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl pl-12 pr-12 transition-all font-bold text-slate-800 text-sm shadow-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center px-1">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" className="sr-only peer" id="remember" />
                      <div className="w-4 h-4 bg-slate-100 border border-slate-200 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                      <CheckCircle2 size={10} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-bold">
                    {error}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
                  </Button>
                </div>

                {showClearStorage && (
                  <button
                    type="button"
                    onClick={handleClearStorage}
                    className="w-full text-[10px] font-bold text-slate-400 hover:text-red-500 transition-all flex items-center justify-center gap-2 mt-1"
                  >
                    <RefreshCw size={10} />
                    Reset Session & Reload
                  </button>
                )}
              </form>

              <div className="mt-8 flex flex-col items-center gap-6">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-3 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-sm hover:bg-emerald-100 hover:scale-105 transition-all border border-emerald-100"
                >
                  <MessageCircle className="mr-2 h-4 w-4 fill-emerald-700/10" />
                  Hubungi Bantuan Admin
                </a>

                <p className="text-xs text-slate-400 font-bold tracking-tight text-center">
                  {footerText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.8s step-end infinite;
        }
      `}</style>
    </div>
  )
}
