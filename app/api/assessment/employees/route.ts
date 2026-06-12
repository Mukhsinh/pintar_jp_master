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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS for employee lookup
    const adminClient = await createAdminClient()

    // Try by user_id first, then fallback to email
    let currentEmployee: any = null
    const { data: byUserId } = await adminClient
      .from('m_employees')
      .select('id, role, unit_id, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (byUserId) {
      currentEmployee = byUserId
    } else {
      const { data: byEmail } = await adminClient
        .from('m_employees')
        .select('id, role, unit_id, full_name')
        .eq('email', user.email)
        .maybeSingle()

      if (byEmail) {
        currentEmployee = byEmail
        // Auto-link user_id for future lookups
        await adminClient
          .from('m_employees')
          .update({ user_id: user.id })
          .eq('id', byEmail.id)
      }
    }

    if (!currentEmployee) {
      console.error('No employee record found for user:', user.id, user.email)
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    console.log('Current employee:', currentEmployee.full_name, 'Role:', currentEmployee.role)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const status = searchParams.get('status')

    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 })
    }

    // Get data directly from v_assessment_status view
    let statusQuery = adminClient
      .from('v_assessment_status')
      .select('*')
      .eq('period', period)

    if (currentEmployee.role === 'unit_manager') {
      statusQuery = statusQuery.eq('unit_id', currentEmployee.unit_id)
    }

    if (status && ['Belum Dinilai', 'Sebagian', 'Selesai'].includes(status)) {
      statusQuery = statusQuery.eq('status', status)
    }

    const { data: rawEmployees, error: statusError } = await statusQuery.order('full_name')

    // Filter out superadmins in memory as a fallback for views without the role column
    const employees = (rawEmployees || []).filter((emp: any) => emp.role !== 'superadmin')

    if (statusError) {
      console.error('View fetch error:', statusError)
      return NextResponse.json({ error: statusError.message }, { status: 500 })
    }

    return NextResponse.json({ employees: employees || [] })
  } catch (error) {
    console.error('Assessment employees GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees for assessment' },
      { status: 500 }
    )
  }
}