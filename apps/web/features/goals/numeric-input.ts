export function numericInputProps(integer: boolean, allowZero: boolean) {
  return {
    inputMode: integer ? 'numeric' : 'decimal',
    min: integer ? (allowZero ? '0' : '1') : (allowZero ? '0' : '0.01'),
    step: integer ? '1' : 'any',
  } as const;
}
