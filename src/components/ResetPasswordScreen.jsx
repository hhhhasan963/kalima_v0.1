import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { APP_VERSION } from '../version.js';
import logo from '../assets/logo.svg';

// تظهر بعد أن يضغط المستخدم رابط «استعادة كلمة المرور» في بريده
export default function ResetPasswordScreen() {
  const { updatePassword, cancelRecovery, user } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = pw.length >= 6 && pw === pw2;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    const { error: err } = await updatePassword(pw);
    setBusy(false);
    if (!err) return; // تُغلق الشاشة تلقائياً ويدخل التطبيق
    const code = err.code || '';
    const msg = err.message || '';
    if (code === 'same_password' || /different from the old/i.test(msg)) setError('اختر كلمة مرور مختلفة عن القديمة.');
    else if (code === 'weak_password' || /at least/i.test(msg)) setError('كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.');
    else if (/fetch|network/i.test(msg)) setError('تعذّر الاتصال بالإنترنت. حاول مرة أخرى.');
    else setError('تعذّر تغيير كلمة المرور. اطلب رابطاً جديداً وحاول مرة أخرى.');
  };

  return (
    <div className="auth">
      <div className="auth-box">
        <div className="logo">
          <img src={logo} alt="كلمة" />
        </div>
        <h1>كلمة</h1>
        <p className="mu">اختيار كلمة مرور جديدة</p>
        <form className="card auth-card" onSubmit={submit} noValidate>
          {user && user.email && <p dir="ltr" style={{ textAlign: 'center', margin: '0 0 12px' }}>{user.email}</p>}
          <label>
            كلمة المرور الجديدة
            <input type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6 أحرف على الأقل" />
          </label>
          <label>
            أعد كتابتها
            <input type="password" dir="ltr" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </label>
          {pw2 && pw !== pw2 && <p className="auth-err" role="alert">كلمتا المرور غير متطابقتين.</p>}
          {error && <p className="auth-err" role="alert">{error}</p>}
          <button className="cb" type="submit" id="resetgo" disabled={!valid || busy}>
            {busy ? 'لحظة…' : 'حفظ كلمة المرور'}
          </button>
          <button type="button" className="auth-link" onClick={cancelRecovery}>
            إلغاء
          </button>
        </form>
        <p className="auth-ver">الإصدار {APP_VERSION}</p>
      </div>
    </div>
  );
}
