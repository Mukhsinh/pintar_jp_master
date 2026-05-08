import { createAdminClient } from './lib/supabase/server';

async function test() {
    const supabase = await createAdminClient();
    const { data: allEmployees, error: allEmpError } = await supabase
        .from('m_employees')
        .select(`
      *,
      m_units (
        id,
        name,
        proportion_percentage,
        remuneration_style
      )
    `)
        .limit(1);

    if (allEmpError) {
        console.log('Error:', allEmpError);
    } else {
        console.log('Success:', allEmployees);
    }
}

test();
