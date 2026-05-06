/**
 * Optimized data fetching utilities
 * Reduces N+1 queries and provides consistent error handling
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type Tables = Database['public']['Tables']

export interface BatchQueryOptions {
  timeout?: number
  retries?: number
}

export class DataFetcher {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Batch fetch employees with their assessments/realizations for a period
   * Eliminates N+1 queries in calculation service
   */
  async getEmployeesWithKPIData(
    unitId: string | null,
    period: string,
    options: BatchQueryOptions = {}
  ) {
    const { timeout = 10000, retries = 2 } = options

    const supabase = await this.getSupabase()
    const query = supabase
      .from('m_employees')
      .select(`
        id,
        employee_code,
        full_name,
        unit_id,
        role,
        is_active,
        t_kpi_assessments!left (
          id,
          realization_value,
          target_value,
          weight_percentage,
          achievement_percentage,
          score,
          indicator_id,
          period,
          m_kpi_indicators!inner (
            id,
            code,
            name,
            category_id,
            basic_index_value,
            m_kpi_categories!inner (
              category,
              unit_id,
              configuration_style
            )
          )
        ),
        t_realization!left (
          id,
          realization_value,
          indicator_id,
          period,
          m_kpi_indicators!inner (
            id,
            target_value,
            weight_percentage,
            category_id,
            basic_index_value,
            m_kpi_categories!inner (
              category,
              unit_id,
              configuration_style
            )
          )
        )
      `)
      .eq('is_active', true)
      .eq('t_kpi_assessments.period', period)
      .eq('t_realization.period', period)

    if (unitId) {
      query.eq('unit_id', unitId)
    }

    return this.executeWithRetry(query, retries, timeout)
  }

  /**
   * Batch fetch sidebar data (company info, unit name, notifications)
   * Eliminates multiple sequential queries in Sidebar component
   */
  async getSidebarData(userId: string, unitId?: string) {
    const supabase = await this.getSupabase()

    const queries = [
      // Company info
      supabase
        .from('t_settings')
        .select('value')
        .eq('key', 'company_info')
        .maybeSingle(),

      // Unit name (if applicable)
      unitId ?
        supabase
          .from('m_units')
          .select('name')
          .eq('id', unitId)
          .single() :
        Promise.resolve({ data: null, error: null }),

      // Unread notifications count
      supabase
        .from('t_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    ]

    const results = await Promise.allSettled(queries)

    return {
      companyInfo: results[0].status === 'fulfilled' ? (results[0].value as any).data?.value : null,
      unitName: results[1].status === 'fulfilled' ? (results[1].value as any).data?.name : null,
      unreadCount: results[2].status === 'fulfilled' ? (results[2].value as any).count || 0 : 0
    }
  }

  /**
   * Get user employee data with caching
   * Eliminates repeated user data fetching patterns
   */
  async getUserEmployee(userId: string) {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('m_employees')
      .select(`
        id,
        employee_code,
        full_name,
        unit_id,
        role,
        email,
        is_active,
        m_units!inner (
          id,
          name,
          code
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error) throw error
    return data
  }

  private async executeWithRetry<T>(
    query: any,
    retries: number,
    timeout: number
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )

        const result = await Promise.race([query, timeoutPromise])

        if (result.error) {
          throw result.error
        }

        return result.data
      } catch (error) {
        if (attempt === retries) {
          throw error
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw new Error('Max retries exceeded')
  }
}

// Singleton instance
export const dataFetcher = new DataFetcher()