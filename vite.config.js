import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// يرفض بناء نسخة الإنتاج بدون مفاتيح Supabase، حتى لا يُنشَر تطبيق بلا تسجيل دخول
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error(
      'VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY غير موجودين. ضعهما في .env أو في أسرار GitHub/متغيرات الاستضافة.'
    );
  }
  return { plugins: [react()] };
});
