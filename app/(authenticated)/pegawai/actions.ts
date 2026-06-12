'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Pegawai, CreatePegawaiData, UpdatePegawaiData } from '@/lib/types/database.types'

/**
 * Server action to get pegawai with unit data
 */
export async function getPegawaiWithUnits(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = ''
): Promise<{ data: Pegawai[]; count: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], count: 0, error: 'Tidak terautentikasi' }
    }

    // Check if user is superadmin from auth.users metadata
    const role = user.user_metadata?.role

    if (!role || role !== 'superadmin') {
      return { data: [], count: 0, error: 'Tidak memiliki akses' }
    }

    let query = supabase
      .from('m_employees')
      .select('*, m_units(name)', { count: 'exact' })
      .neq('role', 'superadmin')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,employment_status.ilike.%${searchTerm}%`)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Query error:', error)
      return { data: [], count: 0, error: error.message }
    }

    // Transform data to match Pegawai type
    const transformedData: Pegawai[] = (data || []).map((item: any) => ({
      ...item,
      m_units: item.m_units || undefined
    }))

    return { data: transformedData, count: count || 0 }
  } catch (err: any) {
    console.error('getPegawaiWithUnits error:', err)
    return { data: [], count: 0, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to create new pegawai
 */
export async function createPegawai(data: CreatePegawaiData) {
  try {
    const supabase = await createAdminClient()

    // Fetch global tax mechanism from settings
    const { data: taxSetting } = await supabase
      .from('t_settings')
      .select('value')
      .eq('key', 'tax_config')
      .single()

    const mechanism = (taxSetting?.value as any)?.mechanism || 'TER'
    const taxType = mechanism === 'ter' || mechanism === 'TER' ? 'TER' : 'Final'

    // Log data for debugging
    console.log('Creating employee with data:', data, 'using taxType:', taxType)

    const { data: newPegawai, error } = await supabase
      .from('m_employees')
      .insert([{
        employee_code: data.employee_code,
        full_name: data.full_name,
        email: data.email || null,
        unit_id: data.unit_id,
        tax_status: data.tax_status || 'TK/0',
        tax_type: taxType as any,
        nik: data.nik || null,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        bank_account_name: data.bank_account_name || null,
        position: data.position || null,
        phone: data.phone || null,
        role: data.role || 'employee',
        employee_status: data.employee_status || (data.employment_status || 'PNS'),
        employment_status: data.employment_status || 'PNS',
        pns_grade: data.pns_grade ? String(data.pns_grade) : null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      }])
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/pegawai')
    return { success: true }
  } catch (err: any) {
    console.error('createPegawai error:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to update pegawai
 */
export async function updatePegawai(id: string, data: UpdatePegawaiData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'superadmin') {
      return { success: false, error: 'Tidak memiliki akses' }
    }

    // Use admin client to bypass RLS and ensure all columns are written
    const adminSupabase = await createAdminClient()

    const { error } = await adminSupabase
      .from('m_employees')
      .update({
        employee_code: data.employee_code,
        full_name: data.full_name,
        email: data.email || null,
        unit_id: data.unit_id,
        position: data.position || null,
        phone: data.phone || null,
        nik: data.nik || null,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        bank_account_name: data.bank_account_name || null,
        tax_status: data.tax_status,
        tax_type: data.tax_type,
        employment_status: data.employment_status,
        employee_status: data.employee_status || (data.employment_status as string),
        pns_grade: data.pns_grade !== undefined ? String(data.pns_grade) : null,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Update error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/pegawai')
    return { success: true }
  } catch (err: any) {
    console.error('updatePegawai error:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to delete pegawai
 */
export async function deletePegawai(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'superadmin') {
      return { success: false, error: 'Tidak memiliki akses' }
    }

    const { error } = await supabase
      .from('m_employees')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/pegawai')
    return { success: true }
  } catch (err: any) {
    console.error('deletePegawai error:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to get all units for dropdown
 */
export async function getUnitsForDropdown(): Promise<{ data: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], error: 'Tidak terautentikasi' }
    }

    const { data, error } = await supabase
      .from('m_units')
      .select('id, name')
      .eq('is_active', true)
      .neq('code', 'superadmin')
      .order('name')

    if (error) {
      console.error('Units query error:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [] }
  } catch (err: any) {
    console.error('getUnitsForDropdown error:', err)
    return { data: [], error: err.message || 'Terjadi kesalahan' }
  }
}
