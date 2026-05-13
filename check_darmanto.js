const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkDarmanto() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: emps } = await supabase.from('m_employees').select('id, full_name, unit_id').ilike('full_name', '%Darmanto%');
    if (!emps || emps.length === 0) {
        console.log('Darmanto not found');
        return;
    }
    console.log('Darmanto:', emps[0]);

    const { data: assessments } = await supabase
        .from('t_kpi_assessments')
        .select('*, m_kpi_indicators(name, basic_index_value, m_kpi_categories(category))')
        .eq('employee_id', emps[0].id)
        .eq('period', '2026-01');

    const p3Assessments = assessments.filter(a => a.m_kpi_indicators?.m_kpi_categories?.category === 'P3');
    console.log('P3 Assessments:', JSON.stringify(p3Assessments, null, 2));

}

checkDarmanto();
