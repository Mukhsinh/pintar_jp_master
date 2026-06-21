
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function checkDuplicates() {
    const { data, error } = await supabase
        .from('m_employees')
        .select('email')

    if (error) {
        console.error(error)
        return
    }

    const emails = data.map(d => d.email).filter(Boolean)
    const duplicates = emails.filter((item, index) => emails.indexOf(item) !== index)

    console.log('Duplicate emails:', duplicates)

    if (duplicates.length > 0) {
        const { data: dupDetails } = await supabase
            .from('m_employees')
            .select('id, full_name, email, role, unit_id')
            .in('email', duplicates)
        console.log('Duplicate details:', dupDetails)
    }
}

checkDuplicates()
