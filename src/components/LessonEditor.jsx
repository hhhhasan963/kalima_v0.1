import { useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { KIND_LABELS, emptyMc, emptySentence, emptyTf, fileToForm, formErrors, formToFile, startsNewParagraph } from '../lib/lessonForm.js';
import { useFx } from '../hooks/useFx.jsx';
import { useLessons } from '../hooks/useLessons.jsx';
import Hero, { HeroText, UiContext } from './Hero.jsx';

const TABS = [
  ['info', 'معلومات الدرس'],
  ['text', 'النص'],
  ['questions', 'الأسئلة'],
  ['words', 'الكلمات'],
];

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const a = arr.slice();
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};
const setAt = (arr, i, patch) => arr.map((x, k) => (k === i ? { ...x, ...patch } : x));
const removeAt = (arr, i) => arr.filter((_, k) => k !== i);
const insertAt = (arr, i, item) => [...arr.slice(0, i), item, ...arr.slice(i)];

function RowTools({ i, n, onMove, onDelete }) {
  return (
    <span className="ed-tools">
      <button type="button" className="ed-ic" title="أعلى" disabled={i === 0} onClick={() => onMove(-1)}>↑</button>
      <button type="button" className="ed-ic" title="أسفل" disabled={i === n - 1} onClick={() => onMove(1)}>↓</button>
      <button type="button" className="ed-ic del" title="حذف" onClick={onDelete}>🗑</button>
    </span>
  );
}

// ===== تبويب النص =====
function TextTab({ form, set }) {
  const S = form.sentences;
  const upd = (next) => set({ ...form, sentences: next });
  return (
    <>
      <p className="tip">
        كل مربع جملة: النص الإنكليزي ثم ترجمته. الخط الفاصل يعني بداية فقرة جديدة. «العنوان» يظهر بخط مميز ويأخذ فقرة وحده.
      </p>
      {S.map((s, i) => {
        const np = startsNewParagraph(S, i);
        const forced = i === 0 || s.kind === 'h' || (i > 0 && S[i - 1].kind === 'h');
        return (
          <div key={i}>
            {np && i > 0 && <div className="ed-para">فقرة جديدة</div>}
            <div className="card ed-card">
              <div className="ed-top">
                <span className="ed-n">{i + 1}</span>
                <select value={s.kind} onChange={(e) => upd(setAt(S, i, { kind: e.target.value }))} aria-label="نوع الجملة">
                  {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <label className="ed-chk">
                  <input type="checkbox" checked={np} disabled={forced} onChange={(e) => upd(setAt(S, i, { newPara: e.target.checked }))} />
                  بداية فقرة
                </label>
                <RowTools i={i} n={S.length} onMove={(d) => upd(move(S, i, d))} onDelete={() => upd(removeAt(S, i))} />
              </div>
              <textarea dir="ltr" rows={2} placeholder="English sentence" value={s.en} onChange={(e) => upd(setAt(S, i, { en: e.target.value }))} />
              <textarea dir="rtl" rows={2} placeholder="الترجمة العربية" value={s.ar} onChange={(e) => upd(setAt(S, i, { ar: e.target.value }))} />
              <button type="button" className="ed-add" onClick={() => upd(insertAt(S, i + 1, emptySentence()))}>➕ إضافة جملة بعد هذه</button>
            </div>
          </div>
        );
      })}
      {!S.length && <button type="button" className="btn" onClick={() => upd([emptySentence()])}>➕ إضافة أول جملة</button>}
    </>
  );
}

// ===== تبويب الأسئلة =====
function QuestionsTab({ form, set }) {
  const Q = form.questions;
  const upd = (next) => set({ ...form, questions: next });
  return (
    <>
      <p className="tip">اختر الإجابة الصحيحة بالدائرة. «الشرح» يظهر للطالب بعد أن يجيب.</p>
      {Q.map((q, i) => (
        <div key={i} className="card ed-card">
          <div className="ed-top">
            <span className="ed-n">{i + 1}</span>
            <b className="ed-kind">{q.type === 'tf' ? 'صح أم خطأ' : 'اختيار من متعدد'}</b>
            <RowTools i={i} n={Q.length} onMove={(d) => upd(move(Q, i, d))} onDelete={() => upd(removeAt(Q, i))} />
          </div>
          <textarea dir="ltr" rows={2} placeholder={q.type === 'tf' ? 'The statement to judge…' : 'Question text… (use ___ for a blank)'} value={q.q} onChange={(e) => upd(setAt(Q, i, { q: e.target.value }))} />
          {q.type === 'tf' ? (
            <div className="ed-tf">
              {[[0, 'صح ✓'], [1, 'خطأ ✗']].map(([v, l]) => (
                <label key={v} className={q.correct === v ? 'on' : ''}>
                  <input type="radio" name={'tf' + i} checked={q.correct === v} onChange={() => upd(setAt(Q, i, { correct: v }))} /> {l}
                </label>
              ))}
            </div>
          ) : (
            <>
              {q.options.map((o, k) => (
                <div key={k} className={'ed-opt' + (q.correct === k ? ' on' : '')}>
                  <input type="radio" name={'mc' + i} checked={q.correct === k} onChange={() => upd(setAt(Q, i, { correct: k }))} aria-label="الإجابة الصحيحة" />
                  <input dir="ltr" type="text" placeholder={'Option ' + (k + 1)} value={o} onChange={(e) => upd(setAt(Q, i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) }))} />
                  <button
                    type="button"
                    className="ed-ic del"
                    title="حذف الخيار"
                    disabled={q.options.length <= 2}
                    onClick={() => upd(setAt(Q, i, { options: removeAt(q.options, k), correct: q.correct === k ? -1 : q.correct > k ? q.correct - 1 : q.correct }))}
                  >✕</button>
                </div>
              ))}
              {q.options.length < 6 && (
                <button type="button" className="ed-add" onClick={() => upd(setAt(Q, i, { options: [...q.options, ''] }))}>➕ إضافة خيار</button>
              )}
            </>
          )}
          <textarea dir="rtl" rows={2} placeholder="شرح الإجابة (يظهر بعد الحل)" value={q.e} onChange={(e) => upd(setAt(Q, i, { e: e.target.value }))} />
        </div>
      ))}
      <p>
        <button type="button" className="btn" onClick={() => upd([...Q, emptyMc()])}>➕ سؤال اختيار من متعدد</button>{' '}
        <button type="button" className="btn" onClick={() => upd([...Q, emptyTf()])}>➕ سؤال صح أم خطأ</button>
      </p>
    </>
  );
}

// ===== تبويب الكلمات =====
function WordsTab({ form, set }) {
  const W = form.words;
  const [q, setQ] = useState('');
  const upd = (next) => set({ ...form, words: next });
  const shown = W.map((x, i) => ({ ...x, i })).filter((x) => !q.trim() || x.w.toLowerCase().includes(q.trim().toLowerCase()) || x.m.includes(q.trim()));
  return (
    <>
      <p className="tip">
        الكلمات التي يظهر معناها عند ضغط الطالب عليها داخل النص. اكتب الكلمة بالإنكليزية (تُحفظ بحروف صغيرة) ومعناها بالعربية.
      </p>
      <div className="ed-wbar">
        <input type="search" className="ed-search" placeholder="🔍 ابحث عن كلمة…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn" onClick={() => { setQ(''); upd([{ w: '', m: '' }, ...W]); }}>➕ كلمة جديدة</button>
      </div>
      <p className="mu">{W.length} كلمة{q ? ` — المعروض ${shown.length}` : ''}</p>
      {shown.map((x) => (
        <div key={x.i} className="ed-word">
          <input dir="ltr" type="text" placeholder="word" value={x.w} onChange={(e) => upd(setAt(W, x.i, { w: e.target.value }))} />
          <input dir="rtl" type="text" placeholder="المعنى" value={x.m} onChange={(e) => upd(setAt(W, x.i, { m: e.target.value }))} />
          <button type="button" className="ed-ic del" title="حذف" onClick={() => upd(removeAt(W, x.i))}>🗑</button>
        </div>
      ))}
    </>
  );
}

// ===== صفحة التحرير =====
export default function LessonEditor({ id }) {
  const { leaveGuard, goBack } = useContext(UiContext);
  const { toast } = useFx();
  const { reload } = useLessons();
  const [form, setForm] = useState(null);
  const [snap, setSnap] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('teacher_export_lesson', { p_id: id });
      if (!alive) return;
      if (error) return setErr(error.code === '42501' ? 'ليس لديك صلاحية معلم.' : error.message || 'تعذّر تحميل الدرس.');
      const f = fileToForm(data);
      setForm(f);
      setSnap(JSON.stringify(f));
    })();
    return () => { alive = false; };
  }, [id]);

  const dirty = !!form && JSON.stringify(form) !== snap;
  const errors = useMemo(() => (form ? formErrors(form) : []), [form]);

  // تنبيه قبل مغادرة الصفحة بتعديلات غير محفوظة
  useEffect(() => {
    if (!leaveGuard) return;
    leaveGuard.current = () => !dirty || window.confirm('لديك تعديلات غير محفوظة. هل تريد الخروج بدون حفظها؟');
    const bu = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', bu);
    return () => { leaveGuard.current = null; window.removeEventListener('beforeunload', bu); };
  }, [dirty, leaveGuard]);

  const save = async () => {
    if (errors.length) {
      setShowErrors(true);
      const first = errors[0].tab;
      if (first !== tab) setTab(first);
      toast('راجع الملاحظات الحمراء قبل الحفظ');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('teacher_import_lesson', { p: formToFile(form) });
    setSaving(false);
    if (error) return toast(error.code === '42501' ? 'ليس لديك صلاحية معلم.' : error.message || 'تعذّر الحفظ.');
    setSnap(JSON.stringify(form));
    setShowErrors(false);
    toast('✓ تم حفظ التعديلات');
    reload();
  };

  const tabErrors = (t) => errors.filter((e) => e.tab === t).length;
  const b = form && form.base;

  return (
    <div id="edv" className="vw">
      <Hero title="تعديل درس" sig={id + ':' + (form ? 1 : 0)}>
        <HeroText badge={form ? form.label || 'Unit ' + b.unit : '…'} title={form ? form.title || '—' : '…'} sub="تعديل الدرس" />
      </Hero>

      {err && <div className="card trow failed"><p className="trow-n bad">{err}</p></div>}
      {!form && !err && <div className="card">جارٍ التحميل…</div>}

      {form && (
        <>
          <div className="ed-tabs" role="tablist">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {l}
                {k === 'text' && <small> {form.sentences.length}</small>}
                {k === 'questions' && <small> {form.questions.length}</small>}
                {k === 'words' && <small> {form.words.length}</small>}
                {showErrors && tabErrors(k) > 0 && <i className="ed-dot" />}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="card ed-card">
              <label className="ed-f">العنوان بالإنكليزية
                <input dir="ltr" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <label className="ed-f">العنوان بالعربية
                <input dir="rtl" type="text" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
              </label>
              <label className="ed-f">الاسم المختصر (يظهر في الأعلى، مثل Unit 5)
                <input dir="ltr" type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </label>
              <p className="mu">
                مكان الدرس: الصف {b.grade} · {b.book === 'wb' ? 'كتاب النشاط' : 'كتاب الطالب'} · الوحدة {b.unit}. لا يمكن تغييره من هنا (لنقل درس ارفع ملفاً جديداً).
              </p>
            </div>
          )}
          {tab === 'text' && <TextTab form={form} set={setForm} />}
          {tab === 'questions' && <QuestionsTab form={form} set={setForm} />}
          {tab === 'words' && <WordsTab form={form} set={setForm} />}

          {showErrors && errors.length > 0 && (
            <div className="card ed-errs" role="alert">
              <b>يلزم تصحيح {errors.length} ملاحظة قبل الحفظ:</b>
              <ul>
                {errors.slice(0, 12).map((e, i) => (
                  <li key={i}><button type="button" className="ed-link" onClick={() => setTab(e.tab)}>{e.msg}</button></li>
                ))}
                {errors.length > 12 && <li>… و{errors.length - 12} ملاحظة أخرى</li>}
              </ul>
            </div>
          )}

          <div className="ed-save">
            <button className="cb" id="esave" disabled={saving || !dirty} onClick={save}>
              {saving ? 'جارٍ الحفظ…' : dirty ? 'حفظ التعديلات' : 'لا توجد تعديلات'}
            </button>
            <button className="btn" onClick={goBack}>رجوع</button>
            {dirty && <span className="ed-unsaved">● تعديلات غير محفوظة</span>}
          </div>
        </>
      )}
    </div>
  );
}
