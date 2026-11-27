// النطق: على الجوال (Capacitor) نستخدم محرّك النظام عبر إضافة Text-to-Speech، وعلى الويب speechSynthesis.
// على الجوال: نجرّب en-US ثم en-GB ثم en (بعض المحرّكات لا تدعم en-US وحدها)، ونعيد المحاولة إن كان المحرّك لم يكتمل تشغيله،
// وإن فشل كل شيء نجرّب speechSynthesis داخل الـWebView، وإن فشل أيضاً نُبلغ التطبيق برسالة السبب (حدث kalima-tts-error).
import { Capacitor } from '@capacitor/core';
import { isNative } from './native.js';

const LANGS = ['en-US', 'en-GB', 'en'];
let plugin = null;
let gen = 0; // يُلغي المحاولات المتأخرة عند طلب نطق جديد أو إيقاف
const getPlugin = async () => {
  if (!plugin) plugin = (await import('@capacitor-community/text-to-speech')).TextToSpeech;
  return plugin;
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

async function nativeSpeak(text, rate, onend, onerror) {
  const my = ++gen;
  let last = '';
  try {
    const T = await getPlugin();
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
          // «اللغة غير مدعومة» قد تكون لأن المحرّك لم يكتمل تشغيله بعد: نمهله ثم نعيد قبل الانتقال للغة التالية
          if (attempt === 0) await sleep(400);
        }
      }
    }
  } catch (e) {
    last = msg(e);
  }
  if (my !== gen) return;
  // آخر محاولة: speechSynthesis داخل الـWebView
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
    getPlugin().then((T) => T.stop()).catch(() => {});
    return;
  }
  speechSynthesis.cancel();
}

// تشخيص النطق (يُعرض في الملف الشخصي على الجوال)
export async function ttsDiagnose() {
  const out = ['المنصة: ' + (isNative ? Capacitor.getPlatform() : 'ويب')];
  if (!isNative) {
    out.push('speechSynthesis: ' + ('speechSynthesis' in window ? 'موجود' : 'غير موجود'));
    try {
      out.push('عدد الأصوات: ' + speechSynthesis.getVoices().length);
    } catch {}
    return out;
  }
  try {
    const T = await getPlugin();
    for (const lang of LANGS) {
      try {
        const r = await T.isLanguageSupported({ lang });
        out.push(lang + ': ' + (r.supported ? 'مدعومة' : 'غير مدعومة'));
      } catch (e) {
        out.push(lang + ': خطأ ' + msg(e));
      }
    }
    try {
      const l = await T.getSupportedLanguages();
      out.push('عدد لغات المحرّك: ' + l.languages.length);
    } catch (e) {
      out.push('getSupportedLanguages: ' + msg(e));
    }
  } catch (e) {
    out.push('تعذّر تحميل إضافة النطق: ' + msg(e));
  }
  return out;
}

// يفتح شاشة تثبيت بيانات الصوت في أندرويد
export async function ttsOpenInstall() {
  try {
    const T = await getPlugin();
    await T.openInstall();
  } catch {}
}
