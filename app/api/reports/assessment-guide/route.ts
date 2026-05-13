import { NextRequest, NextResponse } from 'next/server'
import { generateAssessmentGuidePDF } from '@/lib/export/pdf-export'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { unitName: reqUnitName, unitId: reqUnitId } = await request.json()

        const supabaseClient = await createClient()
        const { data: { user } } = await supabaseClient.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createAdminClient()

        // Get user employee info
        const { data: employee } = await supabase
            .from('m_employees')
            .select('role, unit_id, m_units(name)')
            .eq('user_id', user.id)
            .single()

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        let unitId = reqUnitId
        let unitName = reqUnitName

        if (employee.role === 'unit_manager') {
            unitId = employee.unit_id
            unitName = (employee.m_units as any)?.name || reqUnitName
        }

        const pdfBytes = await generateAssessmentGuidePDF(unitName, unitId)

        return new Response(pdfBytes as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Petunjuk_Penilaian_${(unitName || 'Unit').replace(/\s+/g, '_')}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('Assessment Guide generation error:', error)
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        )
    }
}
