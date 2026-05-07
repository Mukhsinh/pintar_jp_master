'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText, Download, TrendingUp, Building2, IdCard,
  FileSpreadsheet, FileDown, BarChart2, ClipboardCheck, ChevronDown
} from 'lucide-react'

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────
type ReportType = 'incentive' | 'kpi-achievement' | 'unit-comparison' | 'employee-slip'

const REPORT_TYPES = [
  {
    id: 'incentive' as ReportType,
    title: 'Laporan Insentif',
    description: 'Distribusi insentif detail dengan skor P1, P2, P3',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'kpi-achievement' as ReportType,
    title: 'Laporan Pencapaian KPI',
    description: 'Realisasi KPI dan persentase pencapaian',
    icon: TrendingUp,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    id: 'unit-comparison' as ReportType,
    title: 'Laporan Perbandingan Unit',
    description: 'Bandingkan kinerja antar unit',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    id: 'employee-slip' as ReportType,
    title: 'Slip Pegawai',
    description: 'Slip insentif pegawai individual',
    icon: IdCard,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
]

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────

function ReportTypeCard({
  report,
  selected,
  onClick,
}: {
  report: typeof REPORT_TYPES[number]
  selected: boolean
  onClick: () => void
}) {
  const Icon = report.icon
  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-lg ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${report.bg}`}>
          <Icon className={`w-5 h-5 ${report.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{report.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{report.description}</p>
        </div>
        {selected && <Badge className="text-[10px] bg-blue-500 text-white px-1">Aktif</Badge>}
      </div>
    </Card>
  )
}

function IncentiveTable({ data }: { data: any[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-100">
          {['NIP/NIK', 'NIK', 'NAMA PEGAWAI', 'UNIT', 'BANK', 'P1', 'P2', 'P3', 'SKOR', 'PIR', 'GROSS', 'PAJAK', 'NET'].map(h => (
            <th key={h} className={`border p-2 ${['P1', 'P2', 'P3', 'SKOR', 'PIR', 'GROSS', 'PAJAK', 'NET'].includes(h) ? 'text-right' : 'text-left'} font-semibold`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, idx: number) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="border p-2 whitespace-nowrap">{row.employee_code || '-'}</td>
            <td className="border p-2 whitespace-nowrap">{row.nik || '-'}</td>
            <td className="border p-2 font-medium min-w-[150px]">{row.employee_name}</td>
            <td className="border p-2 whitespace-nowrap">{row.unit}</td>
            <td className="border p-2 text-xs">
              <div className="font-semibold">{row.bank_name || '-'}</div>
              <div className="text-gray-500">{row.bank_account_number || '-'}</div>
            </td>
            <td className="border p-2 text-right">{(parseFloat(row.p1_score) || 0).toFixed(2)}</td>
            <td className="border p-2 text-right">{(parseFloat(row.p2_score) || 0).toFixed(2)}</td>
            <td className="border p-2 text-right">{(parseFloat(row.p3_score) || 0).toFixed(2)}</td>
            <td className="border p-2 text-right font-bold text-blue-700">{(parseFloat(row.total_score) || 0).toFixed(2)}</td>
            <td className="border p-2 text-right whitespace-nowrap text-purple-600">{formatCurrency(parseFloat(row.pir_value) || 0)}</td>
            <td className="border p-2 text-right whitespace-nowrap">{formatCurrency(parseFloat(row.gross_incentive) || 0)}</td>
            <td className="border p-2 text-right whitespace-nowrap text-red-600">{formatCurrency(parseFloat(row.tax_amount) || 0)}</td>
            <td className="border p-2 text-right font-bold text-green-700 whitespace-nowrap">{formatCurrency(parseFloat(row.net_incentive) || 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function UnitComparisonTable({ data }: { data: any[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2 text-left font-semibold">UNIT</th>
          <th className="border p-2 text-right font-semibold">RATA-RATA SKOR</th>
          <th className="border p-2 text-right font-semibold">TOTAL INSENTIF</th>
          <th className="border p-2 text-right font-semibold">JUMLAH PEGAWAI</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, idx: number) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="border p-2 font-medium">{row.unit_name}</td>
            <td className="border p-2 text-right font-bold text-blue-700">{row.average_score}</td>
            <td className="border p-2 text-right font-bold text-green-700">{formatCurrency(parseFloat(row.total_incentive) || 0)}</td>
            <td className="border p-2 text-right">{row.employee_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function KPIAchievementTable({ data }: { data: any[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2 text-left font-semibold">NAMA</th>
          <th className="border p-2 text-left font-semibold">INDIKATOR</th>
          <th className="border p-2 text-right font-semibold">BOBOT</th>
          <th className="border p-2 text-right font-semibold">PENCAPAIAN</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, idx: number) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="border p-2 font-medium">{row.employee_name || row.unit_name}</td>
            <td className="border p-2">{row.indicator}</td>
            <td className="border p-2 text-right">{row.weight}</td>
            <td className="border p-2 text-right font-bold text-blue-700">{row.achievement_percentage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [detailLevel, setDetailLevel] = useState<'summary' | 'detail'>('summary')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setIsMounted(true)
    const fetchMetadata = async () => {
      const [unitsRes, empRes] = await Promise.all([
        fetch('/api/reports/generate/metadata?type=units'),
        fetch('/api/reports/generate/metadata?type=employees'),
      ])
      const [units, employees] = await Promise.all([unitsRes.json(), empRes.json()])
      setAvailableUnits(units.data || [])
      setAvailableEmployees(employees.data || [])
    }
    fetchMetadata()
  }, [])

  const handleGenerateReport = async () => {
    if (!selectedReport || !selectedPeriod) {
      setError('Pilih jenis laporan dan periode')
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedReport,
          period: selectedPeriod,
          unitId: selectedUnit === 'all' ? null : selectedUnit,
          employeeId: selectedEmployee === 'all' ? null : selectedEmployee,
          detailLevel,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal membuat laporan')
      if (data.data?.length === 0) {
        setError(`Tidak ada data untuk periode ${selectedPeriod}`)
        setReportData(null)
      } else {
        setReportData(data.data)
      }
    } catch (err) {
      setError((err as Error).message)
      setReportData(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadGuide = async () => {
    try {
      const unitName = selectedUnit === 'all'
        ? 'Seluruh Unit'
        : availableUnits.find(u => u.id === selectedUnit)?.name || 'Unit'

      const response = await fetch('/api/reports/assessment-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitName, unitId: selectedUnit === 'all' ? null : selectedUnit }),
      })
      if (!response.ok) throw new Error('Gagal mengunduh petunjuk')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `Petunjuk_Penilaian_${unitName.replace(/\s+/g, '_')}.pdf` })
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!reportData || !selectedReport || !selectedPeriod) return
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: selectedReport, period: selectedPeriod, format, data: reportData }),
      })
      if (!response.ok) throw new Error('Ekspor gagal')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `${selectedReport}-${selectedPeriod}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      })
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const filteredEmployees = availableEmployees.filter(e =>
    (selectedUnit === 'all' || e.unit_id === selectedUnit) &&
    (searchTerm === '' || e.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isMounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Laporan</h1>
          <p className="text-gray-600 mt-1">Buat dan ekspor berbagai laporan kinerja</p>
        </div>
        <Button
          onClick={handleDownloadGuide}
          variant="outline"
          className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <ClipboardCheck className="w-4 h-4" />
          Unduh Petunjuk Penilaian
        </Button>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map(report => (
          <ReportTypeCard
            key={report.id}
            report={report}
            selected={selectedReport === report.id}
            onClick={() => {
              setSelectedReport(report.id)
              setReportData(null)
              setError(null)
            }}
          />
        ))}
      </div>

      {/* Filters & Actions */}
      {selectedReport && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Period */}
              <div className="space-y-1">
                <Label>Pilih Periode</Label>
                <Input
                  type="month"
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value)}
                />
              </div>

              {/* Unit */}
              {selectedReport !== 'unit-comparison' && (
                <div className="space-y-1">
                  <Label>Unit Kerja</Label>
                  <Select
                    value={selectedUnit}
                    onValueChange={v => { setSelectedUnit(v); setSelectedEmployee('all') }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Unit</SelectItem>
                      {availableUnits.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Employee Search */}
              {selectedReport !== 'unit-comparison' && (
                <div className="space-y-1">
                  <Label>Cari &amp; Pilih Pegawai</Label>
                  <Input
                    placeholder="Cari nama..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="mb-1"
                  />
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Pegawai" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Pegawai</SelectItem>
                      {filteredEmployees.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name} ({e.employee_code || '-'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Detail Level */}
              {selectedReport === 'kpi-achievement' && (
                <div className="space-y-1">
                  <Label>Level Detail</Label>
                  <Select value={detailLevel} onValueChange={v => setDetailLevel(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Ringkasan (Rekap)</SelectItem>
                      <SelectItem value="detail">Detail (Sub-Indikator)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedReport || !selectedPeriod || isGenerating}
              >
                {isGenerating ? 'Membuat Laporan...' : 'Buat Laporan'}
              </Button>

              {reportData && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Unduh Laporan
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                      <FileDown className="w-4 h-4 mr-2 text-red-600" />
                      Format PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                      Format Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Unit Comparison Stats */}
      {selectedReport === 'unit-comparison' && reportData && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-purple-700 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Statistik Performa Unit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportData.map((row: any, idx: number) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm text-gray-500">{row.unit_name}</div>
                <div className="text-2xl font-bold text-blue-600">{row.average_score}</div>
                <div className="text-xs text-gray-400 mt-1">{row.employee_count} Pegawai</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Report Preview */}
      {reportData && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pratinjau Laporan</h2>
          <div className="overflow-x-auto">
            {(selectedReport === 'incentive' || selectedReport === 'employee-slip') ? (
              <IncentiveTable data={reportData} />
            ) : selectedReport === 'unit-comparison' ? (
              <UnitComparisonTable data={reportData} />
            ) : (
              <KPIAchievementTable data={reportData} />
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
