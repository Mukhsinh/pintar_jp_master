/**
 * Optimized data fetching utilities
 * Reduces N+1 queries and provides consistent error handling
 */

import { createClient } from '@/lib/supabase/server'

export interface BatchQueryOptions {
  timeout?: number
  retries?: number
}

export interface QueryResult<T> {
  data: T | null
  error: any
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
  ): Promise<QueryResult<any[]>> {
    const { timeout = 10000, retries = 2 } = options

    const supabase = await this.getSupabase()
    
    let query = supabase
      .from('m_employees')
      .select(`
        id,
        employee_code,
        full_name,
        unit_id,
        is_active,
        t_kpi_assessments(
          id,
          realization_value,
          target_value,
          weight_percentage,
          achievement_percentage,
          score,
          indicator_id,
          sub_indicator_id,
          period,
          m_kpi_indicators(
            id,
            code,
            name,
            category_id,
            basic_index_value,
            m_kpi_categories(
              category,
              unit_id,
              configuration_style
            )
          ),
          m_kpi_sub_indicators(
            measurement_type,
            unit_tariff,
            base_index_value
          )
        ),
        t_realization(
          id,
          realization_value,
          indicator_id,
          sub_indicator_id,
          period,
          m_kpi_indicators(
            id,
            target_value,
            weight_percentage,
            category_id,
            basic_index_value,
            m_kpi_categories(
              category,
              unit_id,
              configuration_style
            )
          ),
          m_kpi_sub_indicators(
            measurement_type,
            unit_tariff,
            base_index_value
          )
        )
      `)
      .eq('is_active', true)

    if (unitId) {
      query = query.eq('unit_id', unitId)
    }

    const { data, error } = await this.executeWithRetry(query, retries, timeout)
    
    if (error) {
      return { data: null, error }
    }
    
    // Filter results by period after fetching (since we can't filter on nested left joins effectively)
    if (!data || !Array.isArray(data)) {
      return { data: [], error: null }
    }

    const filtered = data.map((emp: any) => ({
      ...emp,
      t_kpi_assessments: emp.t_kpi_assessments?.filter((a: any) => a.period === period) || [],
      t_realization: emp.t_realization?.filter((r: any) => r.period === period) || []
    }))

    return { data: filtered, error: null }
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
        .from('t_notification')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
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
  async getUserEmployee(userId: string): Promise<QueryResult<any>> {
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

    if (error) {
      return { data: null, error }
    }
    return { data, error: null }
  }

  private async executeWithRetry<T>(
    query: any,
    retries: number,
    timeout: number
  ): Promise<{ data: T | null; error: any }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )

        const result = await Promise.race([query, timeoutPromise])

        if (result.error) {
          throw result.error
        }

        return { data: result.data, error: null }
      } catch (error) {
        if (attempt === retries) {
          return { data: null, error }
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    return { data: null, error: new Error('Max retries exceeded') }
  }
}

// Singleton instance
export const dataFetcher = new DataFetcher()