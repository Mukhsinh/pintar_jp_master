'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSubIndicator(formData: {
  indicator_id: string
  name: string
  description?: string
  weight_percentage: number
  target_value?: number
  measurement_unit?: string
  scoring_criteria: Array<{ score: number; label: string }>
  measurement_type?: 'scoring' | 'quantitative'
  unit_tariff?: number
  base_index_value?: number
  service_types?: string[]
}) {
  const supabase = await createClient()

  try {
    // Validate user has permission
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User tidak terautentikasi')
    }

    // Check if user has employee record
    const { data: employee, error: empError } = await supabase
      .from('m_employees')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      throw new Error('User tidak memiliki record employee')
    }

    if (!employee.is_active) {
      throw new Error('User tidak aktif')
    }

    // Only superadmin and unit_manager can create sub indicators
    if (!['superadmin', 'unit_manager'].includes(employee.role)) {
      throw new Error('Tidak memiliki permission untuk membuat sub indicator')
    }

    // Get existing sub indicators to generate code
    const { data: existing } = await supabase
      .from('m_kpi_sub_indicators')
      .select('code')
      .eq('indicator_id', formData.indicator_id)
      .order('code', { ascending: false })
      .limit(1)

    let newCode = 'SUB001'
    if (existing && existing.length > 0) {
      const lastCode = existing[0].code
      const match = lastCode.match(/SUB(\d+)/)
      if (match) {
        const nextNum = parseInt(match[1]) + 1
        newCode = `SUB${String(nextNum).padStart(3, '0')}`
      }
    }

    // Validate weight percentage doesn't exceed 100%
    const { data: existingSubs } = await supabase
      .from('m_kpi_sub_indicators')
      .select('weight_percentage')
      .eq('indicator_id', formData.indicator_id)
      .eq('is_active', true)

    const totalExistingWeight = existingSubs?.reduce((sum, sub) => sum + Number(sum.weight_percentage), 0) || 0
    const newTotalWeight = totalExistingWeight + formData.weight_percentage

    if (newTotalWeight > 100.01) { // Allow small floating point tolerance
      throw new Error(`Total bobot akan menjadi ${newTotalWeight.toFixed(2)}% (maksimal 100%)`)
    }

    const { data, error } = await supabase
      .from('m_kpi_sub_indicators')
      .insert({
        ...formData,
        code: newCode,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/kpi-config')
    return { success: true, data }
  } catch (error: any) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: error.message || 'Gagal menyimpan sub indicator'
    }
  }
}

export async function updateSubIndicator(id: string, formData: {
  name: string
  description?: string
  weight_percentage: number
  target_value?: number
  measurement_unit?: string
  scoring_criteria: Array<{ score: number; label: string }>
  measurement_type?: 'scoring' | 'quantitative'
  unit_tariff?: number
  base_index_value?: number
  service_types?: string[]
}) {
  const supabase = await createClient()

  try {
    // Validate user has permission
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User tidak terautentikasi')
    }

    // Check if user has employee record
    const { data: employee, error: empError } = await supabase
      .from('m_employees')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      throw new Error('User tidak memiliki record employee')
    }

    if (!employee.is_active) {
      throw new Error('User tidak aktif')
    }

    // Only superadmin and unit_manager can update sub indicators
    if (!['superadmin', 'unit_manager'].includes(employee.role)) {
      throw new Error('Tidak memiliki permission untuk mengupdate sub indicator')
    }

    // Get current sub indicator
    const { data: currentSub, error: currentError } = await supabase
      .from('m_kpi_sub_indicators')
      .select('indicator_id, weight_percentage')
      .eq('id', id)
      .single()

    if (currentError || !currentSub) {
      throw new Error('Sub indicator tidak ditemukan')
    }

    // Validate weight percentage doesn't exceed 100%
    const { data: existingSubs } = await supabase
      .from('m_kpi_sub_indicators')
      .select('weight_percentage')
      .eq('indicator_id', currentSub.indicator_id)
      .eq('is_active', true)
      .neq('id', id) // Exclude current sub indicator

    const totalExistingWeight = existingSubs?.reduce((sum, sub) => sum + Number(sub.weight_percentage), 0) || 0
    const newTotalWeight = totalExistingWeight + formData.weight_percentage

    if (newTotalWeight > 100.01) { // Allow small floating point tolerance
      throw new Error(`Total bobot akan menjadi ${newTotalWeight.toFixed(2)}% (maksimal 100%)`)
    }

    const { data, error } = await supabase
      .from('m_kpi_sub_indicators')
      .update(formData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/kpi-config')
    return { success: true, data }
  } catch (error: any) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: error.message || 'Gagal mengupdate sub indicator'
    }
  }
}

export async function deleteSubIndicator(id: string) {
  const supabase = await createClient()

  try {
    // Validate user has permission
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User tidak terautentikasi')
    }

    // Check if user has employee record
    const { data: employee, error: empError } = await supabase
      .from('m_employees')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      throw new Error('User tidak memiliki record employee')
    }

    if (!employee.is_active) {
      throw new Error('User tidak aktif')
    }

    // Only superadmin and unit_manager can delete sub indicators
    if (!['superadmin', 'unit_manager'].includes(employee.role)) {
      throw new Error('Tidak memiliki permission untuk menghapus sub indicator')
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('m_kpi_sub_indicators')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/kpi-config')
    return { success: true, data }
  } catch (error: any) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: error.message || 'Gagal menghapus sub indicator'
    }
  }
}