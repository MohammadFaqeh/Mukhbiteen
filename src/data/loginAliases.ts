/** اختصارات دخول: تكتب الاسم المختصر بدل البريد الكامل، ونحن نترجمه قبل إرساله لـ Supabase */
export const LOGIN_ALIASES: Record<string, string> = {
  admin: 'mohammadalfaqeeh73@gmail.com',
};

export function resolveLoginAlias(input: string): string {
  const key = input.trim().toLowerCase();
  return LOGIN_ALIASES[key] ?? input;
}
