import type { Habit, HabitStreak, ScoreInput, TFKScore } from '@tfk/types';
export type { DailyScoreSignal, ScoreInput } from '@tfk/types';
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)));
const average = (values: number[]) => values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0;
export function scoreLabel(score:number):TFKScore['label'] { return score>=90?'Excellent':score>=75?'Strong':score>=60?'Building':score>=40?'Inconsistent':'Needs attention'; }
export function calculateTFKScore({days,progressLogged,windowDays=7}:ScoreInput):TFKScore { const window=days.slice(-windowDays);const nutrition=clamp(average(window.map((day)=>{const calories=day.calorieTarget>0&&day.calories>=day.calorieTarget*.85&&day.calories<=day.calorieTarget*1.15?0.5:0;const protein=day.proteinTarget>0&&day.protein>=day.proteinTarget*.85?0.5:0;return calories+protein;}))*30,30);const hydration=clamp(average(window.map((day)=>day.waterTarget>0?Math.min(day.water/day.waterTarget,1):0))*15,15);const available=window.reduce((sum,day)=>sum+day.habitAvailable,0);const habits=clamp(available?window.reduce((sum,day)=>sum+Math.min(day.habitCompleted,day.habitAvailable),0)/available*30:0,30);const checkIns=clamp(average(window.map((day)=>day.checkedIn?1:0))*15,15);const progress=progressLogged?10:0;const overall=clamp(nutrition+hydration+habits+checkIns+progress,100);return {overall,label:scoreLabel(overall),breakdown:{nutrition,hydration,habits,checkIns,progress},windowDays}; }
const shift=(date:string,days:number)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);};
export function calculateHabitStreak(habitId:string,completedDates:string[],today:string,windowDays=7,createdOn?:string):HabitStreak { const unique=new Set(completedDates.filter(date=>date<=today&&(!createdOn||date>=createdOn)));let cursor=unique.has(today)?today:shift(today,-1);let current=0;while(unique.has(cursor)){current++;cursor=shift(cursor,-1);}const ordered=[...unique].sort();let longest=0;let run=0;let prior='';for(const date of ordered){run=prior&&shift(prior,1)===date?run+1:1;longest=Math.max(longest,run);prior=date;}let recent=0;for(let i=0;i<windowDays;i++)if(unique.has(shift(today,-i)))recent++;return {habit_id:habitId,current,longest,completion_rate:Math.round(recent/Math.max(1,localDateWindow(today,windowDays).filter(date=>!createdOn||date>=createdOn).length)*10000)/100}; }
export function localDate(timeZone:string,now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function mondayFor(date:string){const value=new Date(`${date}T12:00:00Z`);const day=value.getUTCDay()||7;value.setUTCDate(value.getUTCDate()-day+1);return value.toISOString().slice(0,10);}

/** The inclusive client-local window; calendar arithmetic does not assume 24-hour days. */
export function localDateWindow(today: string, windowDays = 7): string[] {
  return Array.from({ length: windowDays }, (_, index) => shift(today, index - windowDays + 1));
}

/** Active-habit adherence. Weekly targets are separate from daily TFK opportunities.
 * A newly created weekly habit has a prorated (rounded-up) target for eligible days.
 * Inactive habits are excluded entirely: the schema has no activation history.
 */
export function habitAdherence(habit: Pick<Habit, 'is_active'|'created_at'|'frequency'|'target_per_period'>, completedDates: string[], today: string, timeZone: string) {
  const createdOn = localDate(timeZone, new Date(habit.created_at));
  const days = habit.is_active ? localDateWindow(today).filter(date => date >= createdOn) : [];
  const expected = habit.frequency === 'daily' ? days.length : Math.ceil(habit.target_per_period * days.length / 7);
  const completed = Math.min(expected, new Set(completedDates.filter(date => days.includes(date))).size);
  return { expected, completed, rate: expected ? Math.round(completed / expected * 10000) / 100 : null };
}
