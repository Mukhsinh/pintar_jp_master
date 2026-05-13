import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getCompanyInfoServer, getSettingServer } from '@/lib/services/settings.server.service'
import { createClient } from '@/lib/supabase/server'

interface IncentiveSlipData {
  period: string
  employeeCode: string
  nik?: string
  employeeName: string
  unit: string
  taxStatus: string
  employeeStatus?: string
  taxType?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
  p1Score: number
  p2Score: number
  p3Score: number
  p1Weight: number
  p2Weight: number
  p3Weight: number
  p1Weighted: number
  p2Weighted: number
  p3Weighted: number
  finalScore: number
  pirValue: number
  totalSkorUnit: number
  unitProportion: number
  unitAllocation?: number
  unitTotalActivity?: number
  totalActivityRupiah: number
  grossIncentive: number
  taxAmount: number
  netIncentive: number
  tax_mechanism_used?: string
  ikg_score?: number
  allocated_pool?: number
  adjustment_value?: number
  attendance_deduction?: number
  other_deductions?: number
  index_incentive?: number
  guarantee_fee?: number
  tax_detail?: string
  pnsGrade?: string
}

function checkPageBreak(doc: any, yPos: number, neededHeight: number) {
  if (yPos + neededHeight > doc.internal.pageSize.height - 20) {
    doc.addPage()
    return 20 // Return new Y position
  }
  return yPos
}

interface ReportExportOptions {
  reportType: string
  period: string
  data: any[]
}

/**
 * Helper to add professional Kop Surat (Header) to PDF
 */
async function addKopSurat(doc: jsPDF, companyInfo: any) {
  // Add logo if exists
  if (companyInfo.logo) {
    try {
      // Basic image support (base64 or URL)
      if (companyInfo.logo.startsWith('data:image') || companyInfo.logo.startsWith('http')) {
        doc.addImage(companyInfo.logo, 'PNG', 15, 8, 22, 22)
      }
    } catch (e) {
      console.error('Error adding logo to PDF:', e)
    }
  }

  const centerX = doc.internal.pageSize.width / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyInfo.name || 'JASPEL ENTERPRISE', centerX, 15, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(companyInfo.address || 'Jakarta, Indonesia', centerX, 22, { align: 'center' })

  if (companyInfo.phone || companyInfo.email) {
    const contact = [companyInfo.phone, companyInfo.email].filter(Boolean).join(' | ')
    doc.setFontSize(8)
    doc.text(contact, centerX, 27, { align: 'center' })
  }

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(15, 32, doc.internal.pageSize.width - 15, 32)
  doc.setLineWidth(0.2)
  doc.line(15, 33, doc.internal.pageSize.width - 15, 33)
}

/**
 * Generate incentive slip PDF
 */
export async function generateIncentiveSlipPDF(data: IncentiveSlipData | IncentiveSlipData[]): Promise<Uint8Array> {
  const doc = new jsPDF()
  const companyInfo = await getCompanyInfoServer()
  const footerSetting = await getSettingServer('footer')
  const footerText = footerSetting?.data?.text || 'Laporan dihasilkan secara otomatis oleh JASPEL System'

  const items = Array.isArray(data) ? data : [data]

  for (let i = 0; i < items.length; i++) {
    const slip = items[i]
    if (i > 0) doc.addPage()

    await addKopSurat(doc, companyInfo)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SLIP INSENTIF KINERJA (JASPEL)', 105, 42, { align: 'center' })

    // Employee Info
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Left column
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMASI PEGAWAI:', 15, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode`, 17, 56); doc.text(`: ${slip.period || '-'}`, 50, 56)
    doc.text(`Nama`, 17, 61); doc.text(`: ${slip.employeeName}`, 50, 61)
    doc.text(`NIP/NIK`, 17, 66); doc.text(`: ${slip.employeeCode}`, 50, 66)
    doc.text(`NIK`, 17, 71); doc.text(`: ${slip.nik || '-'}`, 50, 71)
    doc.text(`Unit`, 17, 76); doc.text(`: ${slip.unit}`, 50, 76)
    doc.text(`Status`, 17, 81); doc.text(`: ${slip.employeeStatus || '-'}`, 50, 81)
    const displayGrade = (slip.pnsGrade && slip.pnsGrade !== '-' && slip.pnsGrade !== 'null') ? slip.pnsGrade : '-'
    doc.text(`Golongan`, 17, 86); doc.text(`: ${displayGrade}`, 50, 86)

    // Right column (Bank Details)
    const rightX = 115
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMASI PEMBAYARAN:', rightX, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nama Bank`, rightX + 2, 56); doc.text(`: ${slip.bankName || '-'}`, rightX + 35, 56)
    doc.text(`No. Rekening`, rightX + 2, 61); doc.text(`: ${slip.bankAccountNumber || '-'}`, rightX + 35, 61)
    doc.text(`Nama Pemilik`, rightX + 2, 66); doc.text(`: ${slip.bankAccountHolder || '-'}`, rightX + 35, 66)


    // Summary Table - use dynamic weights from KPI config
    const p1w = slip.p1Weight || 0
    const p2w = slip.p2Weight || 0
    const p3w = slip.p3Weight || 0

    autoTable(doc, {
      startY: 92,
      head: [['Komponen Penilaian', 'Skor', 'Bobot (%)', 'Nilai Tertimbang']],
      body: [
        ['P1 (Kinerja Utama/Posisi)', slip.p1Score.toFixed(2), `${p1w}%`, slip.p1Weighted.toFixed(2)],
        ['P2 (Kinerja Tambahan)', slip.p2Score.toFixed(2), `${p2w}%`, slip.p2Weighted.toFixed(2)],
        ['P3 (Perilaku/Potensi)', slip.p3Score.toFixed(2), `${p3w}%`, slip.p3Weighted.toFixed(2)],
        [{ content: 'Total Skor Akhir', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, '-', '-', { content: slip.finalScore.toFixed(2), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }],
      ],
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 }
    })

    // === RINCIAN PIR (Poin Indeks Rupiah) ===
    let yPos = (doc as any).lastAutoTable.finalY + 8
    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPos - 3, doc.internal.pageSize.width - 15, yPos - 3)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('A. PERHITUNGAN PIR (Poin Indeks Rupiah)', 15, yPos + 1)

    doc.setFont('helvetica', 'normal')
    // Formatting helper
    const formatCurrency = (num: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

    const mechanism = slip.tax_mechanism_used || 'ter'
    const isNoTax = mechanism === 'none'

    // Header logic for "Tanpa Pajak"
    const incentiveLabel = isNoTax ? "Insentif Bruto (Sebelum Pajak)" : "Insentif Bruto"

    doc.setFontSize(9)
    const fmtNum = (val: number) => val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const allocatedForUnit = typeof slip.unitAllocation === 'number' ? slip.unitAllocation : 0;
    const unitActivity = typeof slip.unitTotalActivity === 'number' ? slip.unitTotalActivity : 0;
    const remainingForIndex = allocatedForUnit - unitActivity;
    const pirValue = typeof slip.pirValue === 'number' ? slip.pirValue : 0;
    const totalSkorUnit = typeof slip.totalSkorUnit === 'number' ? slip.totalSkorUnit : 0;

    yPos += 7
    doc.text(`Formula: PIR = ((Alokasi Dana Unit) - (Insentif Kuantitatif Unit)) / Total Skor Seluruh Pegawai di Unit`, 15, yPos)
    yPos += 5
    doc.text(`Proporsi Unit ${slip.unit}`, 20, yPos)
    doc.text(`: ${fmtNum(slip.unitProportion)}%`, 95, yPos)
    yPos += 5
    doc.text(`Alokasi Dana Unit (Awal)`, 20, yPos)
    doc.text(`: Rp ${fmtNum(allocatedForUnit)}`, 95, yPos)
    yPos += 5
    doc.text(`Pengurang Kuantitatif Unit`, 20, yPos)
    doc.text(`: Rp ${fmtNum(unitActivity)}`, 95, yPos)
    yPos += 5
    doc.text(`Sisa Alokasi untuk Skor Indeks`, 20, yPos)
    doc.text(`: Rp ${fmtNum(remainingForIndex)}`, 95, yPos)
    yPos += 5
    doc.text(`Total Skor Kolektif Unit`, 20, yPos)
    doc.text(`: ${fmtNum(totalSkorUnit)}`, 95, yPos)
    yPos += 5
    doc.text(`Nilai PIR`, 20, yPos)
    doc.text(`: Rp ${fmtNum(pirValue)}`, 95, yPos)
    yPos += 3

    // === PERHITUNGAN INSENTIF ===
    yPos = checkPageBreak(doc, yPos, 120)
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('PERHITUNGAN INSENTIF', 105, yPos, { align: 'center' })
    yPos += 10

    const tableRows: any[] = []
    tableRows.push(['A.', incentiveLabel, ''])
    tableRows.push(['', '1. Insentif Berbasis Indeks (Total Skor × PIR)', formatCurrency(slip.index_incentive || 0)])
    tableRows.push(['', '2. Insentif Berbasis Aktivitas Kuantitatif', formatCurrency(slip.totalActivityRupiah || 0)])
    if (slip.guarantee_fee && slip.guarantee_fee > 0) {
      tableRows.push(['', '3. Guarantee Fee', formatCurrency(slip.guarantee_fee || 0)])
    }
    tableRows.push(['', '   Total Insentif Bruto', formatCurrency(slip.grossIncentive || 0)])
    tableRows.push(['', '', ''])

    let taxLabel = 'POTONGAN PAJAK PPh 21'
    if (mechanism === 'none') {
      taxLabel = 'PAJAK PPh 21 (Tanpa Potongan Pajak)'
    } else if (mechanism === 'ter') {
      taxLabel = 'POTONGAN PAJAK PPh 21 (Mekanisme TER PP 58/2023)'
    } else if (mechanism === 'final_pp80') {
      taxLabel = 'POTONGAN PAJAK PPh 21 (Mekanisme Final PP 80/2010)'
    }

    tableRows.push(['B.', taxLabel, ''])
    tableRows.push(['', '1. PPh Pasal 21', formatCurrency(slip.taxAmount || 0)])
    if (slip.tax_detail && slip.tax_detail !== '-') {
      tableRows.push(['', `   (Detail: ${slip.tax_detail})`, ''])
    }
    tableRows.push(['', '', ''])

    tableRows.push(['C.', isNoTax ? 'TOTAL YANG DITERIMA (SEBELUM PAJAK)' : 'TOTAL INSENTIF NETTO (TAKE HOME PAY)', formatCurrency(slip.netIncentive || 0)])

    autoTable(doc, {
      startY: yPos,
      body: tableRows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 120 }, 2: { cellWidth: 50, halign: 'right' } }
    })

    // Footer
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(footerText, 105, pageHeight - 10, { align: 'center' })
  }

  return new Uint8Array(doc.output('arraybuffer'))
}

/**
 * Generate summary report PDF
 */
export async function generateSummaryReportPDF(
  results: any[],
  period: string,
  reportType: string
): Promise<Uint8Array> {
  const doc = new jsPDF('landscape')
  const companyInfo = await getCompanyInfoServer()
  const footerSetting = await getSettingServer('footer')

  await addKopSurat(doc, companyInfo)

  const centerX = doc.internal.pageSize.width / 2

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')

  let title = `LAPORAN REKAPITULASI PEMBAYARAN JASPEL - PERIODE ${period}`
  if (reportType === 'kpi-achievement') title = `LAPORAN PENCAPAIAN KPI - PERIODE ${period}`
  if (reportType === 'unit-comparison') title = `LAPORAN PERBANDINGAN UNIT - PERIODE ${period}`

  doc.text(title, centerX, 42, { align: 'center' })

  let head = []
  let body = []

  if (reportType === 'kpi-achievement') {
    // Group results by employee_name
    const employeesData: Record<string, typeof results> = {}
    for (const r of results) {
      const empName = r.employee_name || 'Tidak Diketahui'
      if (!employeesData[empName]) employeesData[empName] = []
      employeesData[empName].push(r)
    }

    const employeeNames = Object.keys(employeesData).sort()

    for (let eIdx = 0; eIdx < employeeNames.length; eIdx++) {
      const empName = employeeNames[eIdx]
      const empResults = employeesData[empName]
      const empUnitName = empResults[0]?.unit_name || '-'

      if (eIdx > 0) {
        doc.addPage()
        // Re-add Kop Surat and title on each page for bulk reports
        await addKopSurat(doc, companyInfo)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(title, centerX, 42, { align: 'center' })
      }

      const indexResults = empResults.filter(r => !r.is_activity)
      const activityResults = empResults.filter(r => r.is_activity)

      let currentY = 60

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Pegawai: ${empName}  |  Unit: ${empUnitName}`, 15, 52);

      // --- TABLE 1: KATEGORI BERBASIS INDEKS ---
      if (indexResults.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('--- KATEGORI BERBASIS INDEKS ---', 15, currentY);
        currentY += 4;

        autoTable(doc, {
          startY: currentY,
          head: [['No', 'Kategori', 'Indikator', 'Target', 'Realisasi', 'Capaian (%)', 'Nilai', 'Gap']],
          body: indexResults.map((r, i) => [
            i + 1,
            r.category,
            r.indicator_name,
            r.target_value,
            r.realization_value,
            r.achievement_percentage,
            r.score,
            r.gap
          ]),
          theme: 'grid',
          headStyles: { fillColor: [44, 62, 80], textColor: 255 },
          styles: { fontSize: 8 },
          didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 7) {
              const gapVal = parseFloat(data.cell.raw as string);
              if (gapVal > 0) {
                data.cell.styles.textColor = [34, 197, 94];
                data.cell.styles.fontStyle = 'bold';
              } else if (gapVal < 0) {
                data.cell.styles.textColor = [239, 68, 68];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        })

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Recap Table for Index Scores
        let totalScore = 0;
        for (const r of indexResults) {
          totalScore += parseFloat(r.score || 0);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Tabel Rekapitulasi Pencapaian (Indeks)', 15, currentY - 2);

        autoTable(doc, {
          startY: currentY,
          head: [['Komponen', 'Deskripsi', 'Total Nilai']],
          body: [
            ['Total Pencapaian', `Total Nilai dari Keseluruhan Indikator Berbasis Indeks`, totalScore.toFixed(2)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [44, 62, 80], textColor: 255 },
          styles: { fontSize: 9 }
        })

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- TABLE 2: KATEGORI BERBASIS AKTIVITAS ---
      if (activityResults.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('--- KATEGORI BERBASIS AKTIVITAS ---', 15, currentY);
        currentY += 4;

        autoTable(doc, {
          startY: currentY,
          head: [['No', 'Kategori', 'Indikator', 'Volume / Realisasi']],
          body: activityResults.map((r, i) => [
            i + 1,
            r.category,
            r.indicator_name,
            r.realization_value
          ]),
          theme: 'grid',
          headStyles: { fillColor: [44, 62, 80], textColor: 255 },
          styles: { fontSize: 8 }
        })
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    }

  } else if (reportType === 'unit-comparison') {
    head = [['No', 'Unit', 'Rata-Rata Skor', 'Total Insentif', 'Jumlah Pegawai']]
    body = results.map((r, i) => [
      i + 1,
      r.unit_name,
      r.average_score,
      parseFloat(String(r.total_incentive)).toLocaleString('id-ID'),
      r.employee_count
    ])
    autoTable(doc, {
      startY: 50,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      styles: { fontSize: 8 }
    })
  } else {
    // Default to incentive
    head = [['No', 'NIP/NIK', 'NIK', 'Nama Pegawai', 'Unit', 'P1', 'P2', 'P3', 'Skor Akhir', 'Insentif Bruto', 'Pajak', 'Insentif Neto']]
    body = results.map((r, i) => [
      i + 1,
      r.employee_code || '-',
      r.nik || '-',
      r.employee_name,
      r.unit,
      r.p1_score || '-',
      r.p2_score || '-',
      r.p3_score || '-',
      typeof r.total_score === 'number' ? r.total_score.toFixed(2) : r.total_score,
      parseFloat(String(r.gross_incentive)).toLocaleString('id-ID'),
      parseFloat(String(r.tax_amount)).toLocaleString('id-ID'),
      parseFloat(String(r.net_incentive)).toLocaleString('id-ID')
    ])
    autoTable(doc, {
      startY: 50,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      styles: { fontSize: 8 }
    })
  }

  // Footer for landscape
  const pageHeight = doc.internal.pageSize.height
  const footerText = footerSetting?.data?.text || 'Laporan dihasilkan secara otomatis oleh JASPEL System'
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text(footerText, centerX, pageHeight - 10, { align: 'center' })

  return new Uint8Array(doc.output('arraybuffer'))
}

/**
 * Export report to PDF
 */
export async function exportToPDF(options: ReportExportOptions): Promise<Uint8Array> {
  if (options.reportType === 'employee-slip') {
    const slips = options.data.map(item => {
      const parseNum = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        const strVal = String(val)
        if (strVal.includes(',')) {
          return parseFloat(strVal.replace(/\./g, '').replace(/,/g, '.')) || 0
        }
        return parseFloat(strVal) || 0
      }
      // Use actual weights from data, fallback to defaults
      const p1w = parseFloat(item.p1_weight) || 0
      const p2w = parseFloat(item.p2_weight) || 0
      const p3w = parseFloat(item.p3_weight) || 0

      return {
        period: options.period,
        employeeCode: item.employee_code || '-',
        nik: item.nik || '-',
        employeeName: item.employee_name,
        unit: item.unit,
        taxStatus: item.tax_status || 'Non-PKP',
        employeeStatus: item.employee_status || '-',
        taxType: item.tax_type || '-',
        bankName: item.bank_name,
        bankAccountNumber: item.bank_account_number,
        bankAccountHolder: item.bank_account_holder,
        p1Score: parseFloat(item.p1_score) || 0,
        p2Score: parseFloat(item.p2_score) || 0,
        p3Score: parseFloat(item.p3_score) || 0,
        p1Weight: p1w,
        p2Weight: p2w,
        p3Weight: p3w,
        p1Weighted: parseFloat(item.p1_weighted || item.p1_score) || 0,
        p2Weighted: parseFloat(item.p2_weighted || item.p2_score) || 0,
        p3Weighted: parseFloat(item.p3_weighted || item.p3_score) || 0,
        finalScore: parseFloat(item.total_score) || 0,
        pirValue: parseNum(item.pir_value),
        totalSkorUnit: parseNum(item.total_skor_unit),
        unitProportion: parseNum(item.unit_proportion),
        unitAllocation: parseNum(item.unit_allocation),
        unitTotalActivity: parseNum(item.unit_total_activity),
        totalActivityRupiah: parseNum(item.total_activity_rupiah || item.total_activity),
        index_incentive: parseNum(item.index_incentive),
        guarantee_fee: parseNum(item.guarantee_fee),
        grossIncentive: parseNum(item.gross_incentive),
        taxAmount: parseNum(item.tax_amount),
        netIncentive: parseNum(item.net_incentive),
        tax_mechanism_used: item.tax_mechanism_used,
        tax_detail: item.tax_detail || '-',
        pnsGrade: item.pns_grade || '-',
        ikg_score: parseNum(item.ikg_score),
        allocated_pool: parseNum(item.allocated_pool),
        adjustment_value: parseNum(item.adjustment_value),
        attendance_deduction: parseNum(item.attendance_deduction),
        other_deductions: parseNum(item.other_deductions),
      }
    })
    return await generateIncentiveSlipPDF(slips)
  } else {
    return await generateSummaryReportPDF(options.data, options.period, options.reportType)
  }
}

/**
 * Generate Assessment Guide PDF
 */
export async function generateAssessmentGuidePDF(unitName: string = 'Seluruh Unit', unitId?: string | null): Promise<Uint8Array> {
  const doc = new jsPDF()
  const companyInfo = await getCompanyInfoServer()
  const footerSetting = await getSettingServer('footer')
  const footerText = footerSetting?.data?.text || 'Laporan dihasilkan secara otomatis oleh JASPEL System'

  await addKopSurat(doc, companyInfo)

  const centerX = doc.internal.pageSize.width / 2

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PEDOMAN DAN PETUNJUK PENILAIAN KPI', centerX, 45, { align: 'center' })
  doc.setFontSize(12)
  doc.text(`UNIT KERJA: ${unitName.toUpperCase()}`, centerX, 52, { align: 'center' })

  // Current Y position after header
  let currentY = 65

  // Fetch KPI Configuration Data
  let categories: any[] = []
  if (unitId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('m_kpi_categories')
      .select('*')
      .eq('unit_id', unitId)
      .order('category')
    categories = data || []
  }

  // 1. Overview Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('I. KOMPONEN DAN BOBOT PENILAIAN', 15, currentY)
  currentY += 5

  const componentsBody = categories.length > 0
    ? categories.map(cat => [
      `${cat.category} (${cat.category_name})`,
      `${cat.weight_percentage}%`,
      cat.description || '-'
    ])
    : [
      ['P1 (Utama)', '55%', 'Penilaian capaian indikator kinerja utama sesuai tupoksi/jabatan.'],
      ['P2 (Tambahan)', '25%', 'Penilaian aktivitas/tugas tambahan di luar tupoksi utama.'],
      ['P3 (Perilaku)', '20%', 'Penilaian sikap, kedisiplinan, kerja tim, dan potensi pengembangan.'],
    ]

  autoTable(doc, {
    startY: currentY,
    head: [['Komponen', 'Bobot', 'Deskripsi Penilaian']],
    body: componentsBody,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 15, right: 15, bottom: 25 }
  })

  currentY = (doc as any).lastAutoTable.finalY + 12

  // 2. Calculation Section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('II. STANDAR PENGHITUNGAN SKOR', 15, currentY)
  currentY += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('1. Rumus Skor Akhir Individu:', 15, currentY); currentY += 6

  const formula = categories.length > 0
    ? `Total Skor = ` + categories.map(cat => `(Skor ${cat.category} x ${cat.weight_percentage}%)`).join(' + ')
    : 'Total Skor = (Skor P1 x 55%) + (Skor P2 x 25%) + (Skor P3 x 20%)'

  doc.setFont('courier', 'bold')
  doc.text(`   ${formula}`, 15, currentY); currentY += 8

  doc.setFont('helvetica', 'normal')
  doc.text('2. Rumus Nilai Capaian Indikator:', 15, currentY); currentY += 6
  doc.setFont('courier', 'bold')
  doc.text('   Capaian = (Realisasi / Target) x 100%', 15, currentY); currentY += 5
  doc.text('   Nilai   = (Capaian x Bobot Indikator) / 100', 15, currentY); currentY += 12

  // 3. Detailed KPI Structure Section
  if (categories && categories.length > 0) {
    const supabase = await createClient()

    if (currentY > 220) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('III. RINCIAN INDIKATOR DAN SUB-INDIKATOR KPI', 15, currentY)
    currentY += 5

    for (const cat of categories) {
      const { data: indicators } = await supabase
        .from('m_kpi_indicators')
        .select('*')
        .eq('category_id', cat.id)
        .order('code')

      if (!indicators || indicators.length === 0) continue

      // Check page break for category title
      if (currentY > 250) {
        doc.addPage()
        currentY = 20
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setFillColor(240, 240, 240)
      doc.rect(15, currentY, 180, 8, 'F')
      doc.text(`KATEGORI: ${cat.category} - ${cat.category_name}`, 18, currentY + 6)
      currentY += 12

      for (const ind of indicators) {
        const { data: subs } = await supabase
          .from('m_kpi_sub_indicators')
          .select('*')
          .eq('indicator_id', ind.id)
          .order('code')

        const bodyData = []

        // Add main indicator info
        bodyData.push([
          { content: `${ind.code}`, styles: { fontStyle: 'bold' as const } },
          { content: `${ind.name}`, styles: { fontStyle: 'bold' as const } },
          { content: `${ind.weight_percentage}%`, styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
          { content: `${ind.target_value ?? 0} ${ind.target_unit || ''}`, styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
          { content: '-', styles: { halign: 'center' as const } }
        ])

        // Add sub indicators if any
        if (subs && subs.length > 0) {
          subs.forEach(s => {
            const criteria = s.scoring_criteria as any[] || []
            const criteriaText = criteria.length > 0
              ? criteria.map(c => `      [${c.score}] ${c.label}`).join('\n')
              : '      Sesuai target'

            bodyData.push([
              `   ${s.code}`,
              {
                content: `   • ${s.name}\n\n      Kriteria Skor:\n${criteriaText}`,
                styles: { fontSize: 8 }
              },
              { content: `${s.weight_percentage}%`, styles: { halign: 'center' as const, fontSize: 8 } },
              { content: `${s.target_value ?? '-'}`, styles: { halign: 'center' as const, fontSize: 8 } },
              { content: 'Multi-Skor', styles: { halign: 'center' as const, fontSize: 8, fontStyle: 'italic' as const } }
            ])
          })
        }

        autoTable(doc, {
          startY: currentY,
          head: [['Kode', 'Indikator / Sub-Indikator', 'Bobot', 'Target', 'Skor Poin']],
          body: bodyData,
          theme: 'grid',
          headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 9 },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 100 },
            2: { cellWidth: 18 },
            3: { cellWidth: 22 },
            4: { cellWidth: 20 }
          },
          margin: { left: 15, right: 15, bottom: 25 },
        })

        currentY = (doc as any).lastAutoTable.finalY + 8

        // Safety check for next indicator
        if (currentY > 255) {
          doc.addPage()
          currentY = 20
        }
      }
      currentY += 5
    }
  } else {
    // Basic fallback if no unit selected
    const nextY = 110
    doc.setFont('helvetica', 'italic')
    doc.text('Catatan: Silakan pilih unit spesifik untuk melihat rincian indikator yang berlaku.', 15, nextY)
  }

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(footerText, centerX, doc.internal.pageSize.height - 15, { align: 'center' })
    doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 15)
  }

  return new Uint8Array(doc.output('arraybuffer'))
}
