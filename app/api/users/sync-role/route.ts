import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/users/sync-role
 * 
 * Syncs the role from Supabase Auth user_metadata to m_employees.role
 * This fixes the case where a previous role update only changed auth metadata
 * but didn't update the database.
 * 
 * Called automatically after login.
 */
export async function POST() {
    try {
        const supabase = await createClient()

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Tidak terautentikasi' }, { status: 401 })
        }

        const metadataRole = user.user_metadata?.role
        if (!metadataRole) {
            return NextResponse.json({ success: true, message: 'No role in metadata' })
        }

        // Use admin client to bypass RLS
        const adminClient = await createAdminClient()

        // Get current employee role from database
        const { data: employee, error: empError } = await adminClient
            .from('m_employees')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()

        if (empError || !employee) {
            // If no employee record, that's OK for superadmin - just skip sync
            if (metadataRole === 'superadmin') {
                return NextResponse.json({ success: true, synced: false, message: 'Superadmin without employee record, sync skipped' })
            }
            return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
        }

        // If roles match, no sync needed
        if (employee.role === metadataRole) {
            return NextResponse.json({ success: true, synced: false, message: 'Roles already in sync' })
        }

        // Sync role from auth metadata to m_employees
        const { error: updateError } = await adminClient
            .from('m_employees')
            .update({ role: metadataRole })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[SYNC-ROLE] Error syncing role:', updateError)
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
        }

        console.log(`[SYNC-ROLE] Role synced for ${user.email}: ${employee.role} -> ${metadataRole}`)
        return NextResponse.json({
            success: true,
            synced: true,
            previousRole: employee.role,
            newRole: metadataRole
        })
    } catch (error: any) {
        console.error('[SYNC-ROLE] Unexpected error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
