import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeFoodPhotoResult } from '../server/food-photo/safety.ts';
import { openAIPhotoProvider } from '../server/food-photo/provider.ts';
import { runFoodPhoto } from '../server/food-photo/generation.ts';

const result = () => ({items:[{name:'Rice',estimated_portion:{amount:1,unit:'cup'},estimated_calories:205,protein_g:4,carbs_g:45,fat_g:1,confidence:0.9}],meal_totals:{calories:205,protein_g:4,carbs_g:45,fat_g:1},uncertainties:['Portion is an estimate.']});
const unsafe = [
  'Increase your GLP-1 dose.', 'Decrease your dose tomorrow.',
  'Skip your medication.', 'Take 2.5 mg before dinner.',
  'Your symptoms indicate diabetes.', 'You have an eating disorder.',
  'This meal diagnoses hypertension.', 'I prescribe insulin.',
  'Treat your infection with antibiotics.',
  'Eat only 300 calories per day.', 'Eat just one meal a day.',
  'Starve yourself tomorrow.', 'Fast for three days.',
  'Purge after this meal.', 'Make yourself vomit.',
  'Run for hours to burn off this meal.', 'Do extra exercise to compensate.',
  'Use laxatives to undo the meal.', 'Stop drinking water.',
  'Drink bleach.', 'Do not seek emergency medical care.',
  'INCREASE YOUR GLP‑１ DOSE.', 'Take ２．５ ｍｇ.',
  'Skip your medi\u200bcation.', 'Increase your do\u0301se.',
];

for (const [index,text] of unsafe.entries()) {
  test(`Safety rejects unsafe category/variant ${index + 1} in every display field`, async () => {
    for (const field of ['uncertainties','name']) {
      const value = result();
      if (field === 'name') value.items[0].name = text;
      else value.uncertainties = [text];
      assert.equal(isSafeFoodPhotoResult(value),false);
      const provider = openAIPhotoProvider({apiKey:'stub',model:'stub'},async () => new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})));
      await assert.rejects(provider(new Uint8Array()),error => error.code === 'invalid_output' && error.message === 'invalid_output');
    }
  });
}

for (const text of [
  'Oil amount cannot be determined from the image.',
  'Rice portion is approximately one cup; calories are estimates.',
  'The mixed dish may contain coconut milk, but this is uncertain.',
  'Chicken, rice and vegetables are visible. Hidden ingredients cannot be determined.',
  'The meal is estimated at 205 calories.',
  'Cured ham and dehydrated fruit are visible; portion size is uncertain.',
]) test(`Safety accepts neutral estimate: ${text}`, () => {
  const value = result(); value.uncertainties = [text];
  assert.equal(isSafeFoodPhotoResult(value),true);
});

test('Instruction split across uncertainty fields is rejected', () => {
  const value = result(); value.uncertainties = ['You have','a serious infection'];
  assert.equal(isSafeFoodPhotoResult(value),false);
});

test('Generation rejects alternate-provider unsafe output before completion; explicit retry can succeed', async () => {
  const value = result(); value.uncertainties = [unsafe[0]];
  const finishes = []; const operations = []; let providerCalls = 0;
  const ports = {
    claim:async()=>({claimed:true,analysis:{id:'test',attempts:1,storage_path:'owner/photo.jpg'}}),
    upload:async()=>operations.push('upload'), remove:async()=>operations.push('delete'),
    provider:async()=>{providerCalls++;return value;},
    finish:async(a,r,error,deleted)=>finishes.push({r,error,deleted}),
  };
  await runFoodPhoto(new Uint8Array(),ports);
  assert.deepEqual(finishes,[{r:null,error:'invalid_output',deleted:true}]);
  assert.deepEqual(operations,['upload','delete']);
  assert.equal(JSON.stringify(finishes).includes(unsafe[0]),false);
  // There is no food-log operation in the generation ports. Only a later,
  // separate authenticated confirmation can create immutable food snapshots.
  ports.provider = async()=>{providerCalls++;return result();};
  await runFoodPhoto(new Uint8Array(),ports);
  assert.equal(finishes[1].error,null);
  assert.deepEqual(finishes[1].r,result());
  assert.equal(providerCalls,2);
  ports.claim = async()=>({claimed:false,analysis:{id:'test'}});
  await runFoodPhoto(new Uint8Array(),ports);
  assert.equal(providerCalls,2);
});
