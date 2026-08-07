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
      appointments: {
        Row: {
          amount: number | null
          branch_id: string | null
          created_at: string
          created_by: string
          dentist_id: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          created_at?: string
          created_by: string
          dentist_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          created_at?: string
          created_by?: string
          dentist_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_dentist_id_profiles_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          appointment_id: string
          branch_id: string | null
          channel: string
          created_at: string
          created_by: string
          error_message: string | null
          event_type: string
          id: string
          patient_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          branch_id?: string | null
          channel: string
          created_at?: string
          created_by: string
          error_message?: string | null
          event_type: string
          id?: string
          patient_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          event_type?: string
          id?: string
          patient_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_appointment_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_branches: {
        Row: {
          branch_id: string
          dentist_id: string
        }
        Insert: {
          branch_id: string
          dentist_id: string
        }
        Update: {
          branch_id?: string
          dentist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_branches_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          current_stock: number
          id: string
          min_stock: number
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          current_stock?: number
          id?: string
          min_stock?: number
          name: string
          unit: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          current_stock?: number
          id?: string
          min_stock?: number
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      odontogram_records: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          patient_id: string
          status: string
          tooth_face: string | null
          tooth_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          patient_id: string
          status: string
          tooth_face?: string | null
          tooth_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          tooth_face?: string | null
          tooth_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "odontogram_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          branch_id: string | null
          bucket_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          document_type: string
          file_name: string
          file_path: string
          id: string
          patient_id: string
          restored_at: string | null
          uploaded_by: string
        }
        Insert: {
          branch_id?: string | null
          bucket_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document_type: string
          file_name: string
          file_path: string
          id?: string
          patient_id: string
          restored_at?: string | null
          uploaded_by: string
        }
        Update: {
          branch_id?: string | null
          bucket_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          id?: string
          patient_id?: string
          restored_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_images: {
        Row: {
          branch_id: string | null
          bucket_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          file_name: string
          file_path: string
          id: string
          image_type: string
          patient_id: string
          uploaded_by: string
        }
        Insert: {
          branch_id?: string | null
          bucket_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_name: string
          file_path: string
          id?: string
          image_type: string
          patient_id: string
          uploaded_by: string
        }
        Update: {
          branch_id?: string | null
          bucket_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          id?: string
          image_type?: string
          patient_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_images_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_images_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_payments: {
        Row: {
          amount: number
          appointment_id: string
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          patient_id: string
          reason: string | null
          reversed_payment_id: string | null
          type: string
        }
        Insert: {
          amount: number
          appointment_id: string
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          reason?: string | null
          reversed_payment_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          reason?: string | null
          reversed_payment_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_payments_patient_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_payments_reversed_payment_id_fkey"
            columns: ["reversed_payment_id"]
            isOneToOne: false
            referencedRelation: "patient_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          birth_date: string
          branch_id: string | null
          created_at: string
          created_by: string
          current_medications: string | null
          diseases: string | null
          document_id: string
          email: string | null
          full_name: string
          id: string
          medical_observations: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          birth_date: string
          branch_id?: string | null
          created_at?: string
          created_by: string
          current_medications?: string | null
          diseases?: string | null
          document_id: string
          email?: string | null
          full_name: string
          id?: string
          medical_observations?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          birth_date?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string
          current_medications?: string | null
          diseases?: string | null
          document_id?: string
          email?: string | null
          full_name?: string
          id?: string
          medical_observations?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      appointment_range: {
        Args: { duration_minutes: number; starts_at: string }
        Returns: unknown
      }
      get_financial_report: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: Json
      }
      get_unique_patients_with_logs: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      insert_communication_log: {
        Args: {
          p_appointment_id: string
          p_channel: string
          p_event_type: string
          p_patient_id: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_odontologo: { Args: never; Returns: boolean }
      register_inventory_movement: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_reason: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      register_patient_payment: {
        Args: {
          p_amount: number
          p_appointment_id: string
          p_patient_id: string
          p_reason?: string
          p_reversed_payment_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      update_communication_log_status: {
        Args: { p_error_message?: string; p_log_id: string; p_status: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
