import { redirect } from 'next/navigation';

export const formValue = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
export const redirectWithError = (path: string, message: string): never => redirect(`${path}?error=${encodeURIComponent(message)}`);
