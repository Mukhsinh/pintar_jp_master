import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DashboardService } from '@/lib/services/dashboard.service'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    // Get current user using getUser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get employee data
    const { data: employee } = await supabase
      .from('m_employees')
      .select('id, role, unit_id')
      .eq('user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const stats: any = {}

    // Superadmin stats - use optimized single query
    if (employee.role === 'superadmin') {
      try {
        // OPTIMIZED: Single aggregated query instead of multiple queries
        const { data: aggregatedStats } = await supabase
          .rpc('get_dashboard_aggregated_stats', {
            target_year: year,
            target_month: month
          })
          .single()

        if (aggregatedStats) {
          const statsData = aggregatedStats as any
          stats.totalUnits = statsData.total_units || 0
          stats.totalEmployees = statsData.total_employees || 0
          stats.totalUsers = statsData.total_employees || 0
          stats.avgScore = Math.round((statsData.avg_score || 0) * 100) / 100
          stats.completionRate = Math.round((statsData.completion_rate || 0) * 10) / 10
          stats.activePools = statsData.active_pools || 0
          stats.totalPoolAmount = statsData.total_pool_amount || 0
          stats.totalIndicators = statsData.total_indicators || 0
        } else {
          // Fallback to individual queries if RPC fails
          const dashboardStats = await DashboardService.getSuperadminStats()

          stats.totalUnits = dashboardStats.totalUnits
          stats.totalEmployees = dashboardStats.totalEmployees
          stats.totalUsers = dashboardStats.totalEmployees
          stats.avgScore = dashboardStats.avgScore
          stats.completionRate = dashboardStats.completionRate

          // Quick parallel queries for remaining data
          const [poolsResult, poolDataResult, indicatorsResult] = await Promise.allSettled([
            supabase
              .from('t_pools')
              .select('*', { count: 'exact', head: true })
              .eq('year', year)
              .eq('month', month),
            supabase
              .from('t_pools')
              .select('total_amount')
              .eq('year', year)
              .eq('month', month),
            supabase
              .from('m_kpi_indicators')
              .select('*', { count: 'exact', head: true })
          ])

          stats.activePools = poolsResult.status === 'fulfilled' ? (poolsResult.value.count || 0) : 0

          const totalPoolAmount = poolDataResult.status === 'fulfilled'
            ? (poolDataResult.value.data?.reduce((sum, pool) => sum + (pool.total_amount || 0), 0) || 0)
            : 0
          stats.totalPoolAmount = totalPoolAmount

          stats.totalIndicators = indicatorsResult.status === 'fulfilled' ? (indicatorsResult.value.count || 0) : 0
        }
      } catch (error) {
        console.error('Error fetching superadmin stats:', error)
        // Return minimal stats on error
        stats.totalUnits = 0
        stats.totalEmployees = 0
        stats.totalUsers = 0
        stats.avgScore = 0
        stats.completionRate = 0
        stats.activePools = 0
        stats.totalPoolAmount = 0
        stats.totalIndicators = 0
      }
    }

    // Unit Manager stats
    if (employee.role === 'unit_manager') {
      // Employees in unit
      const { count: unitEmployeesCount } = await supabase
        .from('m_employees')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', employee.unit_id)

      // Realizations this month
      const { count: realizationsCount } = await supabase
        .from('t_kpi_realizations')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', employee.unit_id)
        .eq('year', year)
        .eq('month', month)

      // Average score
      const { data: scoresData } = await supabase
        .from('t_kpi_realizations')
        .select('final_score')
        .eq('unit_id', employee.unit_id)
        .eq('year', year)
        .eq('month', month)

      const avgScore = scoresData && scoresData.length > 0
        ? scoresData.reduce((sum, r) => sum + (r.final_score || 0), 0) / scoresData.length
        : 0

      stats.unitEmployees = unitEmployeesCount || 0
      stats.realizationsCount = realizationsCount || 0
      stats.averageScore = avgScore
    }

    // Employee stats
    if (employee.role === 'employee') {
      // Personal realizations
      const { data: personalRealizations } = await supabase
        .from('t_kpi_realizations')
        .select('final_score, incentive_amount')
        .eq('employee_id', employee.id)
        .eq('year', year)
        .eq('month', month)
        .single()

      stats.personalScore = personalRealizations?.final_score || 0
      stats.incentiveAmount = personalRealizations?.incentive_amount || 0
    }

    const response = NextResponse.json(stats)

    // Add caching headers (cache for 2 minutes)
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=120')

    return response

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
