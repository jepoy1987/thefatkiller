import type { FoodPhotoResult } from '@tfk/types';

// This module is used only by the server-side provider and generation pipeline.
// Conservative domain policy: food estimates have no reason to discuss medication,
// diagnosis or treatment, even as a disclaimer. Never include rejected text in errors.
const prohibited = [
  /\b(?:medicat\w*|medicin\w*|prescri\w*|dos(?:e|es|ing|age)|glp\s*1|semaglutide|tirzepatide|insulin|ozempic|wegovy|mounjaro|zepbound|injection|tablet|pill|drug)\b/,
  /\b(?:mg|mcg|micrograms?|milligrams?)\b/,
  /\b(?:take|skip|inject|administer|ingest|increase|decrease|overdose|underdose)\b/,
  /\b(?:you (?:should|must|need to)|i (?:recommend|advise)|recommended (?:daily|intake)|seek treatment)\b/,
  /\b(?:diagnos\w*|treat(?:ment|ments|ing)|cures?|therap\w*|diabet\w*|cancer|hypertension|hypoglyc\w*|disease|disorder|syndrome)\b/,
  /\btreat\b.{0,40}\b(?:your|infection|condition|illness|symptoms?)\b/,
  /\b(?:you (?:have|suffer|are suffering)|indicates? (?:that )?you|symptoms? (?:of|indicate))\b/,
  /\b(?:starv\w*|purg\w*|vomit\w*|laxativ\w*|emetic\w*|anorexi\w*|bulimi\w*|dehydrat(?:e|ion|ing)|poison\w*|bleach|self harm)\b/,
  /\b(?:fast(?:ing)?|restrict\w*|compensat\w*|punish\w*)\b/,
  /\b(?:skip|avoid|stop|forgo|forego|eliminate|cut out)\b.{0,60}\b(?:eat\w*|food|meals?|breakfast|lunch|dinner|water|drink\w*|calories?)\b/,
  /\b(?:eat|consume|limit|stay|keep|reduce|cut|restrict|intake|allowance)\b.{0,60}\b(?:only|just|less|under|below|maximum|at most|no more|zero|nothing|\d+)\b.{0,30}\b(?:calories?|kcal|food|meals?)\b/,
  /\b(?:calories?|kcal)\b.{0,30}\b(?:per day|a day|daily|maximum|limit)\b/,
  /\b(?:burn|work|exercise|run|train|sweat)\b.{0,60}\b(?:off|until|hours?|compensate|punish|undo|make up)\b/,
  /\b(?:exercise|workout|training)\b.{0,40}\b(?:extra|excessive|compulsive)\b/,
  /\b(?:extra|excessive|compulsive)\b.{0,40}\b(?:exercise|workout|training)\b/,
  /\b(?:do not|don t|stop|avoid)\b.{0,40}\b(?:doctor|emergency|hospital|medical care|breath\w*)\b/,
];

function normalize(text: string): string {
  return text.normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function isSafeFoodPhotoResult(result: FoodPhotoResult): boolean {
  const fields = [...result.items.map(item => item.name), ...result.uncertainties];
  // Also inspect joined fields: splitting an instruction across fields cannot bypass
  // the boundary. Numeric nutrition estimates are not treatment instructions.
  return [...fields, fields.join(' ')].every(text => {
    const normalized = normalize(text);
    return !prohibited.some(rule => rule.test(normalized));
  });
}
