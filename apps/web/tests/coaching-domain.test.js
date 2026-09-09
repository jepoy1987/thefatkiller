import assert from 'node:assert/strict';
import test from 'node:test';
import { attentionLabel, canArchiveGoal, coachingScore, displayWeight } from '../features/coaching/domain.ts';
import { calculateTFKScore } from '@tfk/scoring';
const days=Array.from({length:7},(_,i)=>({date:`2026-09-0${i+1}`,calories:100,calorieTarget:2000,protein:1,proteinTarget:100,water:1000,waterTarget:2000,habitCompleted:i===6?1:0,habitAvailable:1,checkedIn:true}));
const client={today:'2026-09-07',timezone:'UTC',availability:{progress:true,nutrition:true,accountability:true},score_input:{days,progressLogged:true},progress:{last_weigh_in:'2026-09-07T12:00:00Z'},nutrition:{logged_days_7d:7},accountability:{last_check_in:'2026-09-07',habit_opportunities:7,habit_completion_pct:14.29}};
test('coach and client have identical canonical overall and every category',()=>{
  assert.deepEqual(coachingScore(client),calculateTFKScore(client.score_input));
  assert.equal(coachingScore(client).breakdown.nutrition,0);
  assert.equal(coachingScore(client).breakdown.hydration,8);
  assert.equal(coachingScore(client).breakdown.habits,4);
});
test('privacy-withheld categories do not fabricate a zero score or negative attention',()=>{
  for(let mask=0;mask<7;mask++) {
    const availability={progress:Boolean(mask&1),nutrition:Boolean(mask&2),accountability:Boolean(mask&4)};
    const summary={...client,availability,score_input:null,progress:availability.progress?client.progress:null,nutrition:availability.nutrition?client.nutrition:null,accountability:availability.accountability?{...client.accountability,habit_completion_pct:100}:null};
    assert.equal(coachingScore(summary),null);
    assert.equal(attentionLabel(summary),'Some summaries not shared');
  }
});
test('only available data triggers deterministic attention flags',()=>{
  assert.equal(attentionLabel({...client,accountability:{...client.accountability,last_check_in:null}}),'Check-in overdue');
  assert.equal(attentionLabel({...client,score_input:null}),'Low recent consistency');
  const withheld={...client,availability:{progress:true,nutrition:false,accountability:false},nutrition:null,accountability:null,score_input:null};
  assert.equal(attentionLabel({...withheld,progress:{last_weigh_in:'2026-08-31T00:00:00Z'}}),'Needs review');
});
test('completed goals retain Archive but archived goals do not',()=>{
  assert.equal(canArchiveGoal('active'),true);assert.equal(canArchiveGoal('completed'),true);assert.equal(canArchiveGoal('archived'),false);
});
test('all weight values and signed changes use the shared kg-to-client-unit conversion',()=>{
  for(const kg of [100,80,75,-2.5,0,2.5]) {
    assert.match(displayWeight(kg,'metric'),/ kg$/);assert.match(displayWeight(kg,'imperial'),/ lb$/);
  }
  assert.equal(displayWeight(100,'imperial'),'220.5 lb');assert.equal(displayWeight(-2.5,'imperial'),'-5.5 lb');assert.equal(displayWeight(0,'metric'),'0.0 kg');
  assert.equal(displayWeight(null,'metric'),'Not shared or recorded');
});

test('rendered completed goal still has Archive while Edit and Complete are absent',async()=>{
  const [{readFile},ts,vm,React,server]=await Promise.all([import('node:fs/promises'),import('typescript'),import('node:vm'),import('react'),import('react-dom/server')]);
  const source=await readFile(new URL('../features/coaching/components.tsx',import.meta.url),'utf8');
  const domain=await import('../features/coaching/domain.ts');
  const wrapper=({children})=>React.createElement('div',null,children);
  const context={exports:{},require(name){
    if(name==='react/jsx-runtime')return {jsx:React.createElement,jsxs:React.createElement,Fragment:React.Fragment};
    if(name==='./domain')return domain;
    if(name.includes('/actions/'))return new Proxy({},{get:()=>'/qa-action'});
    if(name.includes('submit-button'))return {SubmitButton:({children})=>React.createElement('button',null,children)};
    return new Proxy({},{get:()=>wrapper});
  }};
  // Use the actual JSX runtime so children/keys follow React's rendering contract.
  const runtime=await import('react/jsx-runtime');const original=context.require;
  context.require=name=>name==='react/jsx-runtime'?runtime:original(name);
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  for(const status of ['active','completed','archived']) {
    const html=server.renderToStaticMarkup(React.createElement(context.exports.GoalList,{coach:true,goals:[{id:'qa',client_user_id:'client',title:'Fixture goal',priority:'normal',status}]}));
    assert.equal(html.includes('>Archive</button>'),status!=='archived');
    assert.equal(html.includes('>Complete</button>'),status==='active');
    assert.equal(html.includes('Edit goal'),status==='active');
  }
});
