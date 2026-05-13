const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function compareUnits() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Get Unit IDs for CARAKA and KEUANGAN
    const { data: units } = await supabase.from('m_units').select('id, name').in('name', ['CARAKA', 'KEUANGAN']);
    console.log('Units:', units);

    for (const unit of units) {
        console.log(`\n--- Unit: ${unit.name} (${unit.id}) ---`);

        // Get Indicators for this unit
        const { data: indicators } = await supabase
            .from('m_kpi_indicators')
            .select('id, name, basic_index_value, m_kpi_categories!inner(category, configuration_style)')
            .eq('m_kpi_categories.unit_id', unit.id)
            .eq('m_kpi_categories.category', 'P3');

        console.log(`Indicators Count (P3): ${indicators?.length || 0}`);
        if (indicators && indicators.length > 0) {
            console.log('Sample Indicator:', indicators[0]);

            // Get Assessments for one of these indicators
            const { data: assessments } = await supabase
                .from('t_kpi_assessments')
                .select('realization_value, score, target_value')
                .eq('indicator_id', indicators[0].id)
                .limit(5);

            console.log('Sample Assessments:', assessments);
        }
    }
}

compareUnits();
