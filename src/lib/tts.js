// النطق: على الجوال (Capacitor) نستخدم محرّك النظام عبر إضافة Text-to-Speech، وعلى الويب speechSynthesis.
// على الجوال: نجرّب en-US ثم en-GB ثم en (بعض المحرّكات لا تدعم en-US وحدها)، ونعيد المحاولة إن كان المحرّك لم يكتمل تشغيله،
// وإن فشل كل شيء نجرّب speechSynthesis داخل الـWebView، وإن فشل أيضاً نُبلغ التطبيق برسالة السبب (حدث kalima-tts-error).
import { Capacitor } from '@capacitor/core';
import { isNative } from './native.js';

const LANGS = ['en-US', 'en-GB', 'en'];
// ⚠ مهم: كائن إضافة Capacitor (Proxy) يرد على أي خاصية بما فيها `then`، فإذا أعدناه من دالة async أو مرّرناه إلى await
// عدّه JavaScript وعداً واستدعى then عليه فيعلّق إلى الأبد (هذا كان سبب تعطّل النطق في APK).
// لذلك نحمله دائماً داخل حاوية عادية { T } ولا نرجعه مباشرة.
let gen = 0; // يُلغي المحاولات المتأخرة عند طلب نطق جديد أو إيقاف
let holder = null;
const getPlugin = async () => {
  if (!holder) holder = { T: (await import('@capacitor-community/text-to-speech')).TextToSpeech };
  return holder;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const msg = (e) => (e && (e.message || e.errorMessage)) || String(e);

function webSpeak(text, rate, onend, onerror) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  if (onend) u.onend = onend;
  if (onerror) u.onerror = onerror;
  speechSynthesis.speak(u);
}

// مهلة لأي استدعاء أصلي: بعض حالات الفشل في الإضافة لا ترفض الوعد أبداً بل يبقى معلّقاً
const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('لا استجابة خلال ' + ms / 1000 + ' ثوانٍ (' + label + ')')), ms))]);

// هل إضافة النطق الأصلية تستجيب فعلاً؟ نفحصها مرة واحدة ونحتفظ بالنتيجة: 'ok' أو 'dead'
let nativeState = 'unknown';
let nativeWhy = '';
async function checkNative(force) {
  if (!force && nativeState !== 'unknown') return nativeState === 'ok';
  try {
    const { T } = await withTimeout(getPlugin(), 4000, 'تحميل الإضافة');
    await withTimeout(T.isLanguageSupported({ lang: 'en-US' }), 3000, 'isLanguageSupported');
    nativeState = 'ok';
    nativeWhy = '';
  } catch (e) {
    nativeState = 'dead';
    nativeWhy = msg(e);
  }
  return nativeState === 'ok';
}

async function nativeSpeak(text, rate, onend, onerror) {
  const my = ++gen;
  let last = '';
  // 1) إضافة لا تستجيب (تعلّق بلا خطأ): ننتقل فوراً إلى speechSynthesis داخل الـWebView ونُبلغ بالسبب مرة واحدة
  if (!(await checkNative())) {
    if (my !== gen) return;
    window.dispatchEvent(new CustomEvent('kalima-tts-error', { detail: 'الإضافة الأصلية لا تستجيب: ' + nativeWhy }));
    try {
      if (typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
        webSpeak(text, rate, onend, onerror);
        return;
      }
    } catch {}
    if (onerror) onerror();
    return;
  }
  // 2) الإضافة تستجيب: en-US ثم en-GB ثم en، مع إعادة محاولة (المحرّك قد لا يكون جاهزاً عند أول طلب)
  try {
    const { T } = await getPlugin();
    for (const lang of LANGS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (my !== gen) return;
        try {
          await T.speak({ text, lang, rate, pitch: 1, volume: 1, category: 'ambient' });
          if (my === gen && onend) onend();
          return;
        } catch (e) {
          last = msg(e);
          if (my !== gen) return;
          if (attempt === 0) await sleep(400);
        }
      }
    }
  } catch (e) {
    last = msg(e);
  }
  if (my !== gen) return;
  try {
    if (typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
      webSpeak(text, rate, onend, onerror);
      return;
    }
  } catch (e) {
    last += ' | ' + msg(e);
  }
  window.dispatchEvent(new CustomEvent('kalima-tts-error', { detail: last || 'unknown' }));
  if (onerror) onerror();
}

// ينطق نصاً إنكليزياً. onend عند الانتهاء، onerror عند الفشل.
export function speakText(text, rate, onend, onerror) {
  if (isNative) {
    nativeSpeak(text, rate, onend, onerror);
    return;
  }
  webSpeak(text, rate, onend, onerror);
}

export function cancelSpeech() {
  gen++;
  if (isNative) {
    getPlugin().then(({ T }) => T.stop()).catch(() => {});
    return;
  }
  speechSynthesis.cancel();
}

// تشخيص النطق (يُعرض في الملف الشخصي على الجوال). log(line) يُستدعى مع كل خطوة حتى يرى المستخدم التقدّم ولو علّقت خطوة.
export async function ttsDiagnose(log = () => {}) {
  const L = (s) => log(s);
  L('المنصة: ' + (isNative ? Capacitor.getPlatform() : 'ويب'));
  const m = navigator.userAgent.match(/Chrome\/([\d.]+)/);
  L('محرّك الـWebView: ' + (m ? 'Chrome ' + m[1] : navigator.userAgent.slice(0, 60)));
  if (isNative) {
    let avail = '؟';
    try {
      avail = Capacitor.isPluginAvailable('TextToSpeech') ? 'نعم' : 'لا (تُستخدم نسخة الويب بدلها)';
    } catch {}
    L('إضافة النطق مسجّلة أصلياً: ' + avail);
    try {
      const names = ((window.Capacitor && window.Capacitor.PluginHeaders) || []).map((h) => h.name);
      L('الإضافات الأصلية المسجّلة: ' + (names.join(', ') || '(لا شيء)'));
    } catch {}
  }
  // speechSynthesis في الـWebView
  try {
    if ('speechSynthesis' in window) {
      let n = speechSynthesis.getVoices().length;
      if (!n) {
        await new Promise((r) => {
          speechSynthesis.onvoiceschanged = () => r();
          setTimeout(r, 2000);
        });
        n = speechSynthesis.getVoices().length;
      }
      L('speechSynthesis: موجود، عدد الأصوات = ' + n);
    } else L('speechSynthesis: غير موجود');
  } catch (e) {
    L('speechSynthesis: خطأ ' + msg(e));
  }
  if (!isNative) return;
  nativeState = 'unknown';
  L('فحص استجابة إضافة النطق الأصلية…');
  const ok = await checkNative(true);
  L(ok ? 'الإضافة الأصلية تستجيب ✓' : 'الإضافة الأصلية لا تستجيب ✗: ' + nativeWhy);
  if (ok) {
    const { T } = await getPlugin();
    for (const lang of LANGS) {
      try {
        const r = await withTimeout(T.isLanguageSupported({ lang }), 3000, lang);
        L(lang + ': ' + (r.supported ? 'مدعومة' : 'غير مدعومة'));
      } catch (e) {
        L(lang + ': ' + msg(e));
      }
    }
    try {
      const l = await withTimeout(T.getSupportedLanguages(), 3000, 'getSupportedLanguages');
      L('عدد لغات المحرّك: ' + l.languages.length);
    } catch (e) {
      L('getSupportedLanguages: ' + msg(e));
    }
  }
  // تجربة نطق فعلية
  L('تجربة نطق: «Hello»…');
  let settled = false;
  setTimeout(() => !settled && L('لا يوجد رد من النطق بعد 8 ثوانٍ'), 8000);
  speakText('Hello, this is a test.', 0.85, () => ((settled = true), L('انتهى النطق بنجاح ✓')), () => ((settled = true), L('فشل النطق ✗')));
}

// يفتح شاشة تثبيت بيانات الصوت في أندرويد؛ يرجع نصاً بالنتيجة
export async function ttsOpenInstall() {
  try {
    const { T } = await withTimeout(getPlugin(), 4000, 'تحميل الإضافة');
    await withTimeout(T.openInstall(), 4000, 'openInstall');
    return 'تم فتح شاشة بيانات الصوت';
  } catch (e) {
    return 'تعذّر فتح شاشة بيانات الصوت: ' + msg(e);
  }
}
