require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      id, period, realization_value, score,
      m_employees!t_kpi_assessments_employee_id_fkey!inner(full_name),
      m_kpi_indicators!inner(name)
    `)
        .ilike('m_employees.full_name', '%darmanto%');

    console.log('Result:', JSON.stringify(data, null, 2));
    if (error) console.error('Error:', error);
}
run();
