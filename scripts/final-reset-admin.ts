import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Environment variables tidak lengkap')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function finalResetAdmin() {
  console.log('🔐 Final Reset Admin Password...\n')

  const superadminUserId = '86e939d4-b988-4470-8ef6-ff784da74b75'
  const superadminEmail = 'admin@goetengrs.com'
  const newPassword = 'admin123'

  try {
    console.log(`📋 Resetting password untuk: ${superadminEmail}`)
    console.log(`   User ID: ${superadminUserId}`)

    // Try using admin.updateUserById with password
    const { data, error } = await supabase.auth.admin.updateUserById(
      superadminUserId,
      {
        password: newPassword
      },
      {
        shouldCreateUser: false
      }
    )

    if (error) {
      console.error(`❌ Update failed: ${error.message}`)
      console.log('\n💡 Trying alternative method...')
      
      // Try sign in to get session, then update password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: superadminEmail,
        password: 'wrong'  // Try with wrong password first to see current state
      })
      
      console.log('Note: Error above is expected (trying wrong password)')
    } else {
      console.log('✅ Password updated successfully')
    }

    // Verify with a test login
    console.log('\n🧪 Testing login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: superadminEmail.trim().toLowerCase(),
      password: newPassword
    })

    if (loginError) {
      console.error(`❌ Login test failed: ${loginError.message}`)
      
      // Provide manual instructions
      console.log('\n⚠️  Password reset via admin API failed.')
      console.log('📌 Please use Supabase Dashboard to manually reset password:')
      console.log('   1. Go to: https://supabase.com/dashboard')
      console.log('   2. Select your project')
      console.log('   3. Go to Authentication > Users')
      console.log(`   4. Find user: ${superadminEmail}`)
      console.log('   5. Click "Reset Password"')
      console.log('   6. Or set password to: admin123')
    } else {
      console.log('✅ LOGIN TEST SUCCESSFUL!')
      console.log(`   User: ${loginData.user?.email}`)
      console.log(`   Session Token: ${loginData.session?.access_token.substring(0, 20)}...`)
      
      console.log('\n' + '='.repeat(60))
      console.log('✅ SUPERADMIN LOGIN READY')
      console.log('='.repeat(60))
      console.log('\n📋 Credentials:')
      console.log(`   Email: ${superadminEmail}`)
      console.log(`   Password: ${newPassword}`)
      console.log('\n🌐 Login: http://localhost:3002/login')
      console.log('='.repeat(60) + '\n')
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
  }
}

finalResetAdmin()
