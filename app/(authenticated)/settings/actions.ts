'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SettingsPayload {
  company_info: {
    appName: string
    developerName: string
    name: string
    address: string
    phone: string
    email: string
    logo: string
  }
  footer: { text: string; show?: boolean }
  tax_rates: {
    TK0: number
    TK1: number
    TK2: number
    TK3: number
    K0: number
    K1: number
    K2: number
    K3: number
  }
  ter_rates: { categoryA: number; categoryB: number; categoryC: number }
  calculation_params: { minScore: number; maxScore: number }
  session_timeout: { hours: number }
  tax_config: { mechanism: string }
}

export async function saveSettings(
  payload: SettingsPayload
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Verify caller is superadmin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { data: emp } = await supabase
    .from('m_employees')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!emp || emp.role !== 'superadmin') {
    return { success: false, error: 'Akses ditolak: hanya superadmin' }
  }

  const now = new Date().toISOString()
  const updatedBy = emp.id

  const entries = [
    { key: 'company_info', value: payload.company_info },
    { key: 'footer', value: { text: payload.footer.text, show: payload.footer.show ?? true } },
    { key: 'tax_rates', value: payload.tax_rates },
    { key: 'ter_rates', value: payload.ter_rates },
    { key: 'calculation_params', value: payload.calculation_params },
    { key: 'session_timeout', value: payload.session_timeout },
    { key: 'tax_config', value: payload.tax_config },
  ]

  for (const entry of entries) {
    const { error } = await supabase
      .from('t_settings')
      .upsert(
        { key: entry.key, value: entry.value, updated_by: updatedBy, updated_at: now },
        { onConflict: 'key' }
      )

    if (error) {
      console.error(`Gagal menyimpan setting [${entry.key}]:`, error)
      return { success: false, error: `Gagal menyimpan ${entry.key}: ${error.message}` }
    }
  }

  revalidatePath('/', 'layout')
  return { success: true, error: null }
}
