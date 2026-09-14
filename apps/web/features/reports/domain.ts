import { calculateTFKScore, localDateWindow, mondayFor } from '@tfk/scoring';
import { reportPeriodSchema, waterFromMilliliters, weightFromKilograms } from '@tfk/validation';
import type { ReportAvailability, ReportContext, ReportPeriod, ReportPeriodSource, ReportSource, TFKReport } from '@tfk/types';

export function resolveReportPeriod(query:Record<string,string|undefined>,context:Pick<ReportContext,'today'|'timezone'>):ReportPeriod {
 const preset=query.preset??'7';
 const start=preset==='custom'?query.start:localDateWindow(context.today,['7','30','90'].includes(preset)?Number(preset):7)[0];
 const end=preset==='custom'?query.end:context.today;
 const parsed=reportPeriodSchema.parse({preset,start,end,today:context.today});
 return {start:parsed.start,end:parsed.end,days:Math.round((Date.parse(parsed.end)-Date.parse(parsed.start))/86400000)+1,timezone:context.timezone,preset:parsed.preset,includesToday:parsed.end===context.today};
}
const round=(n:number)=>Math.round(n*100)/100;
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);
const avg=(values:number[])=>values.length?round(sum(values)/values.length):null;
const pct=(a:number,b:number)=>b>0?round(Math.min(a/b,1)*100):null;
const state=(allowed:boolean,entries:number,coach:boolean):ReportAvailability=>!allowed?(coach?'not_shared':'not_applicable'):entries?'available':'no_entries';
export function comparisonDelta(current:number|null,previous:number|null){return current===null||previous===null?null:round(current-previous);}
export function changeText(value:number|null,unit:string){return value===null?'Not enough comparable data':value===0?'No change':(value>0?'Up ':'Down ')+Math.abs(value)+' '+unit;}
function summarize(source:ReportPeriodSource,c:ReportContext,period:ReportPeriod):TFKReport {
 const d=source.days;
 if(d.length!==period.days||d.some((day,i)=>day.date!==localDateWindow(period.end,period.days)[i]))throw new Error('Report dates do not match the selected period.');
 const weights=d.filter(x=>x.weight?.count);const foods=d.filter(x=>x.nutrition?.calories!==null&&x.nutrition?.calories!==undefined);const waters=d.filter(x=>x.water!==null);
 const count=sum(weights.map(x=>x.weight!.count));const convert=(n:number|null)=>n===null?null:weightFromKilograms(n,c.unit_system);
 const first=weights[0]?.weight?.first??null;const last=weights.at(-1)?.weight?.last??null;
 const ct=source.targets.calories,pt=source.targets.protein,wt=source.targets.water;
 const calorieDays=ct&&ct>0?foods.filter(x=>x.nutrition!.calories!>=ct*.85&&x.nutrition!.calories!<=ct*1.15).length:null;
 const proteinDays=pt&&pt>0?foods.filter(x=>x.nutrition!.protein!>=pt*.85).length:null;
 const opportunities=sum(d.map(x=>x.accountability?.available??0));const completed=sum(d.map(x=>Math.min(x.accountability?.completed??0,x.accountability?.available??0)));
 const checkDays=d.filter(x=>x.accountability?.checked).length;
 let current=0,longest=0,run=0;for(const day of d){run=day.accountability?.checked?run+1:0;longest=Math.max(longest,run);}
 let i=d.length-1;if(period.includesToday&&!d[i]?.accountability?.checked)i--;while(i>=0&&d[i]?.accountability?.checked){current++;i--;}
 const assigned=sum(d.map(x=>x.training?.assigned??0));const assignedCompleted=sum(d.map(x=>x.training?.assigned_completed??0));const workouts=sum(d.map(x=>x.training?.completed??0));const sessions=sum(d.map(x=>x.training?.sessions??0));
 const score=source.score_input&&c.progress&&c.nutrition&&c.hydration&&c.accountability&&c.score?calculateTFKScore(source.score_input):null;
 return {period,coachView:c.coach_view,comparison:null,
  progress:{availability:state(c.progress,count,c.coach_view),count:c.progress?count:null,start:convert(first),end:convert(last),change:count>=2&&first!==null&&last!==null?convert(last-first):null,unit:c.unit_system==='imperial'?'lb':'kg',trend:c.progress?d.map(x=>({date:x.date,value:convert(x.weight?.last??null)})):[]},
  nutrition:{availability:state(c.nutrition,foods.length,c.coach_view),loggedDays:c.nutrition?foods.length:null,averageCalories:avg(foods.map(x=>x.nutrition!.calories!)),averageProtein:avg(foods.map(x=>x.nutrition!.protein!)),averageCarbs:avg(foods.map(x=>x.nutrition!.carbs!)),averageFat:avg(foods.map(x=>x.nutrition!.fat!)),calorieTarget:ct,proteinTarget:pt,calorieDays,proteinDays,proteinPct:proteinDays===null||!foods.length?null:pct(proteinDays,foods.length),calorieTrend:c.nutrition?d.map(x=>({date:x.date,value:x.nutrition?.calories??null})):[],proteinTrend:c.nutrition?d.map(x=>({date:x.date,value:x.nutrition?.protein??null})):[]},
  hydration:{availability:state(c.hydration,waters.length,c.coach_view),loggedDays:c.hydration?waters.length:null,averageIntake:waters.length?waterFromMilliliters(avg(waters.map(x=>x.water!))!,c.unit_system):null,averageTargetPct:wt&&wt>0?avg(waters.map(x=>Math.min(x.water!/wt,1)*100)):null,targetDays:wt&&wt>0?waters.filter(x=>x.water!>=wt).length:null,target:wt===null?null:waterFromMilliliters(wt,c.unit_system),unit:c.unit_system==='imperial'?'fl oz':'ml',trend:c.hydration?d.map(x=>({date:x.date,value:x.water!==null&&wt&&wt>0?round(Math.min(x.water/wt,1)*100):null})):[]},
  accountability:{availability:state(c.accountability,completed+checkDays+(source.weekly_check_ins??0),c.coach_view),habitCompleted:c.accountability?completed:null,habitOpportunities:c.accountability?opportunities:null,habitPct:c.accountability?pct(completed,opportunities):null,checkInDays:c.accountability?checkDays:null,checkInPct:c.accountability?pct(checkDays,period.days):null,weeklyCheckIns:source.weekly_check_ins,overlappingWeeks:new Set(d.map(x=>mondayFor(x.date))).size,currentStreak:c.accountability?current:null,longestStreak:c.accountability?longest:null,score,scoreStart:localDateWindow(period.end)[0]!,scoreEnd:period.end},
  training:{availability:state(c.training,sessions+assigned+workouts,c.coach_view),assigned:c.training?assigned:null,assignedCompleted:c.training?assignedCompleted:null,completionPct:c.training?pct(assignedCompleted,assigned):null,completed:c.training?workouts:null,sessions:c.training?sessions:null,trend:c.training?d.map(x=>({date:x.date,value:x.training?.completed??0})):[],coachScoped:c.coach_view},
 };
}
export function buildReport(source:ReportSource,period:ReportPeriod):TFKReport {
 const current=summarize(source.current,source.context,period);
 if(source.previous){const previous=summarize(source.previous,source.context,{...period,start:source.previous.start,end:source.previous.end,includesToday:false});current.comparison={start:source.previous.start,end:source.previous.end,nutritionLoggedDays:comparisonDelta(current.nutrition.loggedDays,previous.nutrition.loggedDays),scorePoints:comparisonDelta(current.accountability.score?.overall??null,previous.accountability.score?.overall??null),workoutsCompleted:comparisonDelta(current.training.completed,previous.training.completed),habitPercentagePoints:comparisonDelta(current.accountability.habitPct,previous.accountability.habitPct)};}
 return current;
}
