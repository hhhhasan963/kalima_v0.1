import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { authUrlError } from '../lib/supabase.js';
import { APP_VERSION } from '../version.js';
import logo from '../assets/logo.svg';

// رسائل الخطأ بالعربية
function arabicError(err) {
  const code = err && (err.code || err.error_code);
  const msg = (err && err.message) || '';
  const map = {
    invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    email_not_confirmed: 'لم تؤكّد بريدك بعد. افتح رسالة التأكيد التي وصلتك ثم سجّل الدخول.',
    user_already_exists: 'هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.',
    weak_password: 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.',
    email_address_invalid: 'البريد الإلكتروني غير صالح.',
    validation_failed: 'تحقق من البريد وكلمة المرور.',
    over_email_send_rate_limit: 'تم إرسال عدد كبير من الرسائل. حاول بعد قليل.',
    otp_expired: 'انتهت صلاحية الرابط. اطلب رابطاً جديداً.',
    same_password: 'اختر كلمة مرور مختلفة عن القديمة.',
    over_request_rate_limit: 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.',
    signup_disabled: 'إنشاء الحسابات الجديدة متوقف حالياً.',
  };
  if (code && map[code]) return map[code];
  if (/fetch|network|Failed to/i.test(msg) || (err && err.name === 'AuthRetryableFetchError')) {
    return 'تعذّر الاتصال بالإنترنت. تأكد من اتصالك وحاول مرة أخرى.';
  }
  if (/Invalid login credentials/i.test(msg)) return map.invalid_credentials;
  if (/already registered/i.test(msg)) return map.user_already_exists;
  if (/Password should be/i.test(msg)) return map.weak_password;
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

export default function AuthScreen() {
  const { signIn, signUp, enterGuest, requestReset } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(authUrlError ? arabicError({ code: authUrlError.code, message: authUrlError.message }) : '');
  const [sent, setSent] = useState(false); // تم إرسال رسالة (تأكيد البريد أو استعادة كلمة المرور)

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const validMail = /^\S+@\S+\.\S+$/.test(email.trim());
  const valid = validMail && (isForgot || password.length >= 6);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const mail = email.trim();
      if (isForgot) {
        const { error: err } = await requestReset(mail);
        if (err) throw err;
        setSent(true);
      } else if (isSignup) {
        const { data, error: err } = await signUp(mail, password);
        if (err) throw err;
        // Supabase يعيد مستخدماً بلا هوية عندما يكون البريد مسجلاً سابقاً
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError('هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.');
        } else if (!data.session) {
          setSent(true); // التأكيد بالبريد مفعّل
        }
        // وإلا: دخل مباشرة، وستنتقل الشاشة تلقائياً
      } else {
        const { error: err } = await signIn(mail, password);
        if (err) throw err;
      }
    } catch (err) {
      setError(arabicError(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSent(false);
  };

  return (
    <div className="auth">
      <div className="auth-box">
        <div className="logo">
          <img src={logo} alt="كلمة" />
        </div>
        <h1>كلمة</h1>
        <p className="mu">تعلّم الإنكليزية كلمة بكلمة</p>

        {sent ? (
          <div className="card auth-card">
            <h2>تحقق من بريدك</h2>
            {isForgot ? (
              <p>
                إن كان <b dir="ltr">{email.trim()}</b> مسجّلاً عندنا فقد أرسلنا إليه رابطاً لاختيار كلمة مرور جديدة. افتح الرسالة
                واضغط الرابط (وإن لم تجدها فتفقّد البريد غير الهام).
              </p>
            ) : (
              <p>
                أرسلنا رسالة تأكيد إلى <b dir="ltr">{email.trim()}</b>. اضغط الرابط الذي فيها، ثم ارجع هنا وسجّل الدخول.
              </p>
            )}
            <button className="cb" onClick={() => switchMode('login')}>
              الذهاب لتسجيل الدخول
            </button>
          </div>
        ) : (
          <form className="card auth-card" onSubmit={submit} noValidate>
            {isForgot ? (
              <>
                <h2>نسيت كلمة المرور؟</h2>
                <p>اكتب بريدك الإلكتروني وسنرسل لك رابطاً لاختيار كلمة مرور جديدة.</p>
              </>
            ) : (
              <div className="auth-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={!isSignup} onClick={() => switchMode('login')}>
                  دخول
                </button>
                <button type="button" role="tab" aria-selected={isSignup} onClick={() => switchMode('signup')}>
                  حساب جديد
                </button>
              </div>
            )}

            <label>
              البريد الإلكتروني
              <input
                type="email"
                dir="ltr"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            {!isForgot && (
              <label>
                كلمة المرور
                <input
                  type="password"
                  dir="ltr"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                />
              </label>
            )}

            {error && <p className="auth-err" role="alert">{error}</p>}

            <button className="cb" type="submit" disabled={!valid || busy}>
              {busy ? 'لحظة…' : isForgot ? 'أرسل رابط الاستعادة' : isSignup ? 'إنشاء الحساب' : 'تسجيل الدخول'}
            </button>
            {mode === 'login' && (
              <button type="button" className="auth-link" id="forgot" onClick={() => switchMode('forgot')}>
                نسيت كلمة المرور؟
              </button>
            )}
            {isForgot && (
              <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                رجوع لتسجيل الدخول
              </button>
            )}
            {isSignup && <p className="auth-note">سيُنقل تقدّمك الحالي على هذا الجهاز إلى حسابك الجديد.</p>}
          </form>
        )}

        {!sent && !isForgot && (
          <button type="button" className="auth-guest" onClick={enterGuest}>
            جرّب كزائر
            <small>الدرس الأول فقط، بدون حساب</small>
          </button>
        )}
        <p className="auth-ver">الإصدار {APP_VERSION}</p>
      </div>
    </div>
  );
}
