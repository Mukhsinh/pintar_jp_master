import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface AssessmentStatus {
  employee_id: string
  full_name: string
  unit_id: string
  unit_name: string
  period: string
  total_indicators: number
  assessed_indicators: number
  status: string
  completion_percentage: number
}

async function getAssessmentStatus(supabase: any, unitIdFilter: string | null, period: string): Promise<AssessmentStatus[]> {
  // Fetch employees
  let employeeQuery = supabase
    .from('m_employees')
    .select('id, full_name, unit_id, role, m_units(name)')
    .eq('is_active', true)
    .neq('role', 'superadmin')

  if (unitIdFilter) {
    employeeQuery = employeeQuery.eq('unit_id', unitIdFilter)
  }

  const { data: employees, error: empError } = await employeeQuery
  if (empError) throw empError

  // Fetch all active indicators with their category and unit_id
  const { data: indicators, error: indError } = await supabase
    .from('m_kpi_indicators')
    .select(`
      id,
      m_kpi_categories!inner (
        unit_id
      )
    `)
    .eq('is_active', true)
  if (indError) throw indError

  // Group indicator counts by unit_id
  const indicatorsCountByUnit = (indicators || []).reduce((acc: Record<string, number>, curr: any) => {
    const unitId = curr.m_kpi_categories?.unit_id
    if (unitId) {
      acc[unitId] = (acc[unitId] || 0) + 1
    }
    return acc
  }, {})

  // Fetch assessments for the period
  const { data: assessments, error: assError } = await supabase
    .from('t_kpi_assessments')
    .select('employee_id, indicator_id, score')
    .eq('period', period)
  if (assError) throw assError

  // Group assessments by employee
  const assessmentMap = new Map<string, Set<string>>()
  assessments?.forEach((ass: any) => {
    // Treat as "assessed" if score is not null
    if (ass.indicator_id) {
      if (!assessmentMap.has(ass.employee_id)) {
        assessmentMap.set(ass.employee_id, new Set())
      }
      assessmentMap.get(ass.employee_id)?.add(ass.indicator_id)
    }
  })

  return (employees || []).map((emp: any) => {
    const totalIndicatorsCount = indicatorsCountByUnit[emp.unit_id] || 0
    const assessedCount = assessmentMap.get(emp.id)?.size || 0

    let status = 'Belum Dinilai'
    if (assessedCount > 0) {
      status = assessedCount >= totalIndicatorsCount ? 'Selesai' : 'Sebagian'
    } else if (totalIndicatorsCount === 0) {
      // If no indicators assigned to this unit, the user cannot assess them. Keep as Belum Dinilai.
      status = 'Belum Dinilai'
    }

    return {
      employee_id: emp.id,
      full_name: emp.full_name,
      unit_id: emp.unit_id,
      unit_name: emp.m_units?.name || 'Unknown',
      period: period,
      total_indicators: totalIndicatorsCount,
      assessed_indicators: assessedCount,
      status: status,
      completion_percentage: totalIndicatorsCount > 0
        ? Math.round((assessedCount / totalIndicatorsCount) * 100)
        : (assessedCount === 0 ? 0 : 100)
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appRole = user.app_metadata?.role
    const userRole = user.user_metadata?.role
    const email = user.email

    const isSuperAdmin =
      appRole === 'superadmin' ||
      userRole === 'superadmin' ||
      email === 'admin@goetengrs.com'

    // Use admin client for superadmin to bypass RLS, otherwise regular client
    const fetchClient = isSuperAdmin ? await createAdminClient() : supabase

    // Get current user's employee record
    let { data: currentEmployee } = await fetchClient
      .from('m_employees')
      .select('id, role, unit_id, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!currentEmployee) {
      if (isSuperAdmin) {
        currentEmployee = {
          id: user.id,
          full_name: 'Super Administrator',
          role: 'superadmin',
          unit_id: '0'
        }
      } else {
        return NextResponse.json({ error: 'Employee record not found. Please contact admin to link your account.' }, { status: 404 })
      }
    }

    // STRICT ROLE OVERRIDE: 
    // If the database says they are a unit_manager, we MUST respect that role
    // even if Auth metadata says superadmin, for proper unit isolation.
    // However, if database role is not defined but Auth metadata says superadmin, use that.
    const effectiveRole = currentEmployee.role || (isSuperAdmin ? 'superadmin' : 'employee')
    const effectiveUnitId = currentEmployee.unit_id

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const period = searchParams.get('period')

    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 })
    }

    if (employeeId) {
      // Authorization check for unit managers
      if (effectiveRole === 'unit_manager') {
        const { data: targetEmployee } = await supabase
          .from('m_employees')
          .select('unit_id')
          .eq('id', employeeId)
          .single()

        if (!targetEmployee || targetEmployee.unit_id !== effectiveUnitId) {
          return NextResponse.json(
            { error: 'You can only view status for employees in your unit' },
            { status: 403 }
          )
        }
      }

      // Get status for specific employee
      const statuses = await getAssessmentStatus(fetchClient, effectiveRole === 'unit_manager' ? effectiveUnitId : null, period)
      const employeeStatus = statuses.find(s => s.employee_id === employeeId)

      if (!employeeStatus) {
        return NextResponse.json({ error: 'Employee status not found' }, { status: 404 })
      }

      return NextResponse.json({ status: employeeStatus })
    } else {
      // Get status for all employees based on role
      const unitIdFilter = effectiveRole === 'unit_manager' ? effectiveUnitId : null
      const statuses = await getAssessmentStatus(fetchClient, unitIdFilter, period)

      // Calculate summary statistics
      const summary = {
        total_employees: statuses.length,
        completed: statuses.filter(s => s.status === 'Selesai').length,
        started: statuses.filter(s => s.assessed_indicators > 0).length,
        partial: statuses.filter(s => s.status === 'Sebagian').length,
        not_started: statuses.filter(s => s.status === 'Belum Dinilai').length,
        completion_rate: statuses.length > 0
          ? Math.round((statuses.filter(s => s.status === 'Selesai').length / statuses.length) * 100)
          : 0
      }

      return NextResponse.json({
        statuses,
        summary
      })
    }
  } catch (error: any) {
    console.error('Assessment status GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment status' },
      { status: 500 }
    )
  }
}
