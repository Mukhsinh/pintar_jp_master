import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = await createAdminClient()
        const { data: employee, error } = await adminSupabase
            .from('m_employees')
            .select(`
        id,
        full_name,
        role,
        unit_id,
        m_units (
          id,
          name
        )
      `)
            .eq('user_id', user.id)
            .single()

        if (error || !employee) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: employee
        })
    } catch (error: any) {
        console.error('Profile fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
