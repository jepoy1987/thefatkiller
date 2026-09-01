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
      daily_check_ins: {
        Row: {
          challenge_of_day: string | null
          check_in_date: string
          created_at: string
          energy: number | null
          hunger: number | null
          id: string
          mood: number | null
          notes: string | null
          sleep_quality: number | null
          stress: number | null
          updated_at: string
          user_id: string
          win_of_day: string | null
        }
        Insert: {
          challenge_of_day?: string | null
          check_in_date: string
          created_at?: string
          energy?: number | null
          hunger?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_quality?: number | null
          stress?: number | null
          updated_at?: string
          user_id: string
          win_of_day?: string | null
        }
        Update: {
          challenge_of_day?: string | null
          check_in_date?: string
          created_at?: string
          energy?: number | null
          hunger?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_quality?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
          win_of_day?: string | null
        }
        Relationships: []
      }
      features: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          brand_snapshot: string | null
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          food_name_snapshot: string
          id: string
          logged_at: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          protein_g: number
          serving_size_snapshot: number
          serving_unit_snapshot: string
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_snapshot?: string | null
          calories: number
          carbs_g: number
          created_at?: string
          fat_g: number
          fiber_g?: number | null
          food_id?: string | null
          food_name_snapshot: string
          id?: string
          logged_at?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          protein_g: number
          serving_size_snapshot: number
          serving_unit_snapshot: string
          servings: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_snapshot?: string | null
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          food_name_snapshot?: string
          id?: string
          logged_at?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          protein_g?: number
          serving_size_snapshot?: number
          serving_unit_snapshot?: string
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          calories: number
          carbs_g: number
          created_at: string
          external_id: string | null
          fat_g: number
          fiber_g: number | null
          id: string
          is_favorite: boolean
          name: string
          owner_user_id: string | null
          protein_g: number
          serving_size: number
          serving_unit: string
          sodium_mg: number | null
          source: Database["public"]["Enums"]["food_source"]
          sugar_g: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          calories: number
          carbs_g: number
          created_at?: string
          external_id?: string | null
          fat_g: number
          fiber_g?: number | null
          id?: string
          is_favorite?: boolean
          name: string
          owner_user_id?: string | null
          protein_g: number
          serving_size: number
          serving_unit: string
          sodium_mg?: number | null
          source?: Database["public"]["Enums"]["food_source"]
          sugar_g?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          calories?: number
          carbs_g?: number
          created_at?: string
          external_id?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          is_favorite?: boolean
          name?: string
          owner_user_id?: string | null
          protein_g?: number
          serving_size?: number
          serving_unit?: string
          sodium_mg?: number | null
          source?: Database["public"]["Enums"]["food_source"]
          sugar_g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      glp1_dose_logs: {
        Row: {
          created_at: string
          dose_amount: number | null
          dose_unit: Database["public"]["Enums"]["glp1_dose_unit"] | null
          event_type: Database["public"]["Enums"]["glp1_dose_event_type"]
          id: string
          injection_site:
            | Database["public"]["Enums"]["glp1_injection_site"]
            | null
          medication_profile_id: string
          notes: string | null
          taken_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose_amount?: number | null
          dose_unit?: Database["public"]["Enums"]["glp1_dose_unit"] | null
          event_type: Database["public"]["Enums"]["glp1_dose_event_type"]
          id?: string
          injection_site?:
            | Database["public"]["Enums"]["glp1_injection_site"]
            | null
          medication_profile_id: string
          notes?: string | null
          taken_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose_amount?: number | null
          dose_unit?: Database["public"]["Enums"]["glp1_dose_unit"] | null
          event_type?: Database["public"]["Enums"]["glp1_dose_event_type"]
          id?: string
          injection_site?:
            | Database["public"]["Enums"]["glp1_injection_site"]
            | null
          medication_profile_id?: string
          notes?: string | null
          taken_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glp1_dose_logs_medication_profile_id_user_id_fkey"
            columns: ["medication_profile_id", "user_id"]
            isOneToOne: false
            referencedRelation: "glp1_medication_profiles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      glp1_medication_profiles: {
        Row: {
          created_at: string
          custom_medication_name: string | null
          id: string
          is_active: boolean
          medication_name: Database["public"]["Enums"]["glp1_medication"]
          notes: string | null
          prescribed_schedule:
            | Database["public"]["Enums"]["glp1_schedule"]
            | null
          started_on: string | null
          updated_at: string
          user_id: string
          usual_day_of_week: number | null
          usual_time: string | null
        }
        Insert: {
          created_at?: string
          custom_medication_name?: string | null
          id?: string
          is_active?: boolean
          medication_name: Database["public"]["Enums"]["glp1_medication"]
          notes?: string | null
          prescribed_schedule?:
            | Database["public"]["Enums"]["glp1_schedule"]
            | null
          started_on?: string | null
          updated_at?: string
          user_id: string
          usual_day_of_week?: number | null
          usual_time?: string | null
        }
        Update: {
          created_at?: string
          custom_medication_name?: string | null
          id?: string
          is_active?: boolean
          medication_name?: Database["public"]["Enums"]["glp1_medication"]
          notes?: string | null
          prescribed_schedule?:
            | Database["public"]["Enums"]["glp1_schedule"]
            | null
          started_on?: string | null
          updated_at?: string
          user_id?: string
          usual_day_of_week?: number | null
          usual_time?: string | null
        }
        Relationships: []
      }
      glp1_symptom_logs: {
        Row: {
          abdominal_discomfort: number | null
          appetite: number | null
          constipation: number | null
          created_at: string
          diarrhea: number | null
          dose_log_id: string | null
          fatigue: number | null
          headache: number | null
          hunger: number | null
          id: string
          logged_at: string
          medication_profile_id: string | null
          nausea: number | null
          notes: string | null
          other_symptoms: string | null
          reflux: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abdominal_discomfort?: number | null
          appetite?: number | null
          constipation?: number | null
          created_at?: string
          diarrhea?: number | null
          dose_log_id?: string | null
          fatigue?: number | null
          headache?: number | null
          hunger?: number | null
          id?: string
          logged_at: string
          medication_profile_id?: string | null
          nausea?: number | null
          notes?: string | null
          other_symptoms?: string | null
          reflux?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abdominal_discomfort?: number | null
          appetite?: number | null
          constipation?: number | null
          created_at?: string
          diarrhea?: number | null
          dose_log_id?: string | null
          fatigue?: number | null
          headache?: number | null
          hunger?: number | null
          id?: string
          logged_at?: string
          medication_profile_id?: string | null
          nausea?: number | null
          notes?: string | null
          other_symptoms?: string | null
          reflux?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glp1_symptom_logs_dose_log_id_user_id_fkey"
            columns: ["dose_log_id", "user_id"]
            isOneToOne: false
            referencedRelation: "glp1_dose_logs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "glp1_symptom_logs_medication_profile_id_user_id_fkey"
            columns: ["medication_profile_id", "user_id"]
            isOneToOne: false
            referencedRelation: "glp1_medication_profiles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed_on: string
          created_at: string
          habit_id: string
          id: string
          notes: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          completed_on: string
          created_at?: string
          habit_id: string
          id?: string
          notes?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          completed_on?: string
          created_at?: string
          habit_id?: string
          id?: string
          notes?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: Database["public"]["Enums"]["habit_category"]
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["habit_frequency"]
          id: string
          is_active: boolean
          name: string
          sort_order: number
          target_per_period: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["habit_category"]
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          target_per_period?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["habit_category"]
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          target_per_period?: number
          updated_at?: string
          user_id?: string
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
      plan_entitlements: {
        Row: {
          created_at: string
          enabled: boolean
          feature_id: string
          id: string
          limits: Json
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_id: string
          id?: string
          limits?: Json
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_id?: string
          id?: string
          limits?: Json
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
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
      saved_meal_items: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          food_id: string | null
          food_name_snapshot: string
          id: string
          position: number
          protein_g: number
          saved_meal_id: string
          serving_size_snapshot: number
          serving_unit_snapshot: string
          servings: number
        }
        Insert: {
          calories: number
          carbs_g: number
          created_at?: string
          fat_g: number
          food_id?: string | null
          food_name_snapshot: string
          id?: string
          position?: number
          protein_g: number
          saved_meal_id: string
          serving_size_snapshot: number
          serving_unit_snapshot: string
          servings: number
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_id?: string | null
          food_name_snapshot?: string
          id?: string
          position?: number
          protein_g?: number
          saved_meal_id?: string
          serving_size_snapshot?: number
          serving_unit_snapshot?: string
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_meal_items_saved_meal_id_fkey"
            columns: ["saved_meal_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_meals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
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
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          provider?: Database["public"]["Enums"]["billing_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          logged_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_check_ins: {
        Row: {
          biggest_challenge: string | null
          biggest_win: string | null
          created_at: string
          focus_next_week: string | null
          id: string
          movement_rating: number | null
          notes: string | null
          nutrition_rating: number | null
          overall_rating: number | null
          sleep_rating: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          biggest_challenge?: string | null
          biggest_win?: string | null
          created_at?: string
          focus_next_week?: string | null
          id?: string
          movement_rating?: number | null
          notes?: string | null
          nutrition_rating?: number | null
          overall_rating?: number | null
          sleep_rating?: number | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          biggest_challenge?: string | null
          biggest_win?: string | null
          created_at?: string
          focus_next_week?: string | null
          id?: string
          movement_rating?: number | null
          notes?: string | null
          nutrition_rating?: number | null
          overall_rating?: number | null
          sleep_rating?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
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
      admin_assign_internal_plan: {
        Args: { target_plan_code: string; target_user_id: string }
        Returns: string
      }
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
      get_current_entitlements: {
        Args: never
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          current_period_start: string
          feature_codes: string[]
          is_internal_test: boolean
          limits: Json
          plan_code: string
          plan_name: string
          provider: Database["public"]["Enums"]["billing_provider"]
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string
        }[]
      }
      get_daily_nutrition: {
        Args: { p_date: string }
        Returns: {
          calories: number
          carbs_g: number
          fat_g: number
          protein_g: number
          water_ml: number
        }[]
      }
      has_current_feature: {
        Args: { p_feature_code: string }
        Returns: boolean
      }
      log_saved_meal: {
        Args: {
          p_logged_at: string
          p_meal_type: Database["public"]["Enums"]["meal_type"]
          p_saved_meal_id: string
        }
        Returns: {
          brand_snapshot: string | null
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          food_name_snapshot: string
          id: string
          logged_at: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          protein_g: number
          serving_size_snapshot: number
          serving_unit_snapshot: string
          servings: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "food_logs"
          isOneToOne: false
          isSetofReturn: true
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
      billing_provider: "internal" | "stripe" | "apple" | "google" | "manual"
      food_source: "manual" | "system" | "provider" | "barcode"
      glp1_dose_event_type: "taken" | "missed" | "skipped"
      glp1_dose_unit: "mg" | "mcg" | "units" | "other"
      glp1_injection_site:
        | "abdomen"
        | "thigh"
        | "upper_arm"
        | "other"
        | "not_applicable"
      glp1_medication: "semaglutide" | "tirzepatide" | "liraglutide" | "other"
      glp1_schedule: "daily" | "weekly" | "other"
      goal_type: "lose_weight" | "maintain_weight" | "gain_weight"
      habit_category:
        | "nutrition"
        | "hydration"
        | "movement"
        | "sleep"
        | "mindset"
        | "medication"
        | "custom"
      habit_frequency: "daily" | "weekly"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
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
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "expired"
        | "incomplete"
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
      billing_provider: ["internal", "stripe", "apple", "google", "manual"],
      food_source: ["manual", "system", "provider", "barcode"],
      glp1_dose_event_type: ["taken", "missed", "skipped"],
      glp1_dose_unit: ["mg", "mcg", "units", "other"],
      glp1_injection_site: [
        "abdomen",
        "thigh",
        "upper_arm",
        "other",
        "not_applicable",
      ],
      glp1_medication: ["semaglutide", "tirzepatide", "liraglutide", "other"],
      glp1_schedule: ["daily", "weekly", "other"],
      goal_type: ["lose_weight", "maintain_weight", "gain_weight"],
      habit_category: [
        "nutrition",
        "hydration",
        "movement",
        "sleep",
        "mindset",
        "medication",
        "custom",
      ],
      habit_frequency: ["daily", "weekly"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
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
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "expired",
        "incomplete",
      ],
      unit_system: ["metric", "imperial"],
    },
  },
} as const
