import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface Assessment {
  id?: string
  employee_id: string
  indicator_id: string
  period: string
  realization_value: number
  target_value: number
  weight_percentage: number
  achievement_percentage?: number
  score?: number
  notes?: string
  sub_assessments?: any
  assessor_id: string
  created_at?: string
  updated_at?: string
}

/**
 * Find employee record for authenticated user.
 * Tries user_id first, then falls back to email match.
 */
async function findEmployeeForUser(adminClient: any, userId: string, userEmail: string) {
  // Try by user_id first
  const { data: byUserId } = await adminClient
    .from('m_employees')
    .select('id, role, unit_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (byUserId) return byUserId

  // Fallback: try by email
  const { data: byEmail } = await adminClient
    .from('m_employees')
    .select('id, role, unit_id')
    .eq('email', userEmail)
    .maybeSingle()

  if (byEmail) {
    // Auto-link user_id for future lookups
    await adminClient
      .from('m_employees')
      .update({ user_id: userId })
      .eq('id', byEmail.id)
    return byEmail
  }

  return null
}

// Simple audit logging function
async function logAssessmentAudit(
  operation: 'CREATE' | 'UPDATE',
  recordId: string,
  details: string,
  client: any
) {
  try {
    await client
      .from('t_audit_log')
      .insert({
        table_name: 't_kpi_assessments',
        operation,
        record_id: recordId,
        details,
        created_at: new Date().toISOString()
      })
  } catch (error: any) {
    console.error('Audit logging failed:', error)
  }
}

async function getAssessmentsForEmployee(adminClient: any, employeeId: string, period: string): Promise<Assessment[]> {
  const { data, error } = await adminClient
    .from('t_kpi_assessments')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('period', period)
    .order('created_at')

  if (error) {
    throw new Error(`Failed to fetch assessments: ${error.message}`)
  }
  return data || []
}

async function upsertAssessment(adminClient: any, assessment: Assessment): Promise<Assessment> {
  const achievement = assessment.achievement_percentage !== undefined
    ? assessment.achievement_percentage
    : (assessment.target_value === 0 ? 100 : (assessment.realization_value / assessment.target_value) * 100)

  const score = assessment.score !== undefined
    ? assessment.score
    : (achievement * assessment.weight_percentage) / 100

  const assessmentData = {
    employee_id: assessment.employee_id,
    indicator_id: assessment.indicator_id,
    period: assessment.period,
    realization_value: assessment.realization_value,
    target_value: assessment.target_value,
    weight_percentage: assessment.weight_percentage,
    notes: assessment.notes,
    assessor_id: assessment.assessor_id
  }

  const { data: existing } = await adminClient
    .from('t_kpi_assessments')
    .select('id')
    .eq('employee_id', assessment.employee_id)
    .eq('indicator_id', assessment.indicator_id)
    .eq('period', assessment.period)
    .maybeSingle()

  let result
  let operation: 'CREATE' | 'UPDATE' = 'CREATE'

  if (existing) {
    operation = 'UPDATE'
    const { data, error } = await adminClient
      .from('t_kpi_assessments')
      .update(assessmentData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update assessment: ${error.message}`)
    }
    result = data
  } else {
    const { data, error } = await adminClient
      .from('t_kpi_assessments')
      .insert(assessmentData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create assessment: ${error.message}`)
    }
    result = data
  }

  // Handle Sub-Assessments if provided
  if (assessment.sub_assessments && Array.isArray(assessment.sub_assessments)) {
    for (const sub of assessment.sub_assessments) {
      const subData = {
        employee_id: assessment.employee_id,
        indicator_id: assessment.indicator_id,
        sub_indicator_id: sub.sub_indicator_id,
        period: assessment.period,
        realization_value: sub.realization_value || 0,
        target_value: 0,
        weight_percentage: 0,
        score: sub.score || 0,
        notes: sub.notes || '',
        assessor_id: assessment.assessor_id
      }

      // Check if sub-indicator assessment exists
      const { data: subExisting } = await adminClient
        .from('t_kpi_assessments')
        .select('id')
        .eq('employee_id', assessment.employee_id)
        .eq('indicator_id', assessment.indicator_id)
        .eq('sub_indicator_id', sub.sub_indicator_id)
        .eq('period', assessment.period)
        .maybeSingle()

      if (subExisting) {
        await adminClient.from('t_kpi_assessments').update(subData).eq('id', subExisting.id)
      } else {
        await adminClient.from('t_kpi_assessments').insert(subData)
      }
    }
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const period = searchParams.get('period')

    if (!employeeId || !period) {
      return NextResponse.json(
        { error: 'employee_id and period are required' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const assessments = await getAssessmentsForEmployee(adminClient, employeeId, period)

    return NextResponse.json({ assessments })
  } catch (error: any) {
    console.error('Assessment GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS for employee lookup
    const adminClient = await createAdminClient()
    const currentEmployee = await findEmployeeForUser(adminClient, user.id, user.email || '')

    if (!currentEmployee) {
      console.error('Employee not found for user:', user.email, user.id)
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    // Enforce RBAC
    if (currentEmployee.role !== 'superadmin' && currentEmployee.role !== 'unit_manager') {
      return NextResponse.json(
        { error: 'Hanya superadmin atau manajer unit yang dapat memberikan penilaian' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const assessment: Assessment = {
      ...body,
      assessor_id: currentEmployee.id
    }

    // Authorization check - ensure user can assess this employee
    if (currentEmployee.role === 'unit_manager') {
      const { data: targetEmployee } = await adminClient
        .from('m_employees')
        .select('unit_id')
        .eq('id', assessment.employee_id)
        .single()

      if (!targetEmployee || targetEmployee.unit_id !== currentEmployee.unit_id) {
        return NextResponse.json(
          { error: 'You can only assess employees in your unit' },
          { status: 403 }
        )
      }
    }

    const savedAssessment = await upsertAssessment(adminClient, assessment)

    return NextResponse.json({ assessment: savedAssessment })
  } catch (error: any) {
    console.error('Assessment POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save assessment' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS for employee lookup
    const adminClient = await createAdminClient()
    const currentEmployee = await findEmployeeForUser(adminClient, user.id, user.email || '')

    if (!currentEmployee) {
      console.error('Employee not found for user:', user.email, user.id)
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    // Enforce RBAC
    if (currentEmployee.role !== 'superadmin' && currentEmployee.role !== 'unit_manager') {
      return NextResponse.json(
        { error: 'Hanya superadmin atau manajer unit yang dapat memberikan penilaian' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const assessment: Assessment = {
      ...body,
      assessor_id: currentEmployee.id
    }

    // Authorization check
    if (currentEmployee.role === 'unit_manager') {
      const { data: targetEmployee } = await adminClient
        .from('m_employees')
        .select('unit_id')
        .eq('id', assessment.employee_id)
        .single()

      if (!targetEmployee || targetEmployee.unit_id !== currentEmployee.unit_id) {
        return NextResponse.json(
          { error: 'You can only assess employees in your unit' },
          { status: 403 }
        )
      }
    }

    const updatedAssessment = await upsertAssessment(adminClient, assessment)

    return NextResponse.json({ assessment: updatedAssessment })
  } catch (error: any) {
    console.error('Assessment PUT error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update assessment' },
      { status: 500 }
    )
  }
}