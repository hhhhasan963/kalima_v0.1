import { Ico } from './Icons.jsx';
// نافذة تظهر عندما يحاول الزائر فتح درس مقفل
export default function LockPrompt({ onSignup, onClose }) {
  return (
    <div className="lockbg" onClick={onClose} role="dialog" aria-modal="true">
      <div className="card lockbox" onClick={(e) => e.stopPropagation()}>
        <div className="lockico"><Ico n="lock" /></div>
        <h2>هذا الدرس للمسجّلين</h2>
        <p>الدرس الأول مفتوح لك للتجربة. أنشئ حساباً مجانياً لتفتح كل الدروس ويُحفظ تقدّمك على حسابك.</p>
        <button className="cb" onClick={onSignup}>إنشاء حساب أو تسجيل الدخول</button>
        <button className="gh" onClick={onClose}>لاحقاً</button>
      </div>
    </div>
  );
}
