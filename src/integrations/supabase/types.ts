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
      fleet_settings: {
        Row: {
          average_ticket_inr: number
          created_at: string
          critical_shutdown_limit: number
          id: string
          rope_replacement_trigger: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_ticket_inr?: number
          created_at?: string
          critical_shutdown_limit?: number
          id?: string
          rope_replacement_trigger?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_ticket_inr?: number
          created_at?: string
          critical_shutdown_limit?: number
          id?: string
          rope_replacement_trigger?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fleet_telemetry_rows: {
        Row: {
          created_at: string
          current_draw_a: number | null
          door_cycles_hour: number | null
          door_open_close_ms: number | null
          elevator_id: string
          id: string
          install_year: number | null
          leveling_accuracy_mm: number | null
          main_rope_condition: number | null
          motor_temp_c: number | null
          recorded_at: string | null
          source_row: Json
          target_state: string | null
          timestamp_text: string | null
          updated_at: string
          user_id: string
          vibration_rms: number | null
        }
        Insert: {
          created_at?: string
          current_draw_a?: number | null
          door_cycles_hour?: number | null
          door_open_close_ms?: number | null
          elevator_id: string
          id?: string
          install_year?: number | null
          leveling_accuracy_mm?: number | null
          main_rope_condition?: number | null
          motor_temp_c?: number | null
          recorded_at?: string | null
          source_row?: Json
          target_state?: string | null
          timestamp_text?: string | null
          updated_at?: string
          user_id: string
          vibration_rms?: number | null
        }
        Update: {
          created_at?: string
          current_draw_a?: number | null
          door_cycles_hour?: number | null
          door_open_close_ms?: number | null
          elevator_id?: string
          id?: string
          install_year?: number | null
          leveling_accuracy_mm?: number | null
          main_rope_condition?: number | null
          motor_temp_c?: number | null
          recorded_at?: string | null
          source_row?: Json
          target_state?: string | null
          timestamp_text?: string | null
          updated_at?: string
          user_id?: string
          vibration_rms?: number | null
        }
        Relationships: []
      }
      fleet_units: {
        Row: {
          brake_wear: number | null
          callbacks_90d: number | null
          controller_type: string | null
          created_at: string
          customer_name: string | null
          door_cycles: number | null
          downtime_hours_90d: number | null
          health_score: number | null
          id: string
          install_year: number | null
          lead_status: string | null
          location: string | null
          main_rope_condition: number | null
          region: string | null
          source_row: Json
          trips_per_day: number | null
          unit_id: string
          updated_at: string
          uploaded_at: string
          user_id: string
          vibration_mm_s: number | null
        }
        Insert: {
          brake_wear?: number | null
          callbacks_90d?: number | null
          controller_type?: string | null
          created_at?: string
          customer_name?: string | null
          door_cycles?: number | null
          downtime_hours_90d?: number | null
          health_score?: number | null
          id?: string
          install_year?: number | null
          lead_status?: string | null
          location?: string | null
          main_rope_condition?: number | null
          region?: string | null
          source_row?: Json
          trips_per_day?: number | null
          unit_id: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
          vibration_mm_s?: number | null
        }
        Update: {
          brake_wear?: number | null
          callbacks_90d?: number | null
          controller_type?: string | null
          created_at?: string
          customer_name?: string | null
          door_cycles?: number | null
          downtime_hours_90d?: number | null
          health_score?: number | null
          id?: string
          install_year?: number | null
          lead_status?: string | null
          location?: string | null
          main_rope_condition?: number | null
          region?: string | null
          source_row?: Json
          trips_per_day?: number | null
          unit_id?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
          vibration_mm_s?: number | null
        }
        Relationships: []
      }
      generated_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          id: string
          payload: Json
          title: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artifact_type: string
          created_at?: string
          id?: string
          payload?: Json
          title: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artifact_type?: string
          created_at?: string
          id?: string
          payload?: Json
          title?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_tickets: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          owner: string | null
          priority: string
          status: string
          title: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner?: string | null
          priority?: string
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner?: string | null
          priority?: string
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
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
      app_role: ["admin", "operator", "viewer"],
    },
  },
} as const
