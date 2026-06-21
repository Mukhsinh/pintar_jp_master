
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function checkNullUserId() {
    const { data: allNulls, error: nullsError } = await supabase
        .from('m_employees')
        .select('role')
        .is('user_id', null)

    if (nullsError) {
        console.error('Error fetching nulls:', nullsError)
    } else {
        const counts = allNulls?.reduce((acc: Record<string, number>, curr) => {
            const role = curr.role || 'null'
            acc[role] = (acc[role] || 0) + 1
            return acc
        }, {})
        console.log('Roles with NULL user_id:', counts)
    }
}

checkNullUserId()
