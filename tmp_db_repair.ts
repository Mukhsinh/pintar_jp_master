import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runRepair() {
    console.log('Starting DB Repair...')
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/repair_kpi_assessment_uniqueness.sql'), 'utf-8')

    // We try to execute the SQL. Since there's no direct sql() method on the client,
    // we use the RPC if it exists, or we suggest manual application.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
        console.error('Error via RPC exec_sql:', error.message)
        console.log('Falling back to manual instruction...')
    } else {
        console.log('Success! Database repaired.')
    }
}

runRepair()
