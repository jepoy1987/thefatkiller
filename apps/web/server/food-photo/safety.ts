import type { FoodPhotoResult } from '@tfk/types';
import { isSafeHealthText } from '../ai/output-safety.ts';
export function isSafeFoodPhotoResult(result: FoodPhotoResult): boolean {
 return isSafeHealthText([...result.items.map(item => item.name), ...result.uncertainties]);
}
