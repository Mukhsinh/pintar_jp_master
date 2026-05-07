import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { isMedicalUnit } from '@/lib/utils/medical-unit'
import { calculateCategoryScore, calculateTotalScore } from '@/lib/utils/score-calculator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const unitId = searchParams.get('unit_id')

    if (!period) {
      return NextResponse.json({ success: false, error: 'Period is required' }, { status: 400 })
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.user_metadata?.role

    // Build query for assessment data
    let query = supabase
      .from('t_kpi_assessments')
      .select(`
        *,
        m_employees!employee_id (
          full_name,
          employee_id,
          unit_id,
          m_units!unit_id (name)
        ),
        m_kpi_indicators!indicator_id (
          name,
          code,
          target_value,
          weight_percentage,
          measurement_unit,
          m_kpi_categories!category_id (
            category,
            category_name
          )
        ),
        assessor:auth.users!assessor_id (
          user_metadata
        )
      `)
      .eq('period', period)
      .order('m_employees.full_name')
      .order('m_kpi_categories.category')
      .order('m_kpi_indicators.code')

    // Apply unit filtering based on role
    if (userRole === 'unit_manager') {
      const { data: userEmployee } = await supabase
        .from('m_employees')
        .select('unit_id')
        .eq('user_id', user.id)
        .single()

      if (userEmployee) {
        query = query.eq('m_employees.unit_id', userEmployee.unit_id)
      }
    } else if (unitId && unitId !== 'all') {
      query = query.eq('m_employees.unit_id', unitId)
    }

    const { data: assessmentData, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!assessmentData || assessmentData.length === 0) {
      return NextResponse.json({ success: false, error: 'No assessment data found' }, { status: 404 })
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Detail Penilaian
    const detailData = assessmentData.map((assessment: any) => ({
      'Periode': assessment.period,
      'Unit': assessment.m_employees.m_units.name,
      'NIP': assessment.m_employees.employee_id,
      'Nama Pegawai': assessment.m_employees.full_name,
      'Kategori KPI': assessment.m_kpi_indicators.m_kpi_categories.category,
      'Nama Kategori': assessment.m_kpi_indicators.m_kpi_categories.category_name,
      'Kode Indikator': assessment.m_kpi_indicators.code,
      'Nama Indikator': assessment.m_kpi_indicators.name,
      'Satuan': assessment.m_kpi_indicators.measurement_unit || '-',
      'Target': assessment.target_value,
      'Realisasi': assessment.realization_value,
      'Pencapaian (%)': assessment.achievement_percentage?.toFixed(2) || '0.00',
      'Bobot (%)': assessment.weight_percentage,
      'Skor': assessment.score?.toFixed(2) || '0.00',
      'Catatan': assessment.notes || '-',
      'Penilai': assessment.assessor?.user_metadata?.full_name || 'Unknown',
      'Tanggal Penilaian': assessment.created_at ? new Date(assessment.created_at).toLocaleDateString('id-ID') : '-',
      'Terakhir Diubah': assessment.updated_at ? new Date(assessment.updated_at).toLocaleDateString('id-ID') : '-'
    }))

    const detailSheet = XLSX.utils.json_to_sheet(detailData)

    // Set column widths
    const detailCols = [
      { wch: 10 }, // Periode
      { wch: 20 }, // Unit
      { wch: 15 }, // NIP
      { wch: 25 }, // Nama Pegawai
      { wch: 12 }, // Kategori KPI
      { wch: 20 }, // Nama Kategori
      { wch: 15 }, // Kode Indikator
      { wch: 30 }, // Nama Indikator
      { wch: 10 }, // Satuan
      { wch: 12 }, // Target
      { wch: 12 }, // Realisasi
      { wch: 15 }, // Pencapaian
      { wch: 12 }, // Bobot
      { wch: 10 }, // Skor
      { wch: 30 }, // Catatan
      { wch: 20 }, // Penilai
      { wch: 15 }, // Tanggal Penilaian
      { wch: 15 }  // Terakhir Diubah
    ]
    detailSheet['!cols'] = detailCols

    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Penilaian')

    // Sheet 2: Ringkasan per Pegawai
    const employeeSummary = new Map()

    assessmentData.forEach((assessment: any) => {
      const employeeId = assessment.employee_id
      if (!employeeSummary.has(employeeId)) {
        employeeSummary.set(employeeId, {
          unit: assessment.m_employees.m_units.name,
          nip: assessment.m_employees.employee_id,
          nama: assessment.m_employees.full_name,
          p1_scores: [],
          p2_scores: [],
          p3_scores: [],
          total_indicators: 0,
          assessed_indicators: 0
        })
      }

      const employee = employeeSummary.get(employeeId)
      const category = assessment.m_kpi_indicators.m_kpi_categories.category.toLowerCase()
      const score = assessment.score || 0

      employee.total_indicators++
      if (assessment.score !== null && assessment.score !== undefined) {
        employee.assessed_indicators++
      }

      if (category === 'p1') employee.p1_scores.push(score)
      else if (category === 'p2') employee.p2_scores.push(score)
      else if (category === 'p3') employee.p3_scores.push(score)
    })

    const summaryData = Array.from(employeeSummary.values()).map((employee: any) => {
      const isMedical = isMedicalUnit(null, employee.unit);

      const p1Average = calculateCategoryScore(employee.p1_scores, isMedical);
      const p2Average = calculateCategoryScore(employee.p2_scores, isMedical);
      const p3Average = calculateCategoryScore(employee.p3_scores, isMedical);
      const totalAverage = calculateTotalScore(p1Average, p2Average, p3Average, isMedical);

      const completionRate = employee.total_indicators > 0 ?
        (employee.assessed_indicators / employee.total_indicators) * 100 : 0;

      return {
        'Unit': employee.unit,
        'NIP': employee.nip,
        'Nama Pegawai': employee.nama,
        'Total Indikator': employee.total_indicators,
        'Sudah Dinilai': employee.assessed_indicators,
        'Tingkat Penyelesaian (%)': completionRate.toFixed(1),
        'Rata-rata P1': p1Average.toFixed(2),
        'Rata-rata P2': p2Average.toFixed(2),
        'Rata-rata P3': p3Average.toFixed(2),
        'Rata-rata Total': totalAverage.toFixed(2),
        'Status': completionRate === 100 ? 'Selesai' : completionRate > 0 ? 'Sebagian' : 'Belum Dinilai'
      }
    })

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)

    // Set column widths for summary
    const summaryCols = [
      { wch: 20 }, // Unit
      { wch: 15 }, // NIP
      { wch: 25 }, // Nama Pegawai
      { wch: 15 }, // Total Indikator
      { wch: 15 }, // Sudah Dinilai
      { wch: 20 }, // Tingkat Penyelesaian
      { wch: 15 }, // Rata-rata P1
      { wch: 15 }, // Rata-rata P2
      { wch: 15 }, // Rata-rata P3
      { wch: 15 }, // Rata-rata Total
      { wch: 15 }  // Status
    ]
    summarySheet['!cols'] = summaryCols

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Pegawai')

    // Sheet 3: Ringkasan per Unit (if showing all units)
    if (!unitId || unitId === 'all') {
      const unitSummary = new Map()

      assessmentData.forEach((assessment: any) => {
        const unitName = assessment.m_employees.m_units.name
        if (!unitSummary.has(unitName)) {
          unitSummary.set(unitName, {
            employees: new Set(),
            total_assessments: 0,
            total_score: 0,
            p1_scores: [],
            p2_scores: [],
            p3_scores: []
          })
        }

        const unit = unitSummary.get(unitName)
        unit.employees.add(assessment.employee_id)
        unit.total_assessments++

        const score = assessment.score || 0
        unit.total_score += score

        const category = assessment.m_kpi_indicators.m_kpi_categories.category.toLowerCase()
        if (category === 'p1') unit.p1_scores.push(score)
        else if (category === 'p2') unit.p2_scores.push(score)
        else if (category === 'p3') unit.p3_scores.push(score)
      })

      const unitData = Array.from(unitSummary.entries()).map(([unitName, data]: [string, any]) => {
        const p1Average = data.p1_scores.length > 0 ?
          data.p1_scores.reduce((a: number, b: number) => a + b, 0) / data.p1_scores.length : 0
        const p2Average = data.p2_scores.length > 0 ?
          data.p2_scores.reduce((a: number, b: number) => a + b, 0) / data.p2_scores.length : 0
        const p3Average = data.p3_scores.length > 0 ?
          data.p3_scores.reduce((a: number, b: number) => a + b, 0) / data.p3_scores.length : 0

        const overallAverage = data.total_assessments > 0 ? data.total_score / data.total_assessments : 0

        return {
          'Unit': unitName,
          'Jumlah Pegawai': data.employees.size,
          'Total Penilaian': data.total_assessments,
          'Rata-rata P1': p1Average.toFixed(2),
          'Rata-rata P2': p2Average.toFixed(2),
          'Rata-rata P3': p3Average.toFixed(2),
          'Rata-rata Keseluruhan': overallAverage.toFixed(2)
        }
      })

      const unitSheet = XLSX.utils.json_to_sheet(unitData)

      // Set column widths for unit summary
      const unitCols = [
        { wch: 25 }, // Unit
        { wch: 15 }, // Jumlah Pegawai
        { wch: 15 }, // Total Penilaian
        { wch: 15 }, // Rata-rata P1
        { wch: 15 }, // Rata-rata P2
        { wch: 15 }, // Rata-rata P3
        { wch: 20 }  // Rata-rata Keseluruhan
      ]
      unitSheet['!cols'] = unitCols

      XLSX.utils.book_append_sheet(workbook, unitSheet, 'Ringkasan Unit')
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // Set response headers
    const filename = `laporan-penilaian-${period}${unitId && unitId !== 'all' ? `-${unitId}` : ''}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Assessment export error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}