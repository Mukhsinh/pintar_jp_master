const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkCategories() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: categories } = await supabase
        .from('m_kpi_categories')
        .select('unit_id, category, category_name, configuration_style, m_units(name)')
        .in('category', ['P1', 'P2', 'P3']);

    console.log('Categories:', categories.map(c => ({
        unit: c.m_units?.name,
        category: c.category,
        style: c.configuration_style
    })));
}

checkCategories();
