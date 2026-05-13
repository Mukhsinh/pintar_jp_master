'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserWithPegawai {
  id: string
  email: string
  role: 'superadmin' | 'unit_manager' | 'employee'
  employee_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  pegawai: {
    id: string
    employee_code: string
    full_name: string
    unit_id: string
    tax_status: string
    is_active: boolean
  } | null
  unit: {
    id: string
    name: string
  } | null
}

/**
 * Server action to get users from t_user table
 */
export async function getUsers(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = '',
  roleFilter: string = 'all'
): Promise<{ data: UserWithPegawai[]; count: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return { data: [], count: 0, error: 'Tidak terautentikasi' }
    }

    // Check if user is superadmin from user metadata
    const userRole = authUser.user_metadata?.role
    if (userRole !== 'superadmin') {
      return { data: [], count: 0, error: 'Tidak memiliki akses' }
    }

    // Get all employees with user_id
    let query = supabase
      .from('m_employees')
      .select(`
        id,
        employee_code,
        full_name,
        unit_id,
        tax_status,
        is_active,
        user_id,
        created_at,
        updated_at,
        m_units(id, name)
      `, { count: 'exact' })
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%`)
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return { data: [], count: 0, error: error.message }
    }

    // Get auth users to get email and role using service role
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      }
    )
    const { data: authUsersData, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      return { data: [], count: 0, error: authError.message }
    }

    const authUsers = authUsersData

    // Transform data to match UserWithPegawai type
    const transformedData: UserWithPegawai[] = (data || []).map((employee: any) => {
      const authUser = authUsers.users.find(u => u.id === employee.user_id)
      const unit = Array.isArray(employee.m_units) ? employee.m_units[0] : employee.m_units

      return {
        id: employee.user_id,
        email: authUser?.email || '',
        role: authUser?.user_metadata?.role || 'employee',
        employee_id: employee.id,
        is_active: employee.is_active,
        created_at: employee.created_at,
        updated_at: employee.updated_at,
        pegawai: {
          id: employee.id,
          employee_code: employee.employee_code,
          full_name: employee.full_name,
          unit_id: employee.unit_id,
          tax_status: employee.tax_status,
          is_active: employee.is_active
        },
        unit: unit || null
      }
    })

    return { data: transformedData, count: count || 0 }
  } catch (err: any) {
    console.error('getUsers error:', err)
    return { data: [], count: 0, error: err.message }
  }
}
