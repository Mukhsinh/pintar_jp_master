import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API for Medical Doctor Remuneration Master Data
 * Handles CRUD for remunerasi_master_dokter
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period')
        const unitId = searchParams.get('unit_id')

        if (!period) {
            return NextResponse.json({ error: 'Period is required' }, { status: 400 })
        }

        let query = supabase
            .from('remunerasi_master_dokter')
            .select(`
        *,
        m_employees!inner (
          id,
          full_name,
          employee_code,
          nik,
          unit_id
        )
      `)
            .eq('periode_id', period)

        if (unitId && unitId !== 'all') {
            query = query.eq('m_employees.unit_id', unitId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('Doctor Remuneration GET Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        // Support single or array input
        const items = Array.isArray(body) ? body : [body]

        const { data, error } = await supabase
            .from('remunerasi_master_dokter')
            .upsert(items.map(item => ({
                employee_id: item.employee_id,
                periode_id: item.periode_id,
                remun_kategori_id: item.remun_kategori_id,
                pagu_guarantee_fee: item.pagu_guarantee_fee || 0,
                index_id: item.index_id || null,
                updated_at: new Date().toISOString()
            })), { onConflict: 'employee_id, periode_id' })
            .select()

        if (error) throw error

        return NextResponse.json({
            data,
            message: `${data.length} doctor remuneration records updated successfully`
        })
    } catch (error: any) {
        console.error('Doctor Remuneration POST Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
