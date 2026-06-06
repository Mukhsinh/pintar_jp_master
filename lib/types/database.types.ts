export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      m_units: {
        Row: {
          id: string
          code: string
          name: string
          proportion_percentage: number
          remuneration_style: 'score_based' | 'activity_based_pir' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          proportion_percentage?: number
          remuneration_style?: 'score_based' | 'activity_based_pir' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          proportion_percentage?: number
          remuneration_style?: 'score_based' | 'activity_based_pir' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_employees: {
        Row: {
          id: string
          user_id: string | null
          employee_code: string
          full_name: string
          unit_id: string
          role: string
          email: string
          tax_status: string | null
          employment_status: 'ASN' | 'BLUD' | 'PNS' | 'PPPK' | null
          employee_status: string | null
          tax_type: 'Final' | 'TER' | null
          pns_grade: string | null
          position: string | null
          phone: string | null
          nik: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          employee_code: string
          full_name: string
          unit_id: string
          role?: string
          email?: string
          tax_status?: string | null
          employment_status?: 'ASN' | 'BLUD' | 'PNS' | 'PPPK' | null
          employee_status?: string | null
          tax_type?: 'Final' | 'TER' | null
          pns_grade?: string | null
          position?: string | null
          phone?: string | null
          nik?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          employee_code?: string
          full_name?: string
          unit_id?: string
          role?: string
          email?: string
          tax_status?: string | null
          employment_status?: 'ASN' | 'BLUD' | 'PNS' | 'PPPK' | null
          employee_status?: string | null
          tax_type?: 'Final' | 'TER' | null
          pns_grade?: string | null
          position?: string | null
          phone?: string | null
          nik?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_kpi_categories: {
        Row: {
          id: string
          unit_id: string
          category: 'P1' | 'P2' | 'P3'
          category_name: string
          weight_percentage: number
       tage' | 'activity' | null
          is_weighted: boolean
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          category: 'P1' | 'P2' | 'P3'
          category_name: string
          weight_percentage: number
          configuration_style?: 'percentage' | 'activity' | null
          is_weighted?: boolean
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          category?: 'P1' | 'P2' | 'P3'
          category_name?: string
          weight_percentage?: number
          configuration_style?: 'percentage' | 'activity' | null
          is_weighted?: boolean
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_kpi_indicators: {
        Row: {
          id: string
          category_id: string
          code: string
          name: string
          target_value: number
          weight_percentage: number
          basic_index_value: number | null
          measurement_unit: string | null
          description: string | null
          calculation_method: 'indexing' | 'priority' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          code: string
          name: string
          target_value?: number
          weight_percentage: number
          basic_index_value?: number | null
          measurement_unit?: string | null
          description?: string | null
          calculation_method?: 'indexing' | 'priority' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          code?: string
          name?: string
          target_value?: number
          weight_percentage?: number
          basic_index_value?: number | null
          measurement_unit?: string | null
          description?: string | null
          calculation_method?: 'indexing' | 'priority' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_kpi_sub_indicators: {
        Row: {
          id: string
          indicator_id: string
          code: string
          name: string
          target_value: number
          weight_percentage: number
          measurement_type: 'scoring' | 'quantitative' | null
          unit_tariff: number | null
          base_index_value: number | null
          scoring_criteria: Json
          measurement_unit: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          indicator_id: string
          code: string
          name: string
          target_value?: number
          weight_percentage: number
          measurement_type?: 'scoring' | 'quantitative' | null
          unit_tariff?: number | null
          base_index_value?: number | null
          scoring_criteria?: Json
          measurement_unit?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          indicator_id?: string
          code?: string
          name?: string
          target_value?: number
          weight_percentage?: number
          measurement_type?: 'scoring' | 'quantitative' | null
          unit_tariff?: number | null
          base_index_value?: number | null
          scoring_criteria?: Json
          measurement_unit?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      t_p: {
        Row: {
          id: string
          period: string
          revenue_total: number
          deduction_total: number
          net_pool: number | null
          global_allocation_percentage: number
          allocated_amount: number | null
          status: 'draft' | 'approved' | 'distributed'
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period: string
          revenue_total?: number
          deduction_total?: number
          global_allocation_percentage?: number
          status?: 'draft' | 'approved' | 'distributed'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          period?: string
          revenue_total?: number
          deduction_total?: number
          global_allocation_percentage?: number
          status?: 'draft' | 'approved' | 'distributed'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      t_pool_revenue: {
        Row: {
          id: string
          pool_id: string
          description: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          description: string
          amount: number
         : string
        }
        Update: {
          id?: string
          pool_id?: string
          description?: string
          amount?: number
          created_at?: string
        }
      }
      t_pool_deduction: {
        Row: {
          id: string
          pool_id: string
          description: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          description: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          pool_id?: string
          description?: string
          amount?: number
          created_at?: string
        }
      }
      t_realization: {
        Row: {
          id: string
          employee_id: string
          indicator_id: string
          sub_indicator_id: string | null
          period: string
          realization_value: number
          achievement_percentage: number | null
          score: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          indicator_id: string
          sub_indicator_id?: string | null
          period: string
          realization_value?: number
          achievement_percentage?: number | null
          score?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          indicator_id?: string
          sub_indicator_id?: string | null
          period?: string
          realization_value?: number
          achievement_percentage?: number | null
          score?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      t_kpi_assessments: {
        Row: {
          id: string
          employee_id: string
          indicator_id: string
          period: string
          realization_value: number
          target_value: number
          weight_percentage: number
          achievement_percentage: number | null
          score: number | null
          sub_assessments: Json | null
          notes: string | null
          assessor_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          indicator_id: string
          period: string
          realization_value?: number
          target_value: number
          weight_percentage: number
          sub_assessments?: Json | null
          notes?: string | null
          assessor_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          indicator_id?: string
          period?: string
          realization_value?: number
          target_value?:umber
          weight_percentage?: number
          sub_assessments?: Json | null
          notes?: string | null
          assessor_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      t_individual_scores: {
        Row: {
          id: string
          employee_id: string
          period: string
          p1_score: number
          p2_score: number
          p3_score: number
          p1_weighted: number
          p2_weighted: number
          p3_weighted: number
          individual_total_score: number
          individual_weight_percentage: number
          weighted_individual_score: number
          activity_rupiah: number | null
          calculation_metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period: string
          p1_score?: number
          p2_score?: number
          p3_score?: number
          p1_weighted?: number
          p2_weighted?: number
          p3_weighted?: number
          individual_total_score?: number
          individual_weight_percentage?: number
          weighted_individual_score?: number
          activity_rupiah?: number | null
          calculation_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period?: string
          p1_score?: number
          p2_score?: number
          p3_score?: number
          p1_weighted?: number
          p2_weighted?: number
          p3_weighted?: number
          individual_total_score?: number
          individual_weight_percentage?: number
          weighted_individual_score?: number
          activity_rupiah?: number | null
          calculation_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      t_unit_scores: {
        Row: {
          id: string
          unit_id: string
          period: string
          total_score: number
          unit_weight_percentage: number
          weighted_score: number
          unit_allocated_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          period: string
          total_score?: number
          unit_weight_percentage?: number
          weighted_score?: number
          unit_allocated_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          period?: string
          total_score?: number
          unit_weight_percentage?: number
          weighted_score?: number
          unit_allocated_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      t_calculation_results: {
        Row: {
          id: string
          employee_id: string
          period: string
          pool_id: string
          unit_scorl
          individual_score: number | null
          final_score: number | null
          unit_allocated_amount: number | null
          score_proportion: number | null
          activity_based_incentive: number | null
          index_based_incentive: number | null
          gross_incentive: number | null
          tax_amount: number | null
          net_incentive: number | null
          calculation_metadata: Json | null
          calculated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period: string
          pool_id: string
          unit_score?: number | null
          individual_score?: number | null
          final_score?: number | null
          unit_allocated_amount?: number | null
          score_proportion?: number | null
          activity_based_incentive?: number | null
          index_based_incentive?: number | null
          gross_incentive?: number | null
          tax_amount?: number | null
          net_incent: number | null
          calculation_metadata?: Json | null
          calculated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period?: string
          pool_id?: string
          unit_score?: number | null
          individual_score?: number | null
          final_score?: number | null
          unit_allocated_amount?: number | null
          score_proportion?: number | null
          activity_based_incentive?: number | null
          index_based_incentive?: number | null
          gross_incentive?: number | null
          tax_amount?: number | null
          net_incentive?: number | null
          calculation_metadata?: Json | null
          calculated_at?: string
          created_at?: string
        }
      }
      t_history_pir: {
        Row: {
          id: string
          period: string
          unit_id: string
          unit_name: string | null
          net_pool_amount: number
          proportion_percentage: number
          allocated_for_unit: number
          total_skor_kolektif: number
          pir_value: number
          employee_count: number
          created_at: string
        }
        Insert: {
          id?: string
          period: string
          unit_id: string
          unit_name?: string | null
          net_pool_amount?: number
          proportion_percentage?: number
          allocated_for_unit?: number
          total_skor_kolektif?: number
          pir_value?: number
          employee_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          period?: string
          unit_id?: string
          unit_name?: string | null
          net_pool_amount?: number
          proportion_percentage?: number
          allocated_for_unit?: number
          total_skor_kolektif?: number
          pir_value?: number
          employee_count?: number
          created_at?: string
        }
      }
      t_calculation_log: {
        Row: {
          id: string
          period: string
          status: 'success' | 'error'
          employee_count: number | null
          error_message: string | null
          error_details: Json | null
          started_at: string
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          period: string
          status: 'success' | 'error'
          employee_count?: number | null
          error_message?: string | null
          error_details?: Json | null
          started_at: string
          completed_at: string
          created_at?: string
        }
        Update: {
          id?: string
          period?: string
          status?: 'success' | 'error'
          employee_count?: number | null
          error_message?: string | null
          error_details?: Json | null
          started_at?: string
          completed_at?: string
          created_at?: string
        }
      }
      t_audit_log: {
        Row: {

  position?: string | null
  tax_status?: string
  employment_status?: string | null
  employee_status?: string | null
  tax_type?: string | null
  pns_grade?: string | null
  phone?: string | null
  nik?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active?: boolean
}
ta {
  employee_code: string
  full_name: string
  unit_id: string
  position?: string | null
  tax_status?: string
  employment_status?: string | null
  employee_status?: string | null
  tax_type?: string | null
  pns_grade?: string | null
  phone?: string | null
  nik?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active?: boolean
}

export interface UpdatePegawaiData {
  employee_code?: string
  full_name?: string
  unit_id?: stringd: string
  role?: string
  email?: string
  position?: string | null
  tax_status: string
  employment_status: string | null
  employee_status?: string | null
  tax_type?: string | null
  pns_grade: string | null
  phone?: string | null
  nik?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  m_units?: {
    name: string
  }
}

export interface CreatePegawaiDayee {
  id: string
  email: string
  role: 'superadmin' | 'unit_manager' | 'employee'
  employeeId: string
  employeeCode: string
  fullName: string
  unitId: string
  taxStatus: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================
// Master Pegawai (m_employees) Application Types
// ============================================

export interface Pegawai {
  id: string
  user_id?: string | null
  employee_code: string
  full_name: string
  unit_i_dasar?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// ============================================
// Application Type Aliases
// ============================================

/**
 * User metadata stored in auth.users.raw_user_meta_data
 */
export interface UserMetadata {
  role: 'superadmin' | 'unit_manager' | 'employee'
  full_name?: string
  employee_id?: string
  unit_id?: string
}

/**
 * Combined user and employee data
 */
export interface UserWithEmplotring
          updated_at: string
        }
        Insert: {
          id?: string
          kode_layanan: string
          nama_layanan: string
          kategori: string
          sub_kategori?: string | null
          nilai_indeks_dasar?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kode_layanan?: string
          nama_layanan?: string
          kategori?: string
          sub_kategori?: string | null
          nilai_indeks {
          id?: string
          periode?: string
          total_pagu?: number
          status?: 'draft' | 'calculated' | 'finalized' | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      remunerasi_kategori: {
        Row: {
          id: string
          kode_layanan: string
          nama_layanan: string
          kategori: string
          sub_kategori: string | null
          nilai_indeks_dasar: number
          created_at: sd: string
          periode: string
          total_pagu: number
          status: 'draft' | 'calculated' | 'finalized' | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          periode: string
          total_pagu?: number
          status?: 'draft' | 'calculated' | 'finalized' | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update:nsert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
          created_at?: string
        }
      }
      remunerasi_periode: {
        Row: {
          i
          id?: string
          user_id?: string | null
          title?: string
          message?: string
          type?: string
          read?: boolean
          link?: string | null
          created_at?: string
          read_at?: string | null
        }
      }
      t_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
          created_at: string
        }
        Iuser_id: string | null
          title: string
          message: string
          type: string
          read: boolean
          link: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          message: string
          type: string
          read?: boolean
          link?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {g | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      t_notification: {
        Row: {
          id: string
           Json | null
          details?: string | null
          created_at?: string
        }
      }
      t_auth_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          ip_address: string | null
          user_agent: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          ip_address?: strintring | null
          ip_address?: string | null
          old_value?: Json | null
          new_value?: Json | null
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
          table_name?: string
          operation?: string
          record_id?: string | null
          ip_address?: string | null
          old_value?: Json | null
          new_value?:    user_name: string | null
          table_name: string
          operation: string
          record_id: string | null
          ip_address: string | null
          old_value: Json | null
          new_value: Json | null
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
          table_name: string
          operation: string
          record_id?: s          id: string
          timestamp: string
          user_id: string | null
      