export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment: {
        Row: {
          case_id: string | null
          created_at: string
          deleted_at: string | null
          duration_min: number
          id: string
          notes: string | null
          patient_id: string
          patient_informed_at: string | null
          pg_id: string
          planned_stage_id: string | null
          rescheduled_from_id: string | null
          starts_at: string
          status: string
          status_changed_at: string | null
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_min: number
          id?: string
          notes?: string | null
          patient_id: string
          patient_informed_at?: string | null
          pg_id?: string
          planned_stage_id?: string | null
          rescheduled_from_id?: string | null
          starts_at: string
          status?: string
          status_changed_at?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_min?: number
          id?: string
          notes?: string | null
          patient_id?: string
          patient_informed_at?: string | null
          pg_id?: string
          planned_stage_id?: string | null
          rescheduled_from_id?: string | null
          starts_at?: string
          status?: string
          status_changed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_case_same_patient"
            columns: ["case_id", "patient_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "patient_case"
            referencedColumns: ["id", "patient_id", "pg_id"]
          },
          {
            foreignKeyName: "appointment_patient_same_pg"
            columns: ["patient_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id", "pg_id"]
          },
          {
            foreignKeyName: "appointment_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_planned_stage_id_fkey"
            columns: ["planned_stage_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_rescheduled_from_same_pg"
            columns: ["rescheduled_from_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id", "pg_id"]
          },
        ]
      }
      case_type: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          specialty_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          specialty_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_type_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialty"
            referencedColumns: ["id"]
          },
        ]
      }
      file: {
        Row: {
          captured_on: string
          case_id: string
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          label: string
          mime_type: string
          pg_id: string
          size_bytes: number
          stage_id: string | null
          storage_path: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          captured_on?: string
          case_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind: string
          label: string
          mime_type: string
          pg_id?: string
          size_bytes: number
          stage_id?: string | null
          storage_path: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          captured_on?: string
          case_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          label?: string
          mime_type?: string
          pg_id?: string
          size_bytes?: number
          stage_id?: string | null
          storage_path?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_case_same_pg"
            columns: ["case_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "patient_case"
            referencedColumns: ["id", "pg_id"]
          },
          {
            foreignKeyName: "file_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_visit_same_case"
            columns: ["visit_id", "case_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "visit"
            referencedColumns: ["id", "case_id", "pg_id"]
          },
        ]
      }
      modifier: {
        Row: {
          case_type_id: string
          code: string
          created_at: string
          group_label: string
          id: string
          is_placeholder: boolean
          label: string
          override_duration_min: number | null
          override_gap_max_days: number | null
          override_gap_min_days: number | null
          override_next_stage_id: string | null
          sort_order: number
          stage_id: string | null
        }
        Insert: {
          case_type_id: string
          code: string
          created_at?: string
          group_label: string
          id?: string
          is_placeholder?: boolean
          label: string
          override_duration_min?: number | null
          override_gap_max_days?: number | null
          override_gap_min_days?: number | null
          override_next_stage_id?: string | null
          sort_order?: number
          stage_id?: string | null
        }
        Update: {
          case_type_id?: string
          code?: string
          created_at?: string
          group_label?: string
          id?: string
          is_placeholder?: boolean
          label?: string
          override_duration_min?: number | null
          override_gap_max_days?: number | null
          override_gap_min_days?: number | null
          override_next_stage_id?: string | null
          sort_order?: number
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modifier_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_next_stage_same_case_type"
            columns: ["override_next_stage_id", "case_type_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id", "case_type_id"]
          },
          {
            foreignKeyName: "modifier_stage_same_case_type"
            columns: ["stage_id", "case_type_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id", "case_type_id"]
          },
        ]
      }
      patient: {
        Row: {
          age: number | null
          created_at: string
          deleted_at: string | null
          full_name: string
          id: string
          notes: string | null
          opd_number: string | null
          pg_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          deleted_at?: string | null
          full_name: string
          id?: string
          notes?: string | null
          opd_number?: string | null
          pg_id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          opd_number?: string | null
          pg_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_case: {
        Row: {
          case_type_id: string
          completed_at: string | null
          created_at: string
          current_stage_id: string | null
          deleted_at: string | null
          id: string
          is_special: boolean
          notes: string | null
          patient_id: string
          pg_id: string
          started_on: string
          status: string
          tooth: string | null
          updated_at: string
        }
        Insert: {
          case_type_id: string
          completed_at?: string | null
          created_at?: string
          current_stage_id?: string | null
          deleted_at?: string | null
          id?: string
          is_special?: boolean
          notes?: string | null
          patient_id: string
          pg_id?: string
          started_on?: string
          status?: string
          tooth?: string | null
          updated_at?: string
        }
        Update: {
          case_type_id?: string
          completed_at?: string | null
          created_at?: string
          current_stage_id?: string | null
          deleted_at?: string | null
          id?: string
          is_special?: boolean
          notes?: string | null
          patient_id?: string
          pg_id?: string
          started_on?: string
          status?: string
          tooth?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_case_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_case_patient_same_pg"
            columns: ["patient_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "patient"
            referencedColumns: ["id", "pg_id"]
          },
          {
            foreignKeyName: "patient_case_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_case_stage_same_case_type"
            columns: ["current_stage_id", "case_type_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id", "case_type_id"]
          },
        ]
      }
      pg_blocked_time: {
        Row: {
          created_at: string
          deleted_at: string | null
          end_time: string | null
          ends_at: string | null
          id: string
          kind: string
          label: string
          pg_id: string
          start_time: string | null
          starts_at: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          ends_at?: string | null
          id?: string
          kind: string
          label: string
          pg_id?: string
          start_time?: string | null
          starts_at?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          label?: string
          pg_id?: string
          start_time?: string | null
          starts_at?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pg_blocked_time_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      pg_modifier_override: {
        Row: {
          created_at: string
          duration_min: number | null
          gap_max_days: number | null
          gap_min_days: number | null
          id: string
          modifier_id: string
          pg_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          gap_max_days?: number | null
          gap_min_days?: number | null
          id?: string
          modifier_id: string
          pg_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          gap_max_days?: number | null
          gap_min_days?: number | null
          id?: string
          modifier_id?: string
          pg_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pg_modifier_override_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "modifier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pg_modifier_override_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      pg_preferences: {
        Row: {
          created_at: string
          pg_id: string
          reminder_timing: string
          scheduling_mode: string
          slot_step_min: number
          updated_at: string
          working_hours: Json
        }
        Insert: {
          created_at?: string
          pg_id?: string
          reminder_timing?: string
          scheduling_mode?: string
          slot_step_min?: number
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          created_at?: string
          pg_id?: string
          reminder_timing?: string
          scheduling_mode?: string
          slot_step_min?: number
          updated_at?: string
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pg_preferences_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: true
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      pg_profile: {
        Row: {
          college: string
          created_at: string
          full_name: string
          id: string
          onboarded_at: string
          specialty_id: string
          updated_at: string
        }
        Insert: {
          college: string
          created_at?: string
          full_name: string
          id: string
          onboarded_at?: string
          specialty_id: string
          updated_at?: string
        }
        Update: {
          college?: string
          created_at?: string
          full_name?: string
          id?: string
          onboarded_at?: string
          specialty_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pg_profile_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialty"
            referencedColumns: ["id"]
          },
        ]
      }
      pg_stage_override: {
        Row: {
          created_at: string
          duration_min: number | null
          gap_max_days: number | null
          gap_min_days: number | null
          id: string
          pg_id: string
          stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          gap_max_days?: number | null
          gap_min_days?: number | null
          id?: string
          pg_id?: string
          stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          gap_max_days?: number | null
          gap_min_days?: number | null
          id?: string
          pg_id?: string
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pg_stage_override_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pg_stage_override_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id"]
          },
        ]
      }
      specialty: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      stage: {
        Row: {
          case_type_id: string
          code: string
          created_at: string
          default_duration_min: number
          default_gap_max_days: number | null
          default_gap_min_days: number | null
          id: string
          is_placeholder: boolean
          name: string
          next_stage_on_complete_id: string | null
          next_stage_on_partial_id: string | null
          sort_order: number
        }
        Insert: {
          case_type_id: string
          code: string
          created_at?: string
          default_duration_min: number
          default_gap_max_days?: number | null
          default_gap_min_days?: number | null
          id?: string
          is_placeholder?: boolean
          name: string
          next_stage_on_complete_id?: string | null
          next_stage_on_partial_id?: string | null
          sort_order: number
        }
        Update: {
          case_type_id?: string
          code?: string
          created_at?: string
          default_duration_min?: number
          default_gap_max_days?: number | null
          default_gap_min_days?: number | null
          id?: string
          is_placeholder?: boolean
          name?: string
          next_stage_on_complete_id?: string | null
          next_stage_on_partial_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "stage_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_next_on_complete_same_case_type"
            columns: ["next_stage_on_complete_id", "case_type_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id", "case_type_id"]
          },
          {
            foreignKeyName: "stage_next_on_partial_same_case_type"
            columns: ["next_stage_on_partial_id", "case_type_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id", "case_type_id"]
          },
        ]
      }
      visit: {
        Row: {
          appointment_id: string | null
          case_id: string
          created_at: string
          deleted_at: string | null
          id: string
          modifier_id: string | null
          next_stage_id: string | null
          note: string | null
          pg_id: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          appointment_id?: string | null
          case_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          modifier_id?: string | null
          next_stage_id?: string | null
          note?: string | null
          pg_id?: string
          updated_at?: string
          visit_date?: string
        }
        Update: {
          appointment_id?: string | null
          case_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          modifier_id?: string | null
          next_stage_id?: string | null
          note?: string | null
          pg_id?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_appointment_same_pg"
            columns: ["appointment_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id", "pg_id"]
          },
          {
            foreignKeyName: "visit_case_same_pg"
            columns: ["case_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "patient_case"
            referencedColumns: ["id", "pg_id"]
          },
          {
            foreignKeyName: "visit_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "modifier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_next_stage_id_fkey"
            columns: ["next_stage_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_stage: {
        Row: {
          created_at: string
          id: string
          outcome: string
          pg_id: string
          sort_order: number
          stage_id: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          pg_id?: string
          sort_order?: number
          stage_id: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          pg_id?: string
          sort_order?: number
          stage_id?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_stage_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pg_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_stage_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_stage_visit_same_pg"
            columns: ["visit_id", "pg_id"]
            isOneToOne: false
            referencedRelation: "visit"
            referencedColumns: ["id", "pg_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_stage_in_case: {
        Args: { p_case_id: string; p_column: string; p_stage_id: string }
        Returns: undefined
      }
      ist_today: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
