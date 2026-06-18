import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface DashboardStats {
  totalEmployees: number
  totalUnits: number
  avgScore: number
  completionRate: number
  trends: {
    employees: number
    score: number
    completion: number
  }
}

export interface TopPerformer {
  id: string
  name: string
  unit: string
  score: number
  rank: number
}

export interface UnitPerformance {
  id: string
  name: string
  employeeCount: number
  avgScore: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  status: 'excellent' | 'good' | 'average' | 'poor'
}

export interface PerformanceData {
  month: string
  p1: number
  p2: number
  p3: number
  total: number
}

export interface Activity {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  description: string
  timestamp: string
}

export class DashboardService {
  private static async getCurrentPeriod(supabase: any): Promise<string> {
    const { data } = await supabase
      .from('t_kpi_assessments')
      .select('period')
      .order('period', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data?.period || new Date().toISOString().slice(0, 7)
  }

  private static async getResolvedPeriods(supabase: any, period?: string, year?: string): Promise<string[]> {
    if (!period || period === 'month') {
      const latest = await this.getCurrentPeriod(supabase);
      return [latest];
    }

    const targetYear = year || new Date().getFullYear().toString();

    if (period.startsWith('M-')) {
      const month = period.split('-')[1];
      return [`${targetYear}-${month}`];
    }

    if (period.startsWith('Q-')) {
      const q = parseInt(period.split('-')[1]);
      const months = [];
      for (let i = (q - 1) * 3 + 1; i <= q * 3; i++) {
        months.push(`${targetYear}-${String(i).padStart(2, '0')}`);
      }
      return months;
    }

    if (period.startsWith('S-')) {
      const s = parseInt(period.split('-')[1]);
      const months = [];
      for (let i = (s - 1) * 6 + 1; i <= s * 6; i++) {
        months.push(`${targetYear}-${String(i).padStart(2, '0')}`);
      }
      return months;
    }

    if (period === 'full-year') {
      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(`${targetYear}-${String(i).padStart(2, '0')}`);
      }
      return months;
    }

    return [await this.getCurrentPeriod(supabase)];
  }

  /**
   * Get dashboard statistics for superadmin - using direct queries
   */
  static async getSuperadminStats(unitId?: string, period?: string, year?: string): Promise<DashboardStats> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      // Get active non-admin employee IDs first to use as a filter
      const { data: activeEmps } = await supabase
        .from('m_employees')
        .select('id')
        .eq('is_active', true)
        .neq('role', 'superadmin')

      const activeEmpIds = activeEmps?.map(e => e.id) || []
      const totalActiveEmployees = activeEmpIds.length

      // Direct count of units excluding superadmin
      const { count: totalUnits } = await supabase
        .from('m_units')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .neq('code', 'superadmin')

      let assQuery = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', resolvedPeriods)
        .in('employee_id', activeEmpIds) // Filter only active non-admin employees

      let filteredActiveEmpIds = activeEmpIds
      if (unitId && unitId !== 'all') {
        const { data: unitEmps } = await supabase
          .from('m_employees')
          .select('id')
          .eq('unit_id', unitId)
          .eq('is_active', true)
          .neq('role', 'superadmin')

        filteredActiveEmpIds = unitEmps?.map(e => e.id) || []
        assQuery = assQuery.in('employee_id', filteredActiveEmpIds)
      }

      const totalDisplayEmployees = filteredActiveEmpIds.length

      const { data: assessments, error: assError } = await assQuery
      if (assError) throw assError

      // Group assessments by employee for calculation
      const empDataMap = new Map<string, { [key: string]: any[] }>()
      for (const a of assessments || []) {
        const empId = a.employee_id
        if (!empDataMap.has(empId)) {
          empDataMap.set(empId, { P1: [], P2: [], P3: [] })
        }

        const indicator: any = Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators
        const categoryObj = indicator?.m_kpi_categories
        const catName = Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category

        if (catName && empDataMap.get(empId)![catName]) {
          empDataMap.get(empId)![catName].push(a)
        }
      }

      const calculateScore = (empId: string) => {
        const cats = empDataMap.get(empId)
        if (!cats) return 0

        let totalScore = 0
        for (const catName of ['P1', 'P2', 'P3']) {
          const catAssessments = cats[catName]
          if (catAssessments.length === 0) continue

          const firstAss: any = catAssessments[0]
          const indicator = (Array.isArray(firstAss.m_kpi_indicators) ? firstAss.m_kpi_indicators[0] : firstAss.m_kpi_indicators) as any
          const categoryObj = indicator?.m_kpi_categories as any
          const categoryWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0

          let totalRealisasi = 0
          let totalTarget = 0
          for (const a of catAssessments) {
            const indWeight = parseFloat(a.weight_percentage) || 0
            totalRealisasi += (parseFloat(a.realization_value) || 0) * (indWeight / 100)
            totalTarget += (parseFloat(a.target_value) || 100) * (indWeight / 100)
          }

          if (totalTarget > 0) {
            totalScore += (totalRealisasi / totalTarget) * categoryWeight
          }
        }
        return totalScore
      }

      const assessedEmployeeIds = Array.from(empDataMap.keys())
      const totalAssessed = assessedEmployeeIds.length

      // Calculate average score - across only assessed employees for a true performance average
      const assessedScores = assessedEmployeeIds.map(empId => calculateScore(empId))
      const avgScore = totalAssessed > 0
        ? assessedScores.reduce((sum, score) => sum + score, 0) / totalAssessed
        : 0

      const completionRate = totalDisplayEmployees > 0
        ? (totalAssessed / totalDisplayEmployees) * 100
        : 0

      return {
        totalEmployees: totalDisplayEmployees,
        totalUnits: totalUnits || 0,
        avgScore: Math.round(avgScore * 100) / 100,
        completionRate: Math.round(completionRate * 10) / 10,
        trends: {
          employees: 0,
          score: 0,
          completion: 0
        }
      }
    } catch (error) {
      console.error('Error in getSuperadminStats:', error)
      return this.getFallbackStats()
    }
  }

  /**
   * Fallback stats when queries fail
   */
  private static getFallbackStats(): DashboardStats {
    return {
      totalEmployees: 0,
      totalUnits: 0,
      avgScore: 0,
      completionRate: 0,
      trends: {
        employees: 0,
        score: 0,
        completion: 0
      }
    }
  }

  /**
   * Get top performers - using direct queries with joins
   */
  static async getTopPerformers(limit: number = 5, unitId?: string, period?: string, year?: string): Promise<TopPerformer[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      // Get assessments for current period with employee and unit info
      let query = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          m_employees!t_kpi_assessments_employee_id_fkey (
            id, full_name, is_active,
            unit_id,
            m_units!m_employees_unit_id_fkey ( name )
          ),
          m_kpi_indicators!inner (
            m_kpi_categories!inner (
              category,
              weight_percentage
            )
          )
        `)
        .neq('m_employees.role', 'superadmin')
        .in('period', resolvedPeriods)

      if (unitId) {
        const { data: emps } = await supabase.from('m_employees').select('id').eq('unit_id', unitId)
        const empIds = emps?.map((e: any) => e.id) || []
        query = query.in('employee_id', empIds)
      }

      const { data: assessments, error } = await query

      if (error) {
        console.error('Error fetching top performers:', error.message)
        return []
      }

      // Efficiently group assessments by employee and category in one pass
      const empDataMap = new Map<string, { info: any, cats: { [key: string]: any[] } }>()
      for (const a of (assessments || [])) {
        const emp = a.m_employees as any
        if (!emp || !emp.is_active) continue

        const empId = emp.id
        if (!empDataMap.has(empId)) {
          empDataMap.set(empId, {
            info: {
              name: emp.full_name || 'Unknown',
              unit: emp.m_units?.name || 'Unknown'
            },
            cats: { P1: [], P2: [], P3: [] }
          })
        }

        const indicator: any = Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators
        const categoryObj = indicator?.m_kpi_categories
        const catName = Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category

        if (catName && empDataMap.get(empId)!.cats[catName]) {
          empDataMap.get(empId)!.cats[catName].push(a)
        }
      }

      // Calculate total score per employee
      const employeeScores = Array.from(empDataMap.entries()).map(([empId, data]) => {
        let totalScore = 0
        for (const catName of ['P1', 'P2', 'P3']) {
          const catAssessments = data.cats[catName]
          if (catAssessments.length === 0) continue

          const firstAss: any = catAssessments[0]
          const indicator = (Array.isArray(firstAss.m_kpi_indicators) ? firstAss.m_kpi_indicators[0] : firstAss.m_kpi_indicators) as any
          const categoryObj = indicator?.m_kpi_categories as any
          const categoryWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0

          let totalR = 0, totalT = 0
          for (const a of catAssessments) {
            const w = parseFloat((a as any).weight_percentage) || 0
            totalR += (parseFloat((a as any).realization_value) || 0) * (w / 100)
            totalT += (parseFloat((a as any).target_value) || 100) * (w / 100)
          }
          if (totalT > 0) totalScore += (totalR / totalT) * categoryWeight
        }

        return {
          id: empId,
          name: data.info.name,
          unit: data.info.unit,
          score: Math.round(totalScore * 100) / 100
        }
      })

      // Sort and format for return
      const sorted = employeeScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((p, i) => ({
          ...p,
          rank: i + 1
        }))

      return sorted
    } catch (error) {
      console.error('Error in getTopPerformers:', error)
      return []
    }
  }

  /**
   * Get worst performers - using direct queries with joins
   */
  static async getWorstPerformers(limit: number = 5, unitId?: string, period?: string, year?: string): Promise<TopPerformer[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      // Get assessments for current period
      let query = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          m_employees!t_kpi_assessments_employee_id_fkey (
            id, full_name, is_active,
            unit_id,
            m_units!m_employees_unit_id_fkey ( name )
          ),
          m_kpi_indicators!inner (
            m_kpi_categories!inner (
              category,
              weight_percentage
            )
          )
        `)
        .neq('m_employees.role', 'superadmin')
        .in('period', resolvedPeriods)

      if (unitId) {
        const { data: emps } = await supabase.from('m_employees').select('id').eq('unit_id', unitId)
        const empIds = emps?.map((e: any) => e.id) || []
        query = query.in('employee_id', empIds)
      }

      const { data: assessments, error } = await query

      if (error) {
        console.error('Error fetching worst performers:', error.message)
        return []
      }

      // Efficiently group assessments by employee and category in one pass
      const empDataMap = new Map<string, { info: any, cats: { [key: string]: any[] } }>()
      for (const a of (assessments || [])) {
        const emp = a.m_employees as any
        if (!emp || !emp.is_active) continue

        const empId = emp.id
        if (!empDataMap.has(empId)) {
          empDataMap.set(empId, {
            info: {
              name: emp.full_name || 'Unknown',
              unit: emp.m_units?.name || 'Unknown'
            },
            cats: { P1: [], P2: [], P3: [] }
          })
        }

        const indicator: any = Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators
        const categoryObj = indicator?.m_kpi_categories
        const catName = Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category

        if (catName && empDataMap.get(empId)!.cats[catName]) {
          empDataMap.get(empId)!.cats[catName].push(a)
        }
      }

      // Calculate total score per employee
      const employeeScores = Array.from(empDataMap.entries()).map(([empId, data]) => {
        let totalScore = 0
        for (const catName of ['P1', 'P2', 'P3']) {
          const catAssessments = data.cats[catName]
          if (catAssessments.length === 0) continue

          const firstAss: any = catAssessments[0]
          const indicator = (Array.isArray(firstAss.m_kpi_indicators) ? firstAss.m_kpi_indicators[0] : firstAss.m_kpi_indicators) as any
          const categoryObj = indicator?.m_kpi_categories as any
          const categoryWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0

          let totalR = 0, totalT = 0
          for (const a of catAssessments) {
            const w = parseFloat((a as any).weight_percentage) || 0
            totalR += (parseFloat((a as any).realization_value) || 0) * (w / 100)
            totalT += (parseFloat((a as any).target_value) || 100) * (w / 100)
          }
          if (totalT > 0) totalScore += (totalR / totalT) * categoryWeight
        }

        return {
          id: empId,
          name: data.info.name,
          unit: data.info.unit,
          score: Math.round(totalScore * 100) / 100
        }
      })

      // Sort and format for return (worst first)
      const sorted = employeeScores
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((p, i) => ({
          ...p,
          rank: i + 1
        }))

      return sorted
    } catch (error) {
      console.error('Error in getWorstPerformers:', error)
      return []
    }
  }
  static async getUnitPerformance(period?: string, year?: string): Promise<UnitPerformance[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      // Get all active units with their employees
      const { data: units, error } = await supabase
        .from('m_units')
        .select(`
          id, name,
          m_employees!m_employees_unit_id_fkey ( id, is_active, role )
        `)
        .eq('is_active', true)
        .neq('code', 'superadmin')
        .order('name')

      if (error) {
        console.error('Error fetching units:', error.message)
        return []
      }

      // Get all assessments for current period
      const { data: assessments } = await supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          m_kpi_indicators!inner (
            m_kpi_categories!inner (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', resolvedPeriods)

      // Build a map of employee_id -> assessments
      const employeeAssessedMap = new Map<string, any[]>()
      for (const a of (assessments || [])) {
        if (!employeeAssessedMap.has(a.employee_id)) {
          employeeAssessedMap.set(a.employee_id, [])
        }
        employeeAssessedMap.get(a.employee_id)!.push(a)
      }

      const calcEmployeeTotalScore = (empId: string) => {
        const empAssessments = employeeAssessedMap.get(empId) || []
        if (empAssessments.length === 0) return 0

        const calcCategoryScore = (categoryName: string) => {
          const catAssessments = empAssessments.filter((a: any) => {
            const indicator = Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators;
            const categoryData = indicator?.m_kpi_categories;
            const catName = Array.isArray(categoryData) ? categoryData[0]?.category : categoryData?.category;
            return catName === categoryName;
          })
          if (catAssessments.length === 0) return 0

          const firstAss = catAssessments[0];
          const indicator = Array.isArray(firstAss.m_kpi_indicators) ? firstAss.m_kpi_indicators[0] : firstAss.m_kpi_indicators;
          const categoryData = indicator?.m_kpi_categories;
          const categoryWeight = parseFloat(Array.isArray(categoryData) ? categoryData[0]?.weight_percentage : categoryData?.weight_percentage) || 0

          let totalRealisasi = 0
          let totalTarget = 0
          for (const a of catAssessments) {
            const indWeight = parseFloat(a.weight_percentage) || 0
            const indRealisasi = parseFloat(a.realization_value) || 0
            const indTarget = parseFloat(a.target_value) || 100
            totalRealisasi += indRealisasi * (indWeight / 100)
            totalTarget += indTarget * (indWeight / 100)
          }
          if (totalTarget > 0) return (totalRealisasi / totalTarget) * categoryWeight
          return 0
        }

        return calcCategoryScore('P1') + calcCategoryScore('P2') + calcCategoryScore('P3')
      }

      return (units || []).map(unit => {
        const employees = (unit.m_employees as any[]) || []
        const activeEmployees = employees.filter((e: any) => e.is_active && e.role !== 'superadmin')
        const employeeCount = activeEmployees.length

        // Calculate unit avg score from employee final scores
        let totalScore = 0
        let scoreCount = 0
        for (const emp of activeEmployees) {
          if (employeeAssessedMap.has(emp.id)) {
            totalScore += calcEmployeeTotalScore(emp.id)
            scoreCount += 1
          }
        }
        const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0

        const status = avgScore >= 90 ? 'excellent' :
          avgScore >= 80 ? 'good' :
            avgScore >= 70 ? 'average' : 'poor'

        return {
          id: unit.id,
          name: unit.name,
          employeeCount,
          avgScore: Math.round(avgScore * 100) / 100,
          trend: 'stable' as const,
          trendValue: 0,
          status: status as 'excellent' | 'good' | 'average' | 'poor'
        }
      })
    } catch (error) {
      console.error('Error in getUnitPerformance:', error)
      return []
    }
  }

  /**
   * Get performance trend data
   */
  static async getPerformanceTrend(months: number = 6, unitId?: string, period?: string, year?: string): Promise<PerformanceData[]> {
    const supabase = await createAdminClient()

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const data: PerformanceData[] = []

    const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)
    const lastPeriod = resolvedPeriods[resolvedPeriods.length - 1]
    const currentYear = parseInt(lastPeriod.slice(0, 4))
    const currentMonth = parseInt(lastPeriod.slice(5, 7)) - 1
    const endDate = new Date(currentYear, currentMonth, 1)

    // Fetch all assessments for the last 6 months in one query to optimize
    const periods: string[] = []
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1)
      periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }

    try {
      let q = supabase
        .from('t_kpi_assessments')
        .select(`
          period,
          employee_id,
          realization_value,
          target_value,
          weight_percentage,
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', periods)

      if (unitId && unitId !== 'all') {
        const { data: emps } = await supabase.from('m_employees').select('id').eq('unit_id', unitId)
        const empIds = emps?.map((e: any) => e.id) || []
        q = q.in('employee_id', empIds)
      }

      const { data: assessments, error } = await q
      if (error) throw error

      // Process month-by-month
      for (const periodStr of periods) {
        const monthIndex = parseInt(periodStr.slice(5, 7)) - 1
        const monthName = monthNames[monthIndex]

        const monthAss = (assessments || []).filter(a => a.period === periodStr)
        const empIds = Array.from(new Set(monthAss.map(a => a.employee_id)))

        let p1Sum = 0, p2Sum = 0, p3Sum = 0, totalSum = 0
        let empWithScoreCount = 0

        for (const empId of empIds) {
          const empAss = monthAss.filter(a => a.employee_id === empId)

          const calcCatContribution = (catName: string) => {
            const catAss = empAss.filter((a: any) => {
              const indicator: any = Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators
              const categoryObj = indicator?.m_kpi_categories
              const cat = Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category
              return cat === catName
            })

            if (catAss.length === 0) return 0

            const first: any = catAss[0]
            const indicator: any = Array.isArray(first.m_kpi_indicators) ? first.m_kpi_indicators[0] : first.m_kpi_indicators
            const categoryObj = indicator?.m_kpi_categories
            const catWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0

            let totalR = 0, totalT = 0
            for (const a of catAss) {
              const w = parseFloat((a as any).weight_percentage) || 0
              totalR += (parseFloat((a as any).realization_value) || 0) * (w / 100)
              totalT += (parseFloat((a as any).target_value) || 100) * (w / 100)
            }

            return totalT > 0 ? (totalR / totalT) * catWeight : 0
          }

          const empP1 = calcCatContribution('P1')
          const empP2 = calcCatContribution('P2')
          const empP3 = calcCatContribution('P3')

          p1Sum += empP1
          p2Sum += empP2
          p3Sum += empP3
          totalSum += (empP1 + empP2 + empP3)
          empWithScoreCount++
        }

        data.push({
          month: monthName,
          p1: empWithScoreCount > 0 ? Math.round((p1Sum / empWithScoreCount) * 10) / 10 : 0,
          p2: empWithScoreCount > 0 ? Math.round((p2Sum / empWithScoreCount) * 10) / 10 : 0,
          p3: empWithScoreCount > 0 ? Math.round((p3Sum / empWithScoreCount) * 10) / 10 : 0,
          total: empWithScoreCount > 0 ? Math.round((totalSum / empWithScoreCount) * 10) / 10 : 0
        })
      }
      return data
    } catch (error: any) {
      console.error('Error in getPerformanceTrend:', error)
      return []
    }
  }

  /**
   * Get recent activities
   */
  static async getRecentActivities(limit: number = 10): Promise<Activity[]> {
    const supabase = await createClient()

    try {
      const { data: audits, error } = await supabase
        .from('t_audit_log')
        .select('id, operation, table_name, details, timestamp')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching audit logs:', error)
        return []
      }

      if (!audits || audits.length === 0) return []

      return audits.map(audit => {
        let type: Activity['type'] = 'info'
        const operation = audit.operation?.toLowerCase() || ''

        if (operation.includes('delete')) type = 'error'
        else if (operation.includes('create') || operation.includes('insert')) type = 'success'
        else if (operation.includes('update')) type = 'warning'

        const tableName = audit.table_name || 'unknown'
        const actionText = `${audit.operation} ${tableName.replace('t_', '').replace('m_', '')}`

        return {
          id: audit.id,
          type,
          title: actionText,
          description: audit.details || 'No details',
          timestamp: new Date(audit.timestamp).toLocaleString('id-ID')
        }
      })
    } catch (error) {
      console.error('Exception in getRecentActivities:', error)
      return []
    }
  }

  /**
   * Get KPI distribution data
   */
  static async getKPIDistribution(unitId?: string, period?: string, year?: string) {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      let query = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          realization_value,
          target_value,
          weight_percentage,
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', resolvedPeriods)

      if (unitId) {
        const { data: emps } = await supabase.from('m_employees').select('id').eq('unit_id', unitId)
        const empIds = emps?.map((e: any) => e.id) || []
        query = query.in('employee_id', empIds)
      }

      const { data: assessments, error } = await query
      if (error) throw error

      const empIds = Array.from(new Set((assessments || []).map(a => a.employee_id)))
      let p1Sum = 0, p2Sum = 0, p3Sum = 0
      let empCount = 0

      // Efficiently group assessments by employee and category in one pass
      const empDataMap = new Map<string, { [key: string]: any[] }>()
      for (const a of (assessments || [])) {
        const empId = a.employee_id
        if (!empDataMap.has(empId)) {
          empDataMap.set(empId, { P1: [], P2: [], P3: [] })
        }

        const indicator: any = Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators
        const categoryObj = indicator?.m_kpi_categories
        const catName = Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category

        if (catName && empDataMap.get(empId)![catName]) {
          empDataMap.get(empId)![catName].push(a)
        }
      }

      for (const [empId, cats] of empDataMap.entries()) {
        const calcCatContrib = (catName: string) => {
          const catAss = cats[catName]
          if (catAss.length === 0) return 0

          const first = catAss[0]
          const indicator = (Array.isArray(first.m_kpi_indicators) ? first.m_kpi_indicators[0] : first.m_kpi_indicators) as any
          const categoryObj = indicator?.m_kpi_categories as any
          const catWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0

          let totalR = 0, totalT = 0
          for (const a of catAss) {
            const w = parseFloat((a as any).weight_percentage) || 0
            totalR += (parseFloat((a as any).realization_value) || 0) * (w / 100)
            totalT += (parseFloat((a as any).target_value) || 100) * (w / 100)
          }

          return totalT > 0 ? (totalR / totalT) * catWeight : 0
        }

        p1Sum += calcCatContrib('P1')
        p2Sum += calcCatContrib('P2')
        p3Sum += calcCatContrib('P3')
        empCount++
      }

      return [
        { name: 'P1 (Posisi)', value: empCount > 0 ? Math.round(p1Sum / empCount) : 0, color: '#3b82f6' },
        { name: 'P2 (Kinerja)', value: empCount > 0 ? Math.round(p2Sum / empCount) : 0, color: '#10b981' },
        { name: 'P3 (Potensi)', value: empCount > 0 ? Math.round(p3Sum / empCount) : 0, color: '#f59e0b' }
      ]
    } catch (error) {
      console.error('Error in getKPIDistribution:', error)
      return [
        { name: 'P1 (Posisi)', value: 0, color: '#3b82f6' },
        { name: 'P2 (Kinerja)', value: 0, color: '#10b981' },
        { name: 'P3 (Potensi)', value: 0, color: '#f59e0b' }
      ]
    }
  }
}
