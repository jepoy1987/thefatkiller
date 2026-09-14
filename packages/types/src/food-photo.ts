import type { MealType } from './index';
export type FoodPhotoAnalysisStatus = 'pending' | 'completed' | 'failed' | 'confirmed' | 'expired';
export type FoodAnalysisConfidence = number;
export type FoodPortionEstimate = { amount: number; unit: 'g'|'ml'|'oz'|'cup'|'tbsp'|'tsp'|'piece'|'serving'|'other' };
export type FoodMacroEstimate = { calories: number; protein_g: number; carbs_g: number; fat_g: number };
export type FoodPhotoItem = Omit<FoodMacroEstimate,'calories'> & { name: string; estimated_portion: FoodPortionEstimate; estimated_calories: number; confidence: FoodAnalysisConfidence };
export type FoodPhotoResult = { items: FoodPhotoItem[]; meal_totals: FoodMacroEstimate; uncertainties: string[] };
export type FoodAnalysisReviewInput = { items: FoodPhotoItem[]; meal_type: MealType; logged_at: string; notes: string };
export type FoodPhotoAnalysis = { id:string; user_id:string; status:FoodPhotoAnalysisStatus; storage_path:string|null; provider:string|null; model:string|null; prompt_version:string; result_json:FoodPhotoResult|null; error_code:string|null; attempts:number; created_at:string; started_at:string; completed_at:string|null; expires_at:string; confirmed_log_ids:string[]|null };
