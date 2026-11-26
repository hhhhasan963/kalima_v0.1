// جسر التطبيق الأصلي (Capacitor). على الويب تعمل كل الدوال بدائل آمنة أو لا تفعل شيئاً.
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

// اهتزاز: 'ok' | 'bad' | 'win'
export async function haptic(kind) {
  if (isNative) {
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.notification({ type: kind === 'bad' ? 'ERROR' : 'SUCCESS' });
    } catch {}
    return;
  }
  try {
    navigator.vibrate && navigator.vibrate(kind === 'bad' ? [70, 40, 70] : kind === 'win' ? [35, 60, 35, 60, 110] : [30, 50, 30]);
  } catch {}
}

// تهيئة الواجهة الأصلية عند الإقلاع.
// شريط الحالة: على أندرويد 15+ تُرسم الصفحة تحته دائماً (edge-to-edge) ولا يعمل setBackgroundColor،
// فلونه يأتي من CSS (:root::before بارتفاع --sat وبلون --sbc)، وأيقونات الشريط الفاتحة من إعداد SystemBars في capacitor.config.json.
export async function initNative() {
  if (!isNative) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {}
}

// زر الرجوع في أندرويد. handle() ترجع true إذا عالجت الرجوع (إغلاق نافذة أو صفحة)،
// وإلا فنحن في الرئيسية: الضغطة الأولى تعرض تنبيهاً، والثانية خلال ثانيتين تغلق التطبيق.
export async function listenBack(handle, onFirstExit) {
  if (!isNative) return () => {};
  const { App } = await import('@capacitor/app');
  let armed = false;
  let timer = 0;
  const sub = await App.addListener('backButton', () => {
    if (handle()) return;
    if (armed) {
      App.exitApp();
      return;
    }
    armed = true;
    onFirstExit && onFirstExit();
    clearTimeout(timer);
    timer = setTimeout(() => (armed = false), 2000);
  });
  return () => {
    clearTimeout(timer);
    sub.remove();
  };
}
