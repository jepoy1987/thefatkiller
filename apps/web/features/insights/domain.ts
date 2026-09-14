import { z } from 'zod';
import { calculateTFKScore, localDate, localDateWindow, mondayFor } from '@tfk/scoring';
import { weightFromKilograms, weeklyInsightInputSchema, weeklyInsightOutputSchema } from '@tfk/validation';
import type { WeeklyInsightCategory, WeeklyInsightInput, WeeklyInsightResult } from '@tfk/types';

export const WEEKLY_PROMPT_VERSION = 'tfk-weekly-v1';
const n=z.number().finite().nonnegative();
const sourceSchema=z.object({
 period:z.object({start:z.string(),end:z.string(),timezone:z.string(),as_of:z.string(),includes_today:z.literal(true)}),
 unit_system:z.enum(['metric','imperial']),goal_type:z.enum(['lose_weight','maintain_weight','gain_weight']).nullable(),
 features:z.array(z.string()),starting_weight:n.nullable(),latest_weight:n.nullable(),first_period_weight:n.nullable(),weigh_ins:n.int(),
 water_logged_days:n.int().max(7),weekly_check_ins:n.int().max(2),coaching_available:z.boolean(),
 training:z.object({assigned:n.int(),assigned_completed:n.int(),completed:n.int(),completed_days:n.int().max(7)}),
 coaching:z.object({active_goals:n.int(),completed_goals:n.int()}),
 score_input:z.object({days:z.array(z.object({date:z.string(),calories:n,calorieTarget:n,protein:n,proteinTarget:n,water:n,waterTarget:n,habitCompleted:n.int(),habitAvailable:n.int(),checkedIn:z.boolean(),logged:z.boolean()})).length(7),progressLogged:z.boolean(),windowDays:z.literal(7)}),
});
export function buildWeeklyInsightInput(raw:unknown):WeeklyInsightInput {
 const s=sourceSchema.parse(raw);const dates=localDateWindow(localDate(s.period.timezone,new Date(s.period.as_of)));
 if(s.period.end!==dates[6]||s.period.start!==dates[0]||s.score_input.days.map(d=>d.date).join()!==dates.join()) throw new Error('Invalid local period');
 const has=(f:string)=>s.features.includes(f);
 const availability={progress:has('progress_tracking'),nutrition:has('nutrition_tracking'),hydration:has('water_tracking'),habits:has('habits'),daily_check_ins:has('daily_check_ins'),weekly_check_ins:has('weekly_check_ins'),training:has('workouts'),coaching:s.coaching_available,score:['tfk_score','nutrition_tracking','water_tracking','habits','daily_check_ins','progress_tracking'].every(has)};
 const days=s.score_input.days;const target=days[6]!;
 const weight=(v:number|null)=>v===null?null:weightFromKilograms(v,s.unit_system);
 const available=days.reduce((a,d)=>a+d.habitAvailable,0);const completed=days.reduce((a,d)=>a+Math.min(d.habitCompleted,d.habitAvailable),0);
 const input:WeeklyInsightInput={
  period:{...s.period,dates},profile:{unit_system:s.unit_system,goal_type:s.goal_type},availability,
  progress:availability.progress?{starting_weight:weight(s.starting_weight),latest_weight:weight(s.latest_weight),change:s.weigh_ins>=2&&s.latest_weight!==null&&s.first_period_weight!==null?Number((weight(s.latest_weight)!-weight(s.first_period_weight)!).toFixed(2)):null,weigh_ins:s.weigh_ins,weight_unit:s.unit_system==='imperial'?'lb':'kg'}:null,
  nutrition:availability.nutrition?{logged_days:days.filter(d=>d.logged).length,calorie_target_days:target.calorieTarget>0?days.filter(d=>d.logged&&d.calories>=d.calorieTarget*.85&&d.calories<=d.calorieTarget*1.15).length:null,protein_target_days:target.proteinTarget>0?days.filter(d=>d.logged&&d.protein>=d.proteinTarget).length:null,calorie_target:target.calorieTarget||null,protein_target_g:target.proteinTarget||null}:null,
  hydration:availability.hydration?{logged_days:s.water_logged_days,target_days:target.waterTarget>0?days.filter(d=>d.water>=d.waterTarget).length:null,target_ml:target.waterTarget||null}:null,
  habits:availability.habits?{opportunities:available,completed,completion_pct:available?Math.round(completed/available*10000)/100:null}:null,
  daily_check_ins:availability.daily_check_ins?{completed_days:days.filter(d=>d.checkedIn).length}:null,
  weekly_check_ins:availability.weekly_check_ins?{completed_weeks:s.weekly_check_ins,eligible_weeks:new Set(dates.map(mondayFor)).size}:null,
  training:availability.training?s.training:null,coaching:availability.coaching?s.coaching:null,
  score:availability.score?calculateTFKScore(s.score_input):null,
 };
 return weeklyInsightInputSchema.parse(input);
}
export type InsightFact={category:WeeklyInsightCategory;text:string};
export function insightFacts(input:WeeklyInsightInput):InsightFact[] {
 const facts:InsightFact[]=[];const add=(category:WeeklyInsightCategory,text:string)=>facts.push({category,text});
 if(input.progress){const p=input.progress;add('progress',p.weigh_ins+' weigh-ins were recorded in the selected period.');if(p.change!==null)add('progress','Weight changed by '+p.change+' '+p.weight_unit+' between the first and last weigh-in in the selected period.');}
 if(input.nutrition){const p=input.nutrition;add('nutrition','Nutrition was logged on '+p.logged_days+' of 7 days.');if(p.calorie_target_days!==null)add('nutrition','Calories were within 85–115% of the configured target on '+p.calorie_target_days+' logged days.');if(p.protein_target_days!==null)add('nutrition','Protein met the configured target on '+p.protein_target_days+' logged days.');}
 if(input.hydration){const p=input.hydration;add('hydration','Water was logged on '+p.logged_days+' of 7 days.');if(p.target_days!==null)add('hydration','Water met the configured target on '+p.target_days+' days.');}
 if(input.habits)add('habits',input.habits.completed+' of '+input.habits.opportunities+' eligible daily habit opportunities were completed.');
 if(input.daily_check_ins)add('daily_check_ins','Daily check-ins were recorded on '+input.daily_check_ins.completed_days+' of 7 days.');
 if(input.weekly_check_ins)add('weekly_check_ins',input.weekly_check_ins.completed_weeks+' of '+input.weekly_check_ins.eligible_weeks+' weeks overlapping the period have a weekly check-in.');
 if(input.training){add('training',input.training.assigned_completed+' of '+input.training.assigned+' scheduled non-archived assignments were completed.');add('training',input.training.completed+' workouts were completed across '+input.training.completed_days+' of 7 days, including self-directed workouts.');}
 if(input.coaching)add('coaching',input.coaching.active_goals+' visible goals are active; '+input.coaching.completed_goals+' visible goals were completed during the period in active coaching relationships.');
 if(input.score)add('score','The canonical TFK Score is '+input.score.overall+' of 100.');
 return facts;
}
export function insightDataGaps(input:WeeklyInsightInput):string[] {
 const gaps=['Today is partial; unlogged days do not establish what happened offline.'];
 for(const [category,available] of Object.entries(input.availability))if(!available)gaps.push(category.replaceAll('_',' ')+' is unavailable for this report.');
 if(input.progress&&input.progress.weigh_ins<2)gaps.push('Fewer than two weigh-ins: period weight change is unknown.');
 if(input.nutrition&&input.nutrition.logged_days<7)gaps.push('Nutrition totals are known only for logged entries; missing days are not zero intake.');
 if(input.nutrition&&(input.nutrition.calorie_target===null||input.nutrition.protein_target_g===null))gaps.push('One or more nutrition targets are not configured.');
 if(input.hydration&&input.hydration.logged_days<7)gaps.push('Water logging is incomplete; actual hydration on unlogged days is unknown.');
 if(input.habits&&input.habits.opportunities===0)gaps.push('There are no eligible active daily habits in this period.');
 return gaps;
}
export const focusTitles:Record<WeeklyInsightCategory,string>={
 progress:'Keep a consistent weigh-in record',nutrition:'Aim for consistent nutrition logging',hydration:'Keep your water log current',habits:'Review your existing daily habits',daily_check_ins:'Make time for a daily check-in',weekly_check_ins:'Complete your weekly check-in',training:'Review your existing workout schedule',coaching:'Review your visible coaching goals',score:'Review the recorded score breakdown',
};
// Model selects supported facts; unconstrained narration cannot invent additional claims.
export const weeklyNarrative = {
 headline: 'Your weekly activity records',
 summary: 'Review the recorded facts and data gaps below. Today is partial; unlogged days do not establish what happened offline.',
};
export const evidenceTitles:Record<WeeklyInsightCategory,string>={progress:'Weight records',nutrition:'Nutrition records',hydration:'Water records',habits:'Habit records',daily_check_ins:'Daily check-in records',weekly_check_ins:'Weekly check-in records',training:'Workout records',coaching:'Visible coaching goals',score:'Recorded TFK Score'};
export const WEEKLY_SYSTEM_PROMPT = [
 'You explain a private weekly activity summary, using only provided facts.',
 'Do not infer missing values or invent data, workouts, calories, symptoms or history.',
 'Do not diagnose, prescribe, recommend medication changes or dose changes, or mention medication.',
 'Do not claim causation from correlation. State uncertainty when data is incomplete.',
 'Do not shame or use moral language around food or weight. Do not recommend extreme calorie restriction,',
 'starvation, compensatory exercise, purging, or skipping meals as punishment. Do not reward rapid weight loss',
 'or frame weight gain as failure. Use neutral weight wording. Do not invent targets or training progression.',
 'Distinguish missing data, unavailable data, and measured adherence. Today is partial.',
 'TFK Score and its breakdown are canonical: never calculate, alter, reinterpret or replace them.',
 'Return only the requested structured JSON, with no Markdown.',
 'Every evidence and reason must copy an exact supplied fact with its matching category.',
 'Focus titles must copy the allowed title for that category. Copy data_gaps exactly.',
 'Copy headline and summary exactly from allowed_narrative. Win/watch titles must copy the evidence_titles entry for their category.',
 'Do not add a clinical, physiological or causal explanation. Do not infer intentions or personal qualities.',
].join('\n');
export function validateWeeklyInsightOutput(raw:unknown,input:WeeklyInsightInput):WeeklyInsightResult {
 const result=weeklyInsightOutputSchema.parse(raw);
 if(result.headline!==weeklyNarrative.headline||result.summary!==weeklyNarrative.summary||[...result.wins,...result.watch_items].some(i=>i.title!==evidenceTitles[i.category]))throw new Error('Unsupported narrative');
 const facts=insightFacts(input);const matches=(category:WeeklyInsightCategory,text:string)=>facts.some(f=>f.category===category&&f.text===text);
 if([...result.wins,...result.watch_items].some(i=>!matches(i.category,i.evidence))||result.next_week_focus.some(i=>!matches(i.category,i.reason)||i.title!==focusTitles[i.category]))throw new Error('Unsupported evidence');
 if(JSON.stringify(result.data_gaps)!==JSON.stringify(insightDataGaps(input)))throw new Error('Missing data gaps');
 const prose=[result.headline,result.summary,...result.wins.map(i=>i.title),...result.watch_items.map(i=>i.title)].join(' ');
 // Defense in depth, not a semantic safety guarantee. Exact evidence and fixed
 // focus actions are the primary boundaries; live narrative still needs QA.
 if(/\d|diagnos|prescrib|medicat|dosage|\bdose\b|glp.?1|ozempic|wegovy|insulin|starv|purg|compensat|skip.{0,15}meal|fasting|restrict|metaboli|caus|cured?|prevent.{0,20}disease|rapid.{0,15}(loss|weight)|disciplin|lazy|cheat|guilt|good food|bad food|burn.{0,15}fat/i.test(prose))throw new Error('Unsafe narrative');
 return result;
}
