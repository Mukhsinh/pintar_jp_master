import { createClient } from '@/lib/supabase/server'
import type { Assessment, AssessmentStatus, AssessmentIndicator } from '@/lib/types/assessment.types'

export async function getAvailablePeriods(): Promise<string[]> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('t_pool')
      .select('period')
      .in('status', ['approved', 'distributed'])
      .order('period', { ascending: false })

    if (error) {
      console.error('Error fetching periods:', error)
      return []
    }

    return data?.map(item => item.period) || []
  } catch (error: any) {
    console.error('Exception in getAvailablePeriods:', error)
    return []
  }
}

export async function getAssessmentStatus(unitId: string, period: string): Promise<AssessmentStatus[]> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('v_assessment_status')
      .select('*')
      .eq('unit_id', unitId)
      .eq('period', period)
      .order('full_name')

    if (error) {
      console.error('Error fetching assessment status:', error)
      return []
    }
    return data || []
  } catch (error: any) {
    console.error('Exception in getAssessmentStatus:', error)
    return []
  }
}

export async function getAssessmentsForEmployee(employeeId: string, period: string): Promise<Assessment[]> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('t_kpi_assessments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period', period)
      .order('created_at')

    if (error) {
      console.error('Error fetching assessments for employee:', error)
      return []
    }
    return data || []
  } catch (error: any) {
    console.error('Exception in getAssessmentsForEmployee:', error)
    return []
  }
}

export async function getAssessmentIndicators(employeeId: string, period: string): Promise<AssessmentIndicator[]> {
  const supabase = await createClient()

  try {
    const { data: employee, error: employeeError } = await supabase
      .from('m_employees')
      .select('unit_id')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError)
      return []
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('m_kpi_categories')
      .select('id, name, type, configuration_style, is_weighted')
      .eq('unit_id', employee.unit_id)
      .eq('is_active', true)

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return []
    }

    const categoryMap = new Map(categories?.map(c => [c.id, c]) || [])

    const { data: indicators, error: indicatorsError } = await supabase
      .from('m_kpi_indicators')
      .select('id, name, target_value, weight_percentage, category_id, calculation_method, basic_index_value')
      .eq('is_active', true)
      .in('category_id', categories?.map(c => c.id) || [])

    if (indicatorsError) {
      console.error('Error fetching indicators:', indicatorsError)
      return []
    }

    const existingAssessments = await getAssessmentsForEmployee(employeeId, period)
    const assessmentMap = new Map(existingAssessments.map(a => [a.indicator_id, a]))

    return (indicators || []).map(indicator => {
      const category = categoryMap.get(indicator.category_id)
      return {
        id: indicator.id,
        name: indicator.name,
        target_value: indicator.target_value,
        weight_percentage: indicator.weight_percentage,
        category_id: indicator.category_id,
        category_name: category?.name || 'Unknown Category',
        category_type: (category?.type || 'P1') as 'P1' | 'P2' | 'P3',
        current_assessment: assessmentMap.get(indicator.id)
      }
    })
  } catch (error: any) {
    console.error('Exception in getAssessmentIndicators:', error)
    return []
  }
}

export async function upsertAssessment(assessment: Assessment): Promise<Assessment | null> {
  const supabase = await createClient()

  try {
    // 1. Fetch indicator & category metadata for flags
    const { data: indicator, error: indError } = await supabase
      .from('m_kpi_indicators')
      .select(`
        *,
        m_kpi_categories (
          configuration_style,
          is_weighted
        )
      `)
      .eq('id', assessment.indicator_id)
      .single()

    if (indError || !indicator) {
      console.error('Indicator not found for assessment:', indError)
      return null
    }

    const category = indicator.m_kpi_categories
    const isActivity = category?.configuration_style === 'activity' || indicator.calculation_method === 'priority'
    const isUnweighted = category?.is_weighted === false

    const realization = Number(assessment.realization_value) || 0
    const target = Number(assessment.target_value) || 1
    const tariff = Number(indicator.basic_index_value) || 0

    // Achievement percentage calculation
    const achievement = target === 0 ? 100 : (realization / target) * 100

    // Score calculation:
    // 1. If Activity/Priority: Volume * Tariff (no weight)
    // 2. If Unweighted Category: Achievement (no weight)
    // 3. Otherwise: (Achievement * Weight) / 100
    let score = 0
    if (isActivity) {
      score = realization * tariff
    } else if (isUnweighted) {
      score = achievement
    } else {
      score = (achievement * assessment.weight_percentage) / 100
    }

    const assessmentData = {
      ...assessment,
      achievement_percentage: achievement,
      score: score
    }

    const { data: existing } = await supabase
      .from('t_kpi_assessments')
      .select('id')
      .eq('employee_id', assessment.employee_id)
      .eq('indicator_id', assessment.indicator_id)
      .eq('period', assessment.period)
      .single()

    let result
    let operation: 'CREATE' | 'UPDATE' = 'CREATE'

    if (existing) {
      operation = 'UPDATE'
      const { data, error } = await supabase
        .from('t_kpi_assessments')
        .update(assessmentData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating assessment:', error)
        return null
      }
      result = data
    } else {
      const { data, error } = await supabase
        .from('t_kpi_assessments')
        .insert(assessmentData)
        .select()
        .single()

      if (error) {
        console.error('Error creating assessment:', error)
        return null
      }
      result = data
    }

    // Simple audit logging
    try {
      await supabase
        .from('t_audit_log')
        .insert({
          table_name: 't_kpi_assessments',
          operation,
          record_id: result.id,
          details: `${operation === 'CREATE' ? 'Created' : 'Updated'} assessment for employee ${assessment.employee_id}`,
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.error('Audit logging failed:', auditError)
    }

    return result
  } catch (error: any) {
    console.error('Exception in upsertAssessment:', error)
    return null
  }
}

// Default export for module compatibility
const assessmentService = {
  getAvailablePeriods,
  getAssessmentStatus,
  getAssessmentsForEmployee,
  getAssessmentIndicators,
  upsertAssessment
}

export default assessmentService