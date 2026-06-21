
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL defined:', !!supabaseUrl)
console.log('Key defined:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
    try {
        const { data, error } = await supabase
            .from('t_pool')
            .select('*')
            .limit(1)

        if (error) {
            console.error('Error fetching t_pool:', error)
        } else {
            console.log('t_pool data:', data[0])
        }
    } catch (e) {
        console.error('Catch error:', e)
    }
}

checkTable()
