# Sprint 14 baseline database inventory

All 40 public tables have RLS enabled. This inventory is schema metadata only. Full domain RLS suites supplement this static inventory.

| Schema/function | Arguments | Definer | Search path | Anon execute | Authenticated execute |
|---|---|---|---|---|---|
| private.accountability_score_input | target_user_id uuid, as_of timestamp with time zone | False | ['search_path=""'] | False | False |
| private.can_coach_client | target_client_id uuid | True | ['search_path=""'] | False | True |
| private.current_user_has_coach_access |  | True | ['search_path=""'] | False | True |
| private.current_user_is_admin |  | True | ['search_path=""'] | False | True |
| private.evaluate_due_reminders | target uuid, at_time timestamp with time zone | True | ['search_path=""'] | False | False |
| private.generate_user_reminders | target uuid, at_time timestamp with time zone | True | ['search_path=""'] | False | False |
| private.reminder_features | target uuid, at_time timestamp with time zone | True | ['search_path=""'] | False | False |
| private.report_context | p_client_id uuid | True | ['search_path=""'] | False | False |
| private.report_period_data | target uuid, start_date date, end_date date, context jsonb | True | ['search_path=""'] | False | False |
| private.training_entitled |  | False | ['search_path=""'] | False | True |
| private.training_mutate | operation text, payload jsonb | True | ['search_path=""'] | False | True |
| private.training_relationship | client_id uuid | True | ['search_path=""'] | False | True |
| private.training_summary | target_user_id uuid, coach_view boolean | True | ['search_path=""'] | False | True |
| private.training_template_read | template_id uuid | True | ['search_path=""'] | False | True |
| private.valid_food_photo_items | items jsonb | False | ['search_path=""'] | False | False |
| private.weekly_insight_features | target uuid | True | ['search_path=""'] | False | False |
| private.weekly_insight_source | target uuid, as_of timestamp with time zone | True | ['search_path=""'] | False | False |
| public.admin_assign_coach_client | target_coach_user_id uuid, target_client_user_id uuid | True | ['search_path=""'] | False | True |
| public.admin_assign_internal_plan | target_user_id uuid, target_plan_code text | False | ['search_path=""'] | False | True |
| public.admin_grant_coach_role | target_user_id uuid | True | ['search_path=""'] | False | True |
| public.claim_food_photo | p_id uuid, p_user_id uuid, p_retry boolean | True | ['search_path=""'] | False | False |
| public.claim_food_photo_cleanup | p_limit integer | True | ['search_path=""'] | False | False |
| public.claim_weekly_insight | p_user_id uuid, p_input jsonb | True | ['search_path=""'] | False | False |
| public.clear_food_photo_storage | p_id uuid, p_user_id uuid, p_path text | True | ['search_path=""'] | False | False |
| public.complete_food_photo_cleanup | p_id uuid, p_user_id uuid, p_claim uuid, p_path text | True | ['search_path=""'] | False | False |
| public.complete_onboarding | p_first_name text, p_last_name text, p_display_name text, p_date_of_birth date, p_unit_system unit_system, p_goal_type goal_type, p_starting_weight numeric, p_goal_weight numeric, p_height numeric, p_activity_level activity_level, p_daily_calorie_target integer, p_daily_protein_target numeric, p_daily_carbs_target numeric, p_daily_fat_target numeric, p_daily_water_target integer, p_daily_step_target integer | False | ['search_path=""'] | False | True |
| public.confirm_food_photo | p_id uuid, p_items jsonb, p_meal_type meal_type, p_logged_at timestamp with time zone, p_notes text | True | ['search_path=""'] | False | True |
| public.expire_food_photo | p_id uuid, p_user_id uuid | True | ['search_path=""'] | False | False |
| public.finish_food_photo | p_id uuid, p_user_id uuid, p_attempt integer, p_result jsonb, p_provider text, p_model text, p_error text, p_deleted boolean | True | ['search_path=""'] | False | False |
| public.finish_weekly_insight | p_id uuid, p_user_id uuid, p_attempt integer, p_result jsonb, p_model text, p_error text | True | ['search_path=""'] | False | False |
| public.generate_due_notifications |  | True | ['search_path=""'] | False | False |
| public.get_accountability_score_input |  | True | ['search_path=""'] | False | True |
| public.get_client_coaching_summary |  | True | ['search_path=""'] | False | True |
| public.get_coach_client_summary | client_id uuid | True | ['search_path=""'] | False | True |
| public.get_coach_client_training_summary | client_id uuid | False | ['search_path=""'] | False | True |
| public.get_coach_dashboard |  | True | ['search_path=""'] | False | True |
| public.get_current_app_role |  | True | ['search_path=""'] | False | True |
| public.get_current_entitlements |  | False | ['search_path=""'] | False | True |
| public.get_daily_nutrition | p_date date | False | ['search_path=""'] | False | True |
| public.get_report_context | p_client_id uuid | True | ['search_path=""'] | False | True |
| public.get_report_data | p_start date, p_end date, p_client_id uuid | True | ['search_path=""'] | False | True |
| public.get_training_summary |  | False | ['search_path=""'] | False | True |
| public.get_weekly_insight_source |  | True | ['search_path=""'] | False | True |
| public.handle_new_auth_user |  | True | ['search_path=""'] | False | False |
| public.has_current_feature | p_feature_code text | False | ['search_path=""'] | False | True |
| public.log_saved_meal | p_saved_meal_id uuid, p_meal_type meal_type, p_logged_at timestamp with time zone | False | ['search_path=""'] | False | True |
| public.mark_all_notifications_read |  | True | ['search_path=""'] | False | True |
| public.notification_unread_count |  | False | ['search_path=""'] | False | True |
| public.save_coach_goal | p_client_id uuid, p_title text, p_description text, p_category coach_goal_category, p_target_date date, p_priority coach_goal_priority, p_client_visible boolean | True | ['search_path=""'] | False | True |
| public.save_coach_note | p_client_id uuid, p_note text, p_client_visible boolean | True | ['search_path=""'] | False | True |
| public.set_coach_goal_status | p_goal_id uuid, p_status coach_goal_status | True | ['search_path=""'] | False | True |
| public.set_notification_read | p_id uuid, p_read boolean | True | ['search_path=""'] | False | True |
| public.set_updated_at |  | False | ['search_path=""'] | False | False |
| public.sync_progress_milestones |  | True | ['search_path=""'] | False | False |
| public.training_mutate | operation text, payload jsonb | False | ['search_path=""'] | False | True |
| public.update_coach_goal | p_goal_id uuid, p_title text, p_description text, p_category coach_goal_category, p_target_date date, p_priority coach_goal_priority, p_client_visible boolean | True | ['search_path=""'] | False | True |
| public.update_goal_settings | p_unit_system unit_system, p_goal_type goal_type, p_goal_weight numeric, p_activity_level activity_level, p_daily_calorie_target integer, p_daily_protein_target numeric, p_daily_carbs_target numeric, p_daily_fat_target numeric, p_daily_water_target integer, p_daily_step_target integer | False | ['search_path=""'] | False | True |

Sprint 14 adds private.claim_report_read (definer, empty search_path, no public/anon/authenticated execute) and private.report_read_limits (RLS, no client grants). get_report_data remains auth/entitlement/relationship guarded and becomes volatile to consume its durable quota.
