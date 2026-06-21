
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRoles() {
    const { data: allRoles, error: rolesError } = await supabase
        .from('m_employees')
        .select('role')

    if (rolesError) {
        console.error('Error fetching roles:', rolesError)
    } else {
        const counts = allRoles?.reduce((acc: Record<string, number>, curr) => {
            const role = curr.role || 'null'
            acc[role] = (acc[role] || 0) + 1
            return acc
        }, {})
        console.log('Roles in m_employees:', counts)
    }

    const { data: managers, error: managerError } = await supabase
        .from('m_employees')
        .select('full_name, role, unit_id, user_id')
        .ilike('role', '%manager%')
        .limit(10)

    if (managerError) {
        console.error('Error fetching managers:', managerError)
    } else {
        console.log('Sample managers:', managers)
    }
}

checkRoles()
