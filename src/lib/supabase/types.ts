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
      approval_history: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          actor_user_id: string | null
          created_at: string
          id: string
          institution_id: string
          metadata: Json
          new_polo_ids: string[]
          new_role: Database["public"]["Enums"]["app_role"] | null
          previous_polo_ids: string[]
          previous_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          metadata?: Json
          new_polo_ids?: string[]
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_polo_ids?: string[]
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          metadata?: Json
          new_polo_ids?: string[]
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_polo_ids?: string[]
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          institution_id: string
          name: string
          period: string | null
          polo_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          institution_id: string
          name: string
          period?: string | null
          polo_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          period?: string | null
          polo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_polo_id_fkey"
            columns: ["polo_id"]
            isOneToOne: false
            referencedRelation: "polos"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinator_courses: {
        Row: {
          course_id: string
          membership_id: string
        }
        Insert: {
          course_id: string
          membership_id: string
        }
        Update: {
          course_id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_courses_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinator_polos: {
        Row: {
          membership_id: string
          polo_id: string
        }
        Insert: {
          membership_id: string
          polo_id: string
        }
        Update: {
          membership_id?: string
          polo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_polos_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_polos_polo_id_fkey"
            columns: ["polo_id"]
            isOneToOne: false
            referencedRelation: "polos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_polos: {
        Row: {
          course_id: string
          polo_id: string
        }
        Insert: {
          course_id: string
          polo_id: string
        }
        Update: {
          course_id?: string
          polo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_polos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_polos_polo_id_fkey"
            columns: ["polo_id"]
            isOneToOne: false
            referencedRelation: "polos"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          created_at: string
          id: string
          institution_id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          institution_id: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_template_fields: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["grade_field_kind"]
          label: string
          max_value: number
          order_index: number
          template_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["grade_field_kind"]
          label: string
          max_value?: number
          order_index?: number
          template_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["grade_field_kind"]
          label?: string
          max_value?: number
          order_index?: number
          template_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "grade_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_templates: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_templates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          class_id: string
          created_at: string
          id: string
          institution_id: string
          status_value: string | null
          student_id: string
          subject_id: string
          template_field_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          institution_id: string
          status_value?: string | null
          student_id: string
          subject_id: string
          template_field_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          status_value?: string | null
          student_id?: string
          subject_id?: string
          template_field_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_template_field_id_fkey"
            columns: ["template_field_id"]
            isOneToOne: false
            referencedRelation: "grade_template_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          city: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          state: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          state: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          course_ids: string[]
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          institution_id: string
          polo_ids: string[]
          role: Database["public"]["Enums"]["app_role"] | null
          single_use: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          course_ids?: string[]
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          institution_id: string
          polo_ids?: string[]
          role?: Database["public"]["Enums"]["app_role"] | null
          single_use?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          course_ids?: string[]
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          institution_id?: string
          polo_ids?: string[]
          role?: Database["public"]["Enums"]["app_role"] | null
          single_use?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polos: {
        Row: {
          city: string | null
          created_at: string
          id: string
          institution_id: string
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          institution_id: string
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polos_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_sign_in_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          class_id: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          institution_id: string
          name: string
          registration: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          class_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          name: string
          registration: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          class_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          name?: string
          registration?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          course_id: string
          created_at: string
          id: string
          institution_id: string
          name: string
          updated_at: string
          workload_hours: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          institution_id: string
          name: string
          updated_at?: string
          workload_hours?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          updated_at?: string
          workload_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_course: { Args: { _course_id: string }; Returns: boolean }
      can_access_polo: { Args: { _polo_id: string }; Returns: boolean }
      can_see_class: { Args: { _class_id: string }; Returns: boolean }
      can_see_course: { Args: { _course_id: string }; Returns: boolean }
      can_see_polo: { Args: { _polo_id: string }; Returns: boolean }
      get_role_in: {
        Args: { _institution_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role_in: {
        Args: {
          _institution_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      has_role_in: {
        Args: {
          _institution_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_member_of: { Args: { _institution_id: string }; Returns: boolean }
      seed_default_grade_template: {
        Args: { _institution_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "coord_geral" | "coord_polo"
      approval_action:
        | "invite_redeemed"
        | "role_changed"
        | "polos_changed"
        | "removed"
      grade_field_kind: "score" | "average" | "status"
      student_status:
        | "ativo"
        | "trancado"
        | "formado"
        | "evadido"
        | "transferido"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "coord_geral", "coord_polo"],
      approval_action: [
        "invite_redeemed",
        "role_changed",
        "polos_changed",
        "removed",
      ],
      grade_field_kind: ["score", "average", "status"],
      student_status: [
        "ativo",
        "trancado",
        "formado",
        "evadido",
        "transferido",
      ],
    },
  },
} as const
