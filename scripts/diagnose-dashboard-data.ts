import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://vdyvkzynvzlwbbjzlwml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'
)

async function diagnose() {
    // 1. Period distribution
    const { data: periods } = await supabase.from('t_kpi_assessments').select('period')
    const periodCounts: Record<string, number> = {}
    for (const p of (periods || [])) {
        periodCounts[p.period] = (periodCounts[p.period] || 0) + 1
    }
    console.log('=== PERIOD DISTRIBUTION ===')
    console.log(JSON.stringify(periodCounts, null, 2))
    console.log('Total assessment records:', periods?.length)

    // 2. Employee count summary
    const { count: totalEmps } = await supabase.from('m_employees').select('id', { count: 'exact', head: true })
    const { count: activeEmps } = await supabase.from('m_employees').select('id', { count: 'exact', head: true }).eq('is_active', true)
    const { count: activeNonAdmin } = await supabase.from('m_employees').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'superadmin')
    console.log('\n=== EMPLOYEE COUNTS ===')
    console.log('Total:', totalEmps, 'Active:', activeEmps, 'Active non-admin:', activeNonAdmin)

    // 3. Test what the dashboard actually gets for 2026-06 (current month) and 2026-05
    console.log('\n=== QUERY TEST: 2026-06 ===')
    const { data: jun, error: junErr } = await supabase
        .from('t_kpi_assessments')
        .select('employee_id')
        .eq('period', '2026-06')
    console.log('June 2026 records:', jun?.length, junErr?.message || '')

    console.log('\n=== QUERY TEST: 2026-05 ===')
    const { data: may, error: mayErr } = await supabase
        .from('t_kpi_assessments')
        .select('employee_id')
        .eq('period', '2026-05')
    console.log('May 2026 records:', may?.length, mayErr?.message || '')

    // 4. Test the full dashboard join query for '2026-05'
    console.log('\n=== FULL DASHBOARD QUERY TEST (2026-05) ===')
    const { data: fullData, error: fullErr } = await supabase
        .from('t_kpi_assessments')
        .select(`
      employee_id,
      weight_percentage,
      realization_value,
      target_value,
      employee:m_employees!t_kpi_assessments_employee_id_fkey!inner(id, is_active, role, unit_id),
      m_kpi_indicators (
        m_kpi_categories (
          category,
          weight_percentage
        )
      )
    `)
        .in('period', ['2026-05'])
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')

    console.log('Full join results:', fullData?.length, fullErr?.message || '')
    if (fullData && fullData.length > 0) {
        console.log('Sample record:', JSON.stringify(fullData[0], null, 2))
    }

    // 5. How many distinct employees have assessments
    console.log('\n=== DISTINCT EMPLOYEES WITH ASSESSMENTS ===')
    const empIds = new Set((fullData || []).map(d => d.employee_id))
    console.log('Distinct employees with assessments in 2026-05:', empIds.size)
}

diagnose().catch(console.error)
