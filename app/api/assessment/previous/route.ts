import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = await createAdminClient()

        // Get current user's employee record
        const { data: currentEmployee } = await adminClient
            .from('m_employees')
            .select('id, role, unit_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!currentEmployee) {
            return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const employeeId = searchParams.get('employee_id')
        const currentPeriod = searchParams.get('current_period')

        if (!employeeId || !currentPeriod) {
            return NextResponse.json(
                { error: 'employee_id and current_period are required' },
                { status: 400 }
            )
        }

        // Enforce unit isolation for unit managers
        if (currentEmployee.role === 'unit_manager') {
            const { data: targetEmployee } = await adminClient
                .from('m_employees')
                .select('unit_id')
                .eq('id', employeeId)
                .single()

            if (!targetEmployee || targetEmployee.unit_id !== currentEmployee.unit_id) {
                return NextResponse.json(
                    { error: 'You can only view assessments for employees in your unit' },
                    { status: 403 }
                )
            }
        }

        // Since `period` looks like 'Februari 2026', matching string order might not represent time correctly.
        // However, finding the MOST RECENT period that is NOT the current_period can help.
        // A simplified approach is just sorting by created_at DESC from `t_kpi_assessments` 
        // where period != current_period to find the last time this employee was assessed.

        // First, find the period of the last assessment
        const { data: lastAssessment, error: lastError } = await supabase
            .from('t_kpi_assessments')
            .select('period')
            .eq('employee_id', employeeId)
            .neq('period', currentPeriod)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (lastError || !lastAssessment) {
            // It's okay if they have no previous assessment
            return NextResponse.json({ assessments: [] })
        }

        const previousPeriod = lastAssessment.period;

        // Then fetch all assessments for that previous period
        const { data, error } = await supabase
            .from('t_kpi_assessments')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('period', previousPeriod)

        if (error) {
            throw new Error(`Failed to fetch previous assessments: ${error.message}`)
        }

        return NextResponse.json({ assessments: data || [], previous_period: previousPeriod })
    } catch (error: any) {
        console.error('Assessment previous GET error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch previous assessments' },
            { status: 500 }
        )
    }
}
