import { createClient } from '@supabase/supabase-js';

// رابط «استعادة كلمة المرور» يصل بـ #access_token=...&type=recovery، ويعالجه supabase-js ثم يمسحه.
// نقرأه هنا قبل إنشاء العميل حتى لا يفوتنا.
const hashParams = (() => {
  try {
    return new URLSearchParams(location.hash.slice(1));
  } catch {
    return new URLSearchParams('');
  }
})();
export const startedAsRecovery = hashParams.get('type') === 'recovery';
export const authUrlError = hashParams.get('error_code')
  ? { code: hashParams.get('error_code'), message: hashParams.get('error_description') || '' }
  : null;

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// بدون مفاتيح يعمل التطبيق محلياً (بدون تسجيل دخول) بالدروس المضمّنة
export const supabase =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

// المفتاح الذي يحفظ به supabase-js الجلسة في المتصفح
export const authStorageKey = url ? 'sb-' + new URL(url).hostname.split('.')[0] + '-auth-token' : null;

// الصف الدراسي (حالياً الصف التاسع فقط)
export const DEFAULT_GRADE = 'g9';
