// النطق: على الجوال (Capacitor) نستخدم محرّك النظام عبر إضافة Text-to-Speech، وعلى الويب speechSynthesis.
import { isNative } from './native.js';

let plugin = null;
const getPlugin = async () => {
  if (!plugin) plugin = (await import('@capacitor-community/text-to-speech')).TextToSpeech;
  return plugin;
};

// ينطق نصاً إنكليزياً. onend عند الانتهاء، onerror عند الفشل.
export function speakText(text, rate, onend, onerror) {
  if (isNative) {
    getPlugin()
      .then((T) => T.speak({ text, lang: 'en-US', rate, pitch: 1, volume: 1, category: 'ambient' }))
      .then(() => onend && onend())
      .catch(() => onerror && onerror());
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  if (onend) u.onend = onend;
  if (onerror) u.onerror = onerror;
  speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (isNative) {
    getPlugin().then((T) => T.stop()).catch(() => {});
    return;
  }
  speechSynthesis.cancel();
}
