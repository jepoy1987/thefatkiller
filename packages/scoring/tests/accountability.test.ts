import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHabitStreak, calculateTFKScore, localDate, mondayFor, type DailyScoreSignal } from '../src/index.ts';
const day=(date:string,overrides:Partial<DailyScoreSignal>={}):DailyScoreSignal=>({date,calories:1800,calorieTarget:1800,protein:140,proteinTarget:140,water:2500,waterTarget:2500,habitCompleted:2,habitAvailable:2,checkedIn:true,...overrides});
const week=Array.from({length:7},(_,index)=>day(`2026-08-${String(25+index).padStart(2,'0')}`));
test('perfect seven-day consistency scores 100',()=>assert.equal(calculateTFKScore({days:week,progressLogged:true}).overall,100));
test('zero behavior scores zero and never below zero',()=>{const score=calculateTFKScore({days:week.map((d)=>day(d.date,{calories:0,protein:0,water:0,habitCompleted:0,checkedIn:false})),progressLogged:false});assert.equal(score.overall,0);});
test('scores partial habit adherence',()=>assert.equal(calculateTFKScore({days:week.map((d)=>day(d.date,{habitCompleted:1})),progressLogged:true}).breakdown.habits,15));
test('nutrition uses calorie tolerance and protein threshold without rewarding under-eating',()=>{assert.equal(calculateTFKScore({days:[day('2026-08-31',{calories:1530,protein:119})],progressLogged:false}).breakdown.nutrition,30);assert.equal(calculateTFKScore({days:[day('2026-08-31',{calories:1000,protein:140})],progressLogged:false}).breakdown.nutrition,15);});
test('hydration is proportional and capped',()=>{assert.equal(calculateTFKScore({days:[day('2026-08-31',{water:1250})],progressLogged:false}).breakdown.hydration,8);assert.equal(calculateTFKScore({days:[day('2026-08-31',{water:5000})],progressLogged:false}).breakdown.hydration,15);});
test('check-in percentage and progress logging are transparent',()=>{const score=calculateTFKScore({days:[day('2026-08-30'),day('2026-08-31',{checkedIn:false})],progressLogged:true});assert.equal(score.breakdown.checkIns,8);assert.equal(score.breakdown.progress,10);});
test('missing data does not fabricate credit and score stays within 0-100',()=>{assert.equal(calculateTFKScore({days:[],progressLogged:false}).overall,0);assert.ok(calculateTFKScore({days:week,progressLogged:true}).overall<=100);});
test('streak stays alive through today when yesterday completed and tracks longest',()=>{const result=calculateHabitStreak('habit',['2026-08-27','2026-08-28','2026-08-29','2026-08-30'],'2026-08-31');assert.equal(result.current,4);assert.equal(result.longest,4);assert.equal(result.completion_rate,57.14);});
test('local dates and Monday boundaries work in Manila, Chicago, and UTC',()=>{const instant=new Date('2026-08-31T20:00:00Z');assert.equal(localDate('Asia/Manila',instant),'2026-09-01');assert.equal(localDate('America/Chicago',instant),'2026-08-31');assert.equal(localDate('UTC',instant),'2026-08-31');assert.equal(mondayFor('2026-09-03'),'2026-08-31');});

import { habitAdherence, localDateWindow } from '../src/index.ts';
const habit = { is_active: true, created_at: '2026-08-01T00:00:00Z', frequency: 'daily' as const, target_per_period: 1 };
const today = '2026-09-07';
test('daily adherence uses seven opportunities for one, seven, and zero completions', () => {
  assert.deepEqual(habitAdherence(habit, [today], today, 'UTC'), { expected: 7, completed: 1, rate: 14.29 });
  assert.equal(habitAdherence(habit, localDateWindow(today), today, 'UTC').rate, 100);
  assert.equal(habitAdherence(habit, [], today, 'UTC').rate, 0);
});
test('a habit created mid-window has no earlier opportunities', () => {
  assert.deepEqual(habitAdherence({ ...habit, created_at: '2026-09-05T12:00:00Z' }, ['2026-09-04', today], today, 'UTC'), { expected: 3, completed: 1, rate: 33.33 });
});
test('inactive and future-created habits have no active opportunities', () => {
  assert.deepEqual(habitAdherence({ ...habit, is_active: false }, [today], today, 'UTC'), { expected: 0, completed: 0, rate: null });
  assert.equal(habitAdherence({ ...habit, created_at: '2026-09-08T12:00:00Z' }, [], today, 'UTC').expected, 0);
});
test('weekly targets are separate, capped, and prorated after creation', () => {
  const weekly = { ...habit, frequency: 'weekly' as const, target_per_period: 2 };
  assert.deepEqual(habitAdherence(weekly, [today], today, 'UTC'), { expected: 2, completed: 1, rate: 50 });
  assert.equal(habitAdherence(weekly, localDateWindow(today), today, 'UTC').rate, 100);
  assert.equal(habitAdherence({ ...weekly, created_at: '2026-09-05T00:00:00Z' }, [today], today, 'UTC').expected, 1);
});
test('creation date is client-local and duplicate completions do not add credit', () => {
  const newlyCreated = { ...habit, created_at: '2026-09-05T20:00:00Z' };
  assert.equal(habitAdherence(newlyCreated, [today, today], today, 'Asia/Manila').expected, 2);
  assert.equal(habitAdherence(newlyCreated, [today, today], today, 'America/Chicago').expected, 3);
  assert.equal(habitAdherence(newlyCreated, [today, today], today, 'UTC').completed, 1);
});
