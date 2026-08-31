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
      body_measurements: {
        Row: {
          created_at: string
          id: string
          measurement_type: Database["public"]["Enums"]["measurement_type"]
          notes: string | null
          recorded_at: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_type: Database["public"]["Enums"]["measurement_type"]
          notes?: string | null
          recorded_at?: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          measurement_type?: Database["public"]["Enums"]["measurement_type"]
          notes?: string | null
          recorded_at?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      milestones: {
        Row: {
          achieved_at: string
          created_at: string
          id: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_type?: Database["public"]["Enums"]["milestone_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          locale: string
          onboarding_completed: boolean
          sex: string | null
          timezone: string
          unit_system: Database["public"]["Enums"]["unit_system"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          locale?: string
          onboarding_completed?: boolean
          sex?: string | null
          timezone?: string
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          locale?: string
          onboarding_completed?: boolean
          sex?: string | null
          timezone?: string
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_type: Database["public"]["Enums"]["progress_photo_type"]
          recorded_at: string
          storage_path: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_type?: Database["public"]["Enums"]["progress_photo_type"]
          recorded_at?: string
          storage_path: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_type?: Database["public"]["Enums"]["progress_photo_type"]
          recorded_at?: string
          storage_path?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          created_at: string
          daily_calorie_target: number
          daily_carbs_target: number
          daily_fat_target: number
          daily_protein_target: number
          daily_step_target: number
          daily_water_target: number
          goal_type: Database["public"]["Enums"]["goal_type"]
          goal_weight: number
          height: number
          id: string
          is_active: boolean
          starting_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          created_at?: string
          daily_calorie_target: number
          daily_carbs_target: number
          daily_fat_target: number
          daily_protein_target: number
          daily_step_target: number
          daily_water_target: number
          goal_type?: Database["public"]["Enums"]["goal_type"]
          goal_weight: number
          height: number
          id?: string
          is_active?: boolean
          starting_weight: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"]
          created_at?: string
          daily_calorie_target?: number
          daily_carbs_target?: number
          daily_fat_target?: number
          daily_protein_target?: number
          daily_step_target?: number
          daily_water_target?: number
          goal_type?: Database["public"]["Enums"]["goal_type"]
          goal_weight?: number
          height?: number
          id?: string
          is_active?: boolean
          starting_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          recorded_at: string
          source: Database["public"]["Enums"]["progress_source"]
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          source?: Database["public"]["Enums"]["progress_source"]
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          source?: Database["public"]["Enums"]["progress_source"]
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: {
          p_activity_level: Database["public"]["Enums"]["activity_level"]
          p_daily_calorie_target: number
          p_daily_carbs_target: number
          p_daily_fat_target: number
          p_daily_protein_target: number
          p_daily_step_target: number
          p_daily_water_target: number
          p_date_of_birth: string
          p_display_name: string
          p_first_name: string
          p_goal_type: Database["public"]["Enums"]["goal_type"]
          p_goal_weight: number
          p_height: number
          p_last_name: string
          p_starting_weight: number
          p_unit_system: Database["public"]["Enums"]["unit_system"]
        }
        Returns: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          created_at: string
          daily_calorie_target: number
          daily_carbs_target: number
          daily_fat_target: number
          daily_protein_target: number
          daily_step_target: number
          daily_water_target: number
          goal_type: Database["public"]["Enums"]["goal_type"]
          goal_weight: number
          height: number
          id: string
          is_active: boolean
          starting_weight: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_goal_settings: {
        Args: {
          p_activity_level: Database["public"]["Enums"]["activity_level"]
          p_daily_calorie_target: number
          p_daily_carbs_target: number
          p_daily_fat_target: number
          p_daily_protein_target: number
          p_daily_step_target: number
          p_daily_water_target: number
          p_goal_type: Database["public"]["Enums"]["goal_type"]
          p_goal_weight: number
          p_unit_system: Database["public"]["Enums"]["unit_system"]
        }
        Returns: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          created_at: string
          daily_calorie_target: number
          daily_carbs_target: number
          daily_fat_target: number
          daily_protein_target: number
          daily_step_target: number
          daily_water_target: number
          goal_type: Database["public"]["Enums"]["goal_type"]
          goal_weight: number
          height: number
          id: string
          is_active: boolean
          starting_weight: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      activity_level:
        | "sedentary"
        | "lightly_active"
        | "moderately_active"
        | "very_active"
        | "extra_active"
      app_role: "user" | "coach" | "admin"
      goal_type: "lose_weight" | "maintain_weight" | "gain_weight"
      measurement_type:
        | "waist"
        | "hips"
        | "chest"
        | "neck"
        | "left_arm"
        | "right_arm"
        | "left_thigh"
        | "right_thigh"
        | "body_fat"
      milestone_type: "first_weight" | "five_weights" | "goal_reached"
      progress_photo_type: "front" | "side" | "back" | "other"
      progress_source:
        | "manual"
        | "import"
        | "apple_health"
        | "health_connect"
        | "coach"
      unit_system: "metric" | "imperial"
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
      activity_level: [
        "sedentary",
        "lightly_active",
        "moderately_active",
        "very_active",
        "extra_active",
      ],
      app_role: ["user", "coach", "admin"],
      goal_type: ["lose_weight", "maintain_weight", "gain_weight"],
      measurement_type: [
        "waist",
        "hips",
        "chest",
        "neck",
        "left_arm",
        "right_arm",
        "left_thigh",
        "right_thigh",
        "body_fat",
      ],
      milestone_type: ["first_weight", "five_weights", "goal_reached"],
      progress_photo_type: ["front", "side", "back", "other"],
      progress_source: [
        "manual",
        "import",
        "apple_health",
        "health_connect",
        "coach",
      ],
      unit_system: ["metric", "imperial"],
    },
  },
} as const
