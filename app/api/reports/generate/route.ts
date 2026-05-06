import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * PPh 21 Progressive Tax Calculator (UU HPP)
 * Calculates monthly tax based on annualized gross income.
 * ASN with Final tax type: 0% (exempt)
 * BLUD/Non-ASN: Progressive rates applied
 */
function calculatePPh21(monthlyGross: number, employeeStatus?: string, taxType?: string): number {
  // ASN with Final tax → exempt
  if (employeeStatus === 'ASN' && taxType === 'Final') return 0
  if (monthlyGross <= 0) return 0

  const annualGross = monthlyGross * 12

  // Progressive tax brackets (UU HPP)
  let annualTax = 0
  if (annualGross <= 60_000_000) {
    annualTax = annualGross * 0.05
  } else if (annualGross <= 250_000_000) {
    annualTax = 60_000_000 * 0.05 + (annualGross - 60_000_000) * 0.15
  } else if (annualGross <= 500_000_000) {
    annualTax = 60_000_000 * 0.05 + 190_000_000 * 0.15 + (annualGross - 250_000_000) * 0.25
  } else {
    annualTax = 60_000_000 * 0.05 + 190_000_000 * 0.15 + 250_000_000 * 0.25 + (annualGross - 500_000_000) * 0.30
  }

  // Return monthly portion
  return Math.round(annualTax / 12)
}

/**
 * Save PIR history for audit trail.
 * Upserts record per period+unit combination.
 */
async function savePIRHistory(
  supabase: any,
  period: string,
  unitId: string,
  unitName: string,
  netPoolAmount: number,
  proportionPercentage: number,
  allocatedForUnit: number,
  totalSkorKolektif: number,
  pirValue: number,
  employeeCount: number
) {
  try {
    const { error } = await supabase
      .from('t_history_pir')
      .upsert(
        {
          period,
          unit_id: unitId,
          unit_name: unitName,
          net_pool_amount: netPoolAmount,
          proportion_percentage: proportionPercentage,
          allocated_for_unit: allocatedForUnit,
          total_skor_kolektif: totalSkorKolektif,
          pir_value: pirValue,
          employee_count: employeeCount,
        },
        { onConflict: 'period,unit_id' }
      )
    if (error) console.error('Failed to save PIR history:', error.message)
  } catch (err: any) {
    console.error('PIR history save error:', err.message)
  }
}

/**
 * Generate reports based on type and period
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.7, 12.8
 */
export async function POST(request: NextRequest) {
  try {
    const { reportType, period, unitId, employeeId, detailLevel } = await request.json()

    if (!reportType || !period) {
      return NextResponse.json(
        { error: 'Report type and period are required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    let data: any[] = []

    switch (reportType) {
      case 'incentive':
        data = await generateIncentiveReport(supabase, period, unitId, employeeId)
        break
      case 'kpi-achievement':
        data = await generateKPIAchievementReport(supabase, period, unitId, employeeId, detailLevel)
        break
      case 'unit-comparison':
        data = await generateUnitComparisonReport(supabase, period, unitId)
        break
      case 'employee-slip':
        data = await generateEmployeeSlipReport(supabase, period, unitId, employeeId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    // Check if data is empty (Requirement 12.7)
    if (data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: `No data available for the selected period`,
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Generate Incentive Report
 * Uses PIR (Poin Indeks Rupiah) formula:
 * PIR = (net_pool × proportion_unit%) / Total_Skor_Kolektif_Unit
 * Bruto = Skor_Individu × PIR
 * Netto = Bruto - PPh21
 */
async function generateIncentiveReport(supabase: any, period: string, unitId?: string, employeeId?: string) {
  // 1. Get Pool
  const { data: poolData, error: poolError } = await supabase
    .from('t_pool')
    .select('net_pool')
    .eq('period', period)
    .maybeSingle()

  if (poolError) {
    console.error('Error fetching pool data:', poolError)
  }

  const netPool = poolData?.net_pool || 0

  // 2. Get ALL active employees with their units (needed for unit-level total score)
  const { data: allEmployees, error: allEmpError } = await supabase
    .from('m_employees')
    .select(`
      *,
      m_units (
        id,
        name,
        proportion_percentage,
        remuneration_style
      )
    `)
    .eq('is_active', true)

  if (allEmpError) {
    console.error('Error fetching employees:', allEmpError)
    throw new Error('Failed to fetch employee data')
  }

  // 3. Get ALL assessments for the period (needed for total score per unit)
  const { data: allAssessments, error: assError } = await supabase
    .from('t_kpi_assessments')
    .select(`
      employee_id,
      score,
      weight_percentage,
      achievement_percentage,
      realization_value,
      target_value,
      m_kpi_indicators!inner (
        m_kpi_categories!inner (
          category,
          weight_percentage
        )
      )
    `)
    .eq('period', period)

  if (assError) {
    console.error('Error fetching assessments:', assError)
    throw new Error('Failed to fetch assessment data')
  }

  if (!allEmployees) return []

  // --- Helper: Calculate total score for an employee ---
  const calcEmployeeTotalScore = (empId: string) => {
    const empAssessments = allAssessments?.filter((a: any) => a.employee_id === empId) || []

    const calcCategoryScore = (categoryName: string) => {
      const catAssessments = empAssessments.filter((a: any) => a.m_kpi_indicators?.m_kpi_categories?.category === categoryName)
      if (catAssessments.length === 0) return 0

      const categoryWeight = parseFloat(catAssessments[0].m_kpi_indicators.m_kpi_categories.weight_percentage) || 0

      let totalRealisasi = 0
      let totalTarget = 0

      for (const a of catAssessments) {
        const indWeight = parseFloat(a.weight_percentage) || 0
        const indRealisasi = parseFloat(a.realization_value) || 0
        const indTarget = parseFloat(a.target_value) || 100

        totalRealisasi += indRealisasi * (indWeight / 100)
        totalTarget += indTarget * (indWeight / 100)
      }

      if (totalTarget > 0) {
        return (totalRealisasi / totalTarget) * categoryWeight
      }
      return 0
    }

    const p1 = calcCategoryScore('P1')
    const p2 = calcCategoryScore('P2')
    const p3 = calcCategoryScore('P3')
    return { p1, p2, p3, total: p1 + p2 + p3, count: empAssessments.length }
  }

  // --- First pass: calculate ALL employee scores and unit totals ---
  const employeeScoresMap = new Map<string, { emp: any; p1: number; p2: number; p3: number; total: number; count: number }>()
  const unitTotalScoresMap = new Map<string, number>()
  const unitEmployeeCountMap = new Map<string, number>()

  for (const emp of allEmployees) {
    if (!emp.m_units) continue
    const uId = Array.isArray(emp.m_units) ? emp.m_units[0]?.id : emp.m_units.id
    const scores = calcEmployeeTotalScore(emp.id)

    employeeScoresMap.set(emp.id, { emp, ...scores })

    unitTotalScoresMap.set(uId, (unitTotalScoresMap.get(uId) || 0) + scores.total)
    unitEmployeeCountMap.set(uId, (unitEmployeeCountMap.get(uId) || 0) + 1)
  }

  // --- Calculate PIR per unit and save audit trail ---
  const unitPIRMap = new Map<string, number>()

  for (const emp of allEmployees) {
    if (!emp.m_units) continue
    const unitData = Array.isArray(emp.m_units) ? emp.m_units[0] : emp.m_units
    const uId = unitData?.id
    if (!uId || unitPIRMap.has(uId)) continue

    // Determine Style
    const style = unitData?.remuneration_style || 'score_based'
    const unitProp = parseFloat(unitData?.proportion_percentage || '0')
    const unitName = unitData?.name || '-'
    const totalSkorUnit = unitTotalScoresMap.get(uId) || 0
    const empCount = unitEmployeeCountMap.get(uId) || 0
    const allocatedForUnit = netPool * (unitProp / 100)

    let pir = 0
    if (style === 'activity_based_pir') {
      // MEDIS Style PIR Calculation: (Allocated - Aggregate Guarantee Fees) / Total Activity Index Points
      const { data: masterDocs } = await supabase
        .from('remunerasi_master_dokter')
        .select('pagu_guarantee_fee')
      // Ideally we filter by employees in this unit

      const totalGuaranteeFee = masterDocs?.reduce((acc: number, d: any) => acc + Number(d.pagu_guarantee_fee), 0) || 0
      const sisaPaguMedis = allocatedForUnit - totalGuaranteeFee
      pir = totalSkorUnit > 0 ? sisaPaguMedis / totalSkorUnit : 0
    } else {
      // Standard PIR: allocated / Total Skor
      pir = totalSkorUnit > 0 ? allocatedForUnit / totalSkorUnit : 0
    }

    unitPIRMap.set(uId, pir)

    // Save audit trail (using original field names)
    await savePIRHistory(
      supabase, period, uId, unitName,
      netPool, unitProp, allocatedForUnit,
      totalSkorUnit, pir, empCount
    )
  }

  // --- Second pass: Calculate Gross/Net incentive per employee ---
  const report = []

  // Determine which employees to include in the report
  const reportEmployeeIds = new Set<string>()
  for (const emp of allEmployees) {
    const matchUnit = !unitId || unitId === 'all' || emp.unit_id === unitId
    const matchEmp = !employeeId || employeeId === 'all' || emp.id === employeeId
    if (matchUnit && matchEmp) {
      reportEmployeeIds.add(emp.id)
    }
  }

  for (const [empId, data] of employeeScoresMap.entries()) {
    if (!reportEmployeeIds.has(empId)) continue

    const { emp, p1, p2, p3, total: totalScore, count: empAssessmentsCount } = data

    if (totalScore === 0 && empAssessmentsCount === 0) continue

    const unitData = Array.isArray(emp.m_units) ? emp.m_units[0] : emp.m_units
    const uId = unitData?.id
    const unitName = unitData?.name || '-'
    const unitProp = parseFloat(unitData?.proportion_percentage || '0')
    const pir = uId ? (unitPIRMap.get(uId) || 0) : 0
    const totalSkorUnit = uId ? (unitTotalScoresMap.get(uId) || 0) : 0

    // Insentif Bruto calculation logic
    const style = unitData?.remuneration_style || 'score_based'
    let grossIncentive = totalScore * pir

    if (style === 'activity_based_pir') {
      // For doctors, add Guarantee Fee (Guarantee Fee + Indexed Score Portion)
      const { data: doctorMaster } = await supabase
        .from('remunerasi_master_dokter')
        .select('pagu_guarantee_fee')
        .eq('employee_id', empId)
        .eq('periode_id', period)
        .maybeSingle()

      const guaranteeFee = Number(doctorMaster?.pagu_guarantee_fee || 0)
      grossIncentive += guaranteeFee
    }

    // PPh 21
    const taxAmount = calculatePPh21(grossIncentive, emp.employee_status, emp.tax_type)

    // Insentif Netto = Bruto - Pajak
    const netIncentive = grossIncentive - taxAmount

    const mappedNik = emp.nik || emp.NIK || '-'
    const mappedBankName = emp.bank_name || emp.BANK_NAME || emp.nama_bank || '-'
    const mappedBankAccount = emp.bank_account_number || emp.BANK_ACCOUNT_NUMBER || emp.nomor_rekening || '-'
    const mappedBankHolder = emp.bank_account_name || emp.BANK_ACCOUNT_NAME || emp.bank_account_holder || emp.full_name || '-'

    report.push({
      employee_code: emp.employee_code || '-',
      nik: mappedNik,
      employee_name: emp.full_name,
      unit: unitName,
      bank_name: mappedBankName,
      bank_account_number: mappedBankAccount,
      bank_account_holder: mappedBankHolder,
      tax_status: emp.tax_status || 'Non-PKP',
      employee_status: emp.employee_status || '-',
      tax_type: emp.tax_type || '-',
      p1_score: p1.toFixed(2),
      p2_score: p2.toFixed(2),
      p3_score: p3.toFixed(2),
      total_score: totalScore.toFixed(2),
      pir_value: pir.toFixed(2),
      total_skor_unit: totalSkorUnit.toFixed(2),
      unit_proportion: unitProp.toFixed(2),
      gross_incentive: grossIncentive.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      net_incentive: netIncentive.toFixed(2),
    })
  }

  return report
}

/**
 * Generate KPI Achievement Report
 * Averages out achievement per indicator across all employees in the period.
 */
async function generateKPIAchievementReport(supabase: any, period: string, unitId?: string, employeeId?: string, detailLevel?: string) {
  // Fetch Assessment Data
  let query = supabase
    .from('t_kpi_assessments')
    .select(`
      realization_value,
      target_value,
      achievement_percentage,
      employee_id,
      m_employees!t_kpi_assessments_employee_id_fkey (
        id,
        full_name,
        nik,
        m_units (
          name
        )
      ),
      m_kpi_indicators!inner (
        id,
        name,
        target_value,
        weight_percentage,
        m_kpi_categories (
          category
        )
      )
    `)
    .eq('period', period)

  if (unitId || employeeId) {
    const { data: emps } = await supabase
      .from('m_employees')
      .select('id')
      .match({
        ...(unitId && unitId !== 'all' && { unit_id: unitId }),
        ...(employeeId && employeeId !== 'all' && { id: employeeId })
      })

    const empIds = emps?.map((e: any) => e.id) || []
    if (empIds.length > 0) {
      query = query.in('employee_id', empIds)
    } else {
      // no matching employees, return empty array
      return []
    }
  }

  const { data: assessments, error: assError } = await query

  if (assError) throw assError

  // Merge Data
  const mergedData = new Map()

  assessments?.forEach((row: any) => {
    const indicatorId = row.m_kpi_indicators.id
    const empId = row.employee_id

    // Group by employee if detailed or employee elected
    const key = (detailLevel === 'detail' || (employeeId && employeeId !== 'all'))
      ? `${indicatorId}_${empId}`
      : indicatorId;

    const existing = mergedData.get(key)
    const empRecord = Array.isArray(row.m_employees) ? row.m_employees[0] : row.m_employees
    const empName = empRecord?.full_name || '-'
    const unitData = Array.isArray(empRecord?.m_units) ? empRecord?.m_units[0] : empRecord?.m_units
    const unitName = unitData?.name || '-'

    if (existing) {
      existing.count++
      existing.sum_realization += Number(row.realization_value || 0)
      existing.sum_target_value += Number(row.target_value || row.m_kpi_indicators.target_value || 0)
    } else {
      mergedData.set(key, {
        category: row.m_kpi_indicators.m_kpi_categories?.category || '-',
        indicator_name: row.m_kpi_indicators.name,
        weight: row.m_kpi_indicators.weight_percentage,
        employee_name: empName,
        unit_name: unitName,
        count: 1,
        sum_realization: Number(row.realization_value || 0),
        sum_target_value: Number(row.target_value || row.m_kpi_indicators.target_value || 0),
      })
    }
  })

  // Format array for report
  const reportArray = Array.from(mergedData.values()).map(item => {
    const realization = Number((item.sum_realization / item.count).toFixed(2));
    const target = Number((item.sum_target_value / item.count).toFixed(2));
    const achievement_percentage = target > 0 ? (realization / target) * 100 : 0;

    let score = (achievement_percentage / 100) * item.weight;

    const gap = realization - target;

    return {
      category: item.category,
      indicator_name: item.indicator_name,
      target_value: target.toFixed(2),
      weight: item.weight,
      employee_name: item.employee_name,
      unit_name: item.unit_name,
      realization_value: realization.toFixed(2),
      gap: gap.toFixed(2),
      achievement_percentage: achievement_percentage.toFixed(2),
      score: score.toFixed(2)
    };
  })

  // Sort by Category (P1, P2, P3) then by Indicator
  reportArray.sort((a, b) => {
    if (a.category === b.category) {
      return a.indicator_name.localeCompare(b.indicator_name);
    }
    return (a.category || '').localeCompare(b.category || '');
  });

  return reportArray
}

/**
 * Generate Unit Comparison Report
 * Uses the dynamically calculated incentive report data to aggregate by unit.
 */
async function generateUnitComparisonReport(supabase: any, period: string, unitId?: string) {
  // Reuse the dynamic incentive generation logic
  const topLevelData = await generateIncentiveReport(supabase, period, unitId)

  // Aggregate by unit
  const unitMap = new Map()

  topLevelData.forEach(row => {
    const uName = row.unit
    if (!unitMap.has(uName)) {
      unitMap.set(uName, {
        unit_name: uName,
        total_score_sum: 0,
        total_incentive_sum: 0,
        employee_count: 0
      })
    }

    const u = unitMap.get(uName)
    u.total_score_sum += parseFloat(row.total_score || '0')
    u.total_incentive_sum += parseFloat(row.net_incentive || '0')
    u.employee_count++
  })

  // Format Array
  return Array.from(unitMap.values()).map(u => ({
    unit_name: u.unit_name,
    average_score: u.employee_count > 0 ? (u.total_score_sum / u.employee_count).toFixed(2) : '0.00',
    total_incentive: u.total_incentive_sum.toFixed(2),
    employee_count: u.employee_count
  }))
}

/**
 * Generate Employee Slip Report
 * Dynamically calculating P1/P2/P3 breakdown and merging with incentive data.
 */
async function generateEmployeeSlipReport(supabase: any, period: string, unitId?: string, employeeId?: string) {
  // Reuse the dynamic total calculations
  const topLevelData = await generateIncentiveReport(supabase, period, unitId, employeeId)

  // Fetch all assessments for this period to do the categorical breakdown
  const { data: assessments } = await supabase
    .from('t_kpi_assessments')
    .select(`
      employee_id,
      realization_value,
      target_value,
      achievement_percentage,
      score,
      m_kpi_indicators!inner (
        name,
        target_value,
        weight_percentage,
        m_kpi_categories!inner (
          category
        )
      )
    `)
    .eq('period', period)

  if (!assessments) return []

  const results = []

  // Create employee map for matching
  let empQuery = supabase.from('m_employees').select('*')
  if (unitId && unitId !== 'all') empQuery = empQuery.eq('unit_id', unitId)
  if (employeeId && employeeId !== 'all') empQuery = empQuery.eq('id', employeeId)

  const { data: employees } = await empQuery
  const empMap = new Map()
  employees?.forEach((e: any) => empMap.set(e.full_name, e))

  for (const row of topLevelData) {
    const empRecord = empMap.get(row.employee_name)
    const empId = empRecord?.id
    const empAssessments = assessments.filter((a: any) => a.employee_id === empId)

    const p1Indicators = empAssessments.filter((i: any) => i.m_kpi_indicators.m_kpi_categories.category === 'P1')
    const p2Indicators = empAssessments.filter((i: any) => i.m_kpi_indicators.m_kpi_categories.category === 'P2')
    const p3Indicators = empAssessments.filter((i: any) => i.m_kpi_indicators.m_kpi_categories.category === 'P3')

    const calcSum = (arr: any[]) => arr.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0)

    const mapIndicator = (i: any) => {
      const indWeight = parseFloat(i.m_kpi_indicators.weight_percentage) || 0
      const achieve = parseFloat(i.achievement_percentage) || 0
      const targetValue = parseFloat(i.target_value) || parseFloat(i.m_kpi_indicators.target_value) || 100

      const real = parseFloat(i.realization_value) || 0
      const indRealisasiWeight = real * (indWeight / 100)
      const indTargetWeight = targetValue * (indWeight / 100)

      let evalScore = 0
      if (indTargetWeight > 0) {
        evalScore = (indRealisasiWeight / indTargetWeight) * indWeight
      }

      return {
        indicator: i.m_kpi_indicators.name,
        target: targetValue.toFixed(2), // Real target score
        weight: indWeight + '%',
        achievement: achieve.toFixed(2) + '%',
        score: evalScore.toFixed(2),
      }
    }

    const mappedNik = empRecord?.nik || empRecord?.NIK || row.nik || '-'
    const mappedBankName = empRecord?.bank_name || empRecord?.BANK_NAME || empRecord?.nama_bank || row.bank_name || '-'
    const mappedBankAccount = empRecord?.bank_account_number || empRecord?.BANK_ACCOUNT_NUMBER || empRecord?.nomor_rekening || row.bank_account_number || '-'
    const mappedBankHolder = empRecord?.bank_account_name || empRecord?.BANK_ACCOUNT_NAME || empRecord?.bank_account_holder || row.bank_account_holder || empRecord?.full_name || '-'

    results.push({
      employee_code: row.employee_code || empRecord?.employee_code || '-',
      nik: mappedNik,
      employee_name: row.employee_name,
      unit: row.unit || '-',
      bank_name: mappedBankName,
      bank_account_number: mappedBankAccount,
      bank_account_holder: mappedBankHolder,
      tax_status: row.tax_status || empRecord?.tax_status || 'Non-PKP',
      employee_status: row.employee_status || empRecord?.employee_status || '-',
      tax_type: row.tax_type || empRecord?.tax_type || '-',
      p1_score: parseFloat(String(row.p1_score || '0')).toFixed(2),
      p1_weighted: parseFloat(String(row.p1_score || '0')).toFixed(2),
      p1_breakdown: p1Indicators.map(mapIndicator),
      p2_score: parseFloat(String(row.p2_score || '0')).toFixed(2),
      p2_weighted: parseFloat(String(row.p2_score || '0')).toFixed(2),
      p2_breakdown: p2Indicators.map(mapIndicator),
      p3_score: parseFloat(String(row.p3_score || '0')).toFixed(2),
      p3_weighted: parseFloat(String(row.p3_score || '0')).toFixed(2),
      p3_breakdown: p3Indicators.map(mapIndicator),
      total_score: row.total_score || '0.00',
      pir_value: row.pir_value || '0.00',
      total_skor_unit: row.total_skor_unit || '0.00',
      unit_proportion: row.unit_proportion || '0.00',
      gross_incentive: parseFloat(row.gross_incentive).toLocaleString('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      tax_amount: parseFloat(row.tax_amount).toLocaleString('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      net_incentive: parseFloat(row.net_incentive).toLocaleString('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    })
  }

  return results
}
