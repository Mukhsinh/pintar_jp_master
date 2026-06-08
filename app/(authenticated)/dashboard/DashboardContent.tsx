import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { StatCard } from '@/components/dashboard/StatCard'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'

// Lazy load heavy chart components
const PerformanceChart = dynamic(() => import('@/components/dashboard/PerformanceChart').then(mod => mod.PerformanceChart), {
  loading: () => <div className="h-[350px] w-full bg-gray-100 animate-pulse rounded-xl" />
})
const KPIDistributionChart = dynamic(() => import('@/components/dashboard/KPIDistributionChart').then(mod => mod.KPIDistributionChart), {
  loading: () => <div className="h-[350px] w-full bg-gray-100 animate-pulse rounded-xl" />
})

import { TopPerformers } from '@/components/dashboard/TopPerformers'
import { UnitPerformanceTable } from '@/components/dashboard/UnitPerformanceTable'
import { WorstPerformers } from '@/components/dashboard/WorstPerformers'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { DashboardService } from '@/lib/services/dashboard.service'

export async function DashboardContent({
  unitId,
  period,
  year
}: {
  unitId?: string,
  period?: string,
  year?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const employeeResult = await supabase
      .from('m_employees')
      .select(`
        id, 
        full_name, 
        role, 
        unit_id,
        m_units!m_employees_unit_id_fkey (
          name
        )
      `)
      .eq('user_id', user.id)
      .single()

    const { data: employee, error } = employeeResult

    if (error || !employee) {
      console.error('Employee fetch error:', error)
      redirect('/login?error=user_not_found')
    }

    // Handle m_units yang bisa berupa object atau array
    const unitData = employee.m_units as any
    const unitName = unitData?.name || 'Unit tidak diketahui'

    let units: any[] = []
    let stats
    let topPerformers: any[] = []
    let worstPerformers: any[] = []
    let unitPerformance: any[] = []
    let performanceTrend: any[] = []
    let kpiDistribution: any[] = []
    let recentActivities: any[] = []

    // Determine which unit ID to use for stats
    const effectiveUnitId = employee.role === 'unit_manager' ? employee.unit_id : unitId

    if (employee.role === 'superadmin' || employee.role === 'unit_manager') {
      try {
        if (employee.role === 'superadmin') {
          const { data: unitsData } = await supabase.from('m_units').select('id, name').order('name')
          units = unitsData || []
        }

        // Parallel data loading for dashboard
        const [
          dashboardStats,
          topPerformersData,
          worstPerformersData,
          performanceTrendData,
          kpiDistributionData,
        ] = await Promise.allSettled([
          DashboardService.getSuperadminStats(effectiveUnitId, period, year),
          DashboardService.getTopPerformers(5, effectiveUnitId, period, year),
          DashboardService.getWorstPerformers(5, effectiveUnitId, period, year),
          DashboardService.getPerformanceTrend(6, effectiveUnitId, period, year),
          DashboardService.getKPIDistribution(effectiveUnitId, period, year)
        ])

        // Process results with fallbacks
        stats = dashboardStats.status === 'fulfilled' ? dashboardStats.value : await DashboardService.getSuperadminStats(effectiveUnitId, period, year)
        topPerformers = topPerformersData.status === 'fulfilled' ? topPerformersData.value : []
        worstPerformers = worstPerformersData.status === 'fulfilled' ? worstPerformersData.value : []
        performanceTrend = performanceTrendData.status === 'fulfilled' ? performanceTrendData.value : []
        kpiDistribution = kpiDistributionData.status === 'fulfilled' ? kpiDistributionData.value : []

        if (employee.role === 'superadmin') {
          const unitPerformanceRes = await DashboardService.getUnitPerformance(period, year)
          unitPerformance = unitPerformanceRes
        }
      } catch (serviceError) {
        console.error('Dashboard service error:', serviceError)
        stats = {
          totalEmployees: 0,
          totalUnits: 0,
          avgScore: 0,
          completionRate: 0,
          trends: { employees: 0, score: 0, completion: 0 }
        }
      }
    } else {
      stats = {
        totalEmployees: 0,
        totalUnits: 0,
        avgScore: 0,
        completionRate: 0,
        trends: { employees: 0, score: 0, completion: 0 }
      }
    }

    return (
      <div className="w-full bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-base md:text-lg text-gray-600 font-medium">
              Selamat datang, <span className="text-blue-600 font-bold">{employee.full_name}</span> • {unitName}
            </p>
          </div>

          {employee.role === 'superadmin' && (
            <>
              <DashboardFilters
                showUnitFilter={true}
                showPeriodFilter={true}
                showExport={true}
                units={units}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                  title="Total Pegawai"
                  value={stats.totalEmployees}
                  description="Pegawai aktif"
                  iconName="Users"
                  trend={{ value: stats.trends.employees, isPositive: true }}
                />
                <StatCard
                  title="Total Unit"
                  value={stats.totalUnits}
                  description="Unit organisasi"
                  iconName="Building2"
                />
                <StatCard
                  title="Rata-rata Skor"
                  value={stats.avgScore.toFixed(2)}
                  description="Skor KPI keseluruhan"
                  iconName="TrendingUp"
                  trend={{ value: stats.trends.score, isPositive: true }}
                />
                <StatCard
                  title="Tingkat Penyelesaian"
                  value={`${stats.completionRate.toFixed(1)}%`}
                  description="Penilaian selesai"
                  iconName="CheckCircle"
                  trend={{ value: stats.trends.completion, isPositive: true }}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformanceChart
                  data={performanceTrend}
                  type="bar"
                  title="Tren Performa KPI"
                  description="Performa 6 bulan terakhir"
                />
                <KPIDistributionChart data={kpiDistribution} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <UnitPerformanceTable units={unitPerformance} />
                </div>
                <div className="space-y-6">
                  <TopPerformers performers={topPerformers} />
                  <WorstPerformers performers={worstPerformers} />
                </div>
              </div>

              <QuickActions role="superadmin" />
            </>
          )}

          {employee.role === 'unit_manager' && (
            <>
              <DashboardFilters
                showUnitFilter={false}
                showPeriodFilter={true}
                showExport={true}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <StatCard
                  title="Pegawai Unit"
                  value={stats.totalEmployees}
                  description="Total pegawai di unit Anda"
                  iconName="Users"
                  trend={{ value: stats.trends.employees, isPositive: true }}
                />
                <StatCard
                  title="Tingkat Penyelesaian"
                  value={`${stats.completionRate.toFixed(1)}%`}
                  description="Penilaian selesai"
                  iconName="CheckCircle"
                  trend={{ value: stats.trends.completion, isPositive: true }}
                />
                <StatCard
                  title="Skor Rata-rata Unit"
                  value={stats.avgScore.toFixed(2)}
                  description="Performa unit Anda"
                  iconName="Award"
                  trend={{ value: stats.trends.score, isPositive: true }}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformanceChart
                  data={performanceTrend}
                  type="bar"
                  title="Tren Performa Unit"
                  description="Performa 6 bulan terakhir"
                />
                <KPIDistributionChart data={kpiDistribution} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <TopPerformers performers={topPerformers} />
                </div>
                <div className="lg:col-span-1">
                  <WorstPerformers performers={worstPerformers} />
                </div>
              </div>

              <QuickActions role="unit_manager" />
            </>
          )}

          {employee.role === 'employee' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <StatCard
                  title="Skor KPI Anda"
                  value="0"
                  description="Skor terakhir"
                  iconName="Award"
                />
                <StatCard
                  title="Ranking"
                  value="-"
                  description="Posisi di unit"
                  iconName="TrendingUp"
                />
                <StatCard
                  title="Status"
                  value="Aktif"
                  description="Status kepegawaian"
                  iconName="Activity"
                />
              </div>
              <QuickActions role="employee" />
            </>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Fatal dashboard error:', error)
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Memuat Dashboard</h2>
          <p className="text-red-600">Terjadi kesalahan saat memuat dashboard. Silakan refresh halaman atau hubungi administrator.</p>
        </div>
      </div>
    )
  }
}
