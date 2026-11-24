import { Ico } from './Icons.jsx';
// نافذة تظهر عند فتح درس «مقفل للجميع» (لم يُتَح بعد)
export default function SoonPrompt({ onClose }) {
  return (
    <div className="lockbg" onClick={onClose} role="dialog" aria-modal="true">
      <div className="card lockbox" onClick={(e) => e.stopPropagation()}>
        <div className="lockico"><Ico n="clock" /></div>
        <h2>سيتم توفير الدرس قريباً</h2>
        <p>هذا الدرس قيد التجهيز وسيُفتح لك فور أن يصبح جاهزاً.</p>
        <button className="cb" onClick={onClose}>حسناً</button>
      </div>
    </div>
  );
}
