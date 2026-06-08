'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPegawaiWithUnits } from './actions'
import { Plus, Search, RefreshCw, Upload, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { PegawaiTable } from '@/components/pegawai/PegawaiTable'
import { PegawaiFormDialog } from '@/components/pegawai/PegawaiFormDialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { validateSessionData } from '@/lib/utils/auth-session'
import type { Pegawai } from '@/lib/types/database.types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

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

export default function PegawaiPage() {
  const router = useRouter()
  const [pegawai, setPegawai] = useState<Pegawai[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('')

  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Validate session on mount
  useEffect(() => {
    if (!validateSessionData()) {
      setError('Session data corrupted, please login again')
      router.push('/login')
      return
    }
  }, [router])

  // Load pegawai data
  const loadPegawai = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await getPegawaiWithUnits(currentPage, pageSize, debouncedSearchTerm)

      if (result.error) {
        if (result.error.includes('terautentikasi') || result.error.includes('akses')) {
          console.error('Auth error, redirecting to login')
          router.push('/login')
          return
        }
        setError(result.error)
        setPegawai([])
        setTotalCount(0)
      } else {
        setPegawai(result.data)
        setTotalCount(result.count)
      }
    } catch (err: any) {
      console.error('Error loading pegawai:', err)
      setError('Gagal memuat data pegawai')
      setPegawai([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearchTerm, router])

  // Load data when dependencies change
  useEffect(() => {
    loadPegawai()
  }, [loadPegawai])

  // Reset to first page when search term changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }, [])

  const handleEdit = useCallback((pegawai: Pegawai) => {
    setSelectedPegawai(pegawai)
    setShowCreateDialog(true)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setShowCreateDialog(false)
    setSelectedPegawai(null)
  }, [])

  const handleSuccess = useCallback(() => {
    loadPegawai()
    handleCloseDialog()
  }, [loadPegawai, handleCloseDialog])

  const handleDownloadTemplate = () => {
    window.open('/api/pegawai/template', '_blank')
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportProgress(5)
    setImportStatus('Mengunggah file...')

    const formData = new FormData()
    formData.append('file', file)

    // Smooth progress simulation
    let currentProg = 5
    const progressInterval = setInterval(() => {
      currentProg += (85 - currentProg) * 0.08
      setImportProgress(Math.round(currentProg))

      if (currentProg > 20 && currentProg < 50) {
        setImportStatus('Memvalidasi dan memproses data...')
      } else if (currentProg >= 50 && currentProg < 80) {
        setImportStatus('Menyinkronkan ke database...')
      } else if (currentProg >= 80) {
        setImportStatus('Menyelesaikan proses...')
      }
    }, 400)

    try {
      const response = await fetch('/api/pegawai/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setImportProgress(100)
      setImportStatus('Selesai!')

      const result = await response.json()
      console.log('[IMPORT RESULT]', result)

      if (response.ok) {
        const totalProcessed = (result.success || 0) + (result.failed || 0)

        if (result.success > 0) {
          // Build detailed toast description
          toast.success(`Import Selesai — ${result.success} dari ${totalProcessed} berhasil`, {
            duration: 12000,
            description: result.failed > 0
              ? `⚠️ ${result.failed} gagal: ${(result.errors || []).slice(0, 5).join(' | ')}${(result.errors || []).length > 5 ? ` (+${result.errors.length - 5} lainnya)` : ''}`
              : 'Semua data berhasil diproses!',
          })
          // Reload data
          loadPegawai()
        } else if (result.failed > 0) {
          toast.error(`Import Gagal — Semua ${result.failed} data gagal diproses`, {
            duration: 15000,
            description: `Penyebab: ${(result.errors || []).slice(0, 3).join(' | ')}`,
          })
        } else {
          toast.warning('Tidak ada data yang diproses', {
            description: 'File mungkin kosong atau header tidak sesuai template.',
            duration: 8000,
          })
        }
      } else {
        toast.error('Import Gagal', {
          description: result.error || 'Terjadi kesalahan pada server.',
          duration: 10000,
        })
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      console.error('Import error:', err)
      toast.error('Koneksi Gagal', {
        description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        duration: 10000,
      })
    } finally {
      setTimeout(() => {
        setImporting(false)
        setImportProgress(0)
        setImportStatus('')
      }, 1500)
      if (event?.target) event.target.value = ''
    }
  }

  const handleDownloadReport = (format: 'excel' | 'pdf') => {
    window.open(`/api/pegawai/export?format=${format}`, '_blank')
  }

  if (loading && pegawai.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Import Progress Bar */}
      {importing && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <div className="h-1.5 w-full bg-blue-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 bg-blue-600 text-white text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="font-medium">{importStatus}</span>
            </div>
            <span className="font-bold tabular-nums">{importProgress}%</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Master Pegawai</h1>
          <p className="text-sm text-gray-500">Kelola data pegawai organisasi</p>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap lg:flex-nowrap gap-2 w-full sm:w-auto">
          <Button
            onClick={handleDownloadTemplate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm px-2 md:px-4"
            disabled={importing}
          >
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Template
          </Button>

          <Button
            onClick={() => document.getElementById('import-pegawai')?.click()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm px-2 md:px-4"
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            )}
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <input
            id="import-pegawai"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />

          <Button
            onClick={() => handleDownloadReport('excel')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-2 md:px-4"
            disabled={importing}
          >
            <FileSpreadsheet className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Excel
          </Button>

          <Button
            onClick={() => handleDownloadReport('pdf')}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm px-2 md:px-4"
            disabled={importing}
          >
            <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            PDF
          </Button>

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="col-span-2 md:col-span-1 text-xs md:text-sm"
            disabled={importing}
          >
            <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Tambah Pegawai
          </Button>
        </div>
      </div>

      {/* Import Detail Card */}
      {importing && (
        <Card className="border-blue-200 bg-blue-50/50 animate-in fade-in duration-500">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">Proses Import Sedang Berjalan</p>
                <p className="text-xs text-blue-700">{importStatus} — Jangan tutup atau refresh halaman ini.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 tabular-nums">{importProgress}%</p>
              </div>
            </div>
            <Progress value={importProgress} className="mt-3 h-2 bg-blue-100" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pegawai</CardTitle>
          <CardDescription>
            Total: {totalCount} pegawai
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama, kode pegawai, atau jabatan..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={loadPegawai}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>

          <PegawaiTable
            pegawai={pegawai}
            loading={loading}
            onEdit={handleEdit}
            onRefresh={loadPegawai}
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

      <PegawaiFormDialog
        open={showCreateDialog}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
        pegawai={selectedPegawai}
      />
    </div>
  )
}