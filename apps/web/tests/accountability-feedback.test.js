const test=require('node:test');const assert=require('node:assert/strict');const{readFileSync}=require('node:fs');
const components=readFileSync(new URL('../features/accountability/components.tsx',`file://${__filename}`),'utf8');const actions=readFileSync(new URL('../server/actions/accountability.ts',`file://${__filename}`),'utf8');
test('accountability mutations expose pending states',()=>{for(const label of ['Saving…','Completing…','Updating…'])assert.match(components,new RegExp(label));});
test('accountability mutations expose success feedback',()=>{for(const message of ['Habit saved.','Habit completed.','Habit marked incomplete.','Habit updated.','Daily check-in saved.','Weekly check-in saved.'])assert.match(actions,new RegExp(message.replace('.','\\.')));});
