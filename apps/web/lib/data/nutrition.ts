import { dateRangeForTimeZone, emptyNutritionTotals, mealSubtotals } from '@tfk/api';
import type { DailyNutritionSummary, Food, FoodLog, NutrientTotals, SavedMeal, WaterLog } from '@tfk/types';
import { waterFromMilliliters } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { createClient } from './client';
import { getActiveGoal } from './goals';
import { getProfile } from './profile';
import { requireUser } from './session';

export function dateInTimeZone(timeZone: string, now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).format(now); }

export async function getDailyNutrition(date?: string) {
  const supabase = createClient(); const user = await requireUser(supabase);
  const [profile, goal] = await Promise.all([getProfile(supabase, user.id), getActiveGoal(supabase)]);
  if (!profile.onboarding_completed || !goal) redirect('/onboarding');
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dateInTimeZone(profile.timezone);
  const { start, end } = dateRangeForTimeZone(selectedDate, profile.timezone);
  const [summaryResult, logsResult, waterResult, foodsResult, recentResult, mealsResult] = await Promise.all([
    supabase.rpc('get_daily_nutrition', { p_date: selectedDate }).single(),
    supabase.from('food_logs').select('*').gte('logged_at', start).lt('logged_at', end).order('logged_at'),
    supabase.from('water_logs').select('*').gte('logged_at', start).lt('logged_at', end).order('logged_at', { ascending: false }),
    supabase.from('foods').select('*').order('is_favorite', { ascending: false }).order('name').limit(100),
    supabase.from('food_logs').select('food_id,food_name_snapshot,logged_at').not('food_id','is',null).order('logged_at',{ascending:false}).limit(40),
    supabase.from('saved_meals').select('*,items:saved_meal_items(*)').order('name'),
  ]);
  const failed=[summaryResult,logsResult,waterResult,foodsResult,recentResult,mealsResult].find((r)=>r.error); if(failed?.error) throw new Error('Nutrition data could not be loaded.');
  const totals=(summaryResult.data ?? emptyNutritionTotals()) as NutrientTotals; const logs=(logsResult.data ?? []) as FoodLog[];
  const recentIds=[...new Set((recentResult.data ?? []).map((row)=>row.food_id).filter(Boolean))].slice(0,10);
  const foods=(foodsResult.data ?? []) as Food[];
  const summary: DailyNutritionSummary={...totals,date:selectedDate,targets:{calories:goal.daily_calorie_target,protein_g:goal.daily_protein_target,carbs_g:goal.daily_carbs_target,fat_g:goal.daily_fat_target,water_ml:goal.daily_water_target},meals:mealSubtotals(logs)};
  return { user,profile,goal,date:selectedDate,summary,logs,waterLogs:(waterResult.data ?? []) as WaterLog[],foods,favorites:foods.filter((food)=>food.is_favorite),recentFoods:recentIds.map((id)=>foods.find((food)=>food.id===id)).filter(Boolean) as Food[],savedMeals:(mealsResult.data ?? []) as SavedMeal[],waterDisplay:waterFromMilliliters(totals.water_ml,profile.unit_system) };
}

export async function getTodayNutritionTotals() {
  const supabase=createClient(); const user=await requireUser(supabase); const profile=await getProfile(supabase,user.id); const date=dateInTimeZone(profile.timezone);
  const { data,error }=await supabase.rpc('get_daily_nutrition',{p_date:date}).single(); if(error) throw new Error('Today’s nutrition could not be loaded.'); return (data ?? emptyNutritionTotals()) as NutrientTotals;
}
