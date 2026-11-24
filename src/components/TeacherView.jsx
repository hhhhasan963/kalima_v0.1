import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { FILE_NAME_HELP, checkFileName, fileNameFor, lessonIdOf, summarize, validateLesson } from '../lib/lessonFile.js';
import { useFx } from '../hooks/useFx.jsx';
import { useLessons } from '../hooks/useLessons.jsx';
import Hero, { HeroText, UiContext } from './Hero.jsx';

const MAX_FILES = 30;
const MAX_BYTES = 3_000_000;

function uploadError(err) {
  if (err && err.code === '42501') return 'ليس لديك صلاحية معلم.';
  const msg = (err && err.message) || '';
  if (/fetch|network/i.test(msg)) return 'تعذّر الاتصال بالإنترنت.';
  return msg || 'حدث خطأ غير متوقع.';
}

const ACCESS_LABEL = { open: '🔓 مفتوح للجميع', members: '🔒 مقفل للزوار', closed: '⛔ مقفل للجميع' };

const STATE_TEXT = {
  ready: '',
  uploading: 'جارٍ الرفع…',
  done: '✓ تم الرفع',
  failed: '✗ فشل الرفع',
};


// قائمة الدروس الحالية: تحميل · تعديل · إخفاء/إظهار · حذف
function LessonManager({ refreshKey, onChanged }) {
  const { v, nav, go } = useContext(UiContext);
  const { toast } = useFx();
  const { reload } = useLessons();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('teacher_list_lessons');
    if (error) setErr(uploadError(error));
    else {
      setErr('');
      setList(data || []);
    }
  }, []);

  // نحمّل القائمة عند فتح الصفحة وبعد أي رفع
  useEffect(() => {
    if (v === 'teach') load();
  }, [v, nav, refreshKey, load]);

  const run = async (id, fn, okMsg) => {
    setBusy(id);
    const res = await fn();
    setBusy('');
    if (res && res.error) {
      toast(uploadError(res.error));
      return false;
    }
    toast(okMsg || String(res.data));
    await load();
    await reload();
    onChanged && onChanged();
    return true;
  };

  const download = async (id) => {
    setBusy(id);
    const { data, error } = await supabase.rpc('teacher_export_lesson', { p_id: id });
    setBusy('');
    if (error) return toast(uploadError(error));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileNameFor(data);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  // التجميع: الصف · الكتاب
  const groups = [];
  (list || []).forEach((l) => {
    const key = l.grade + '-' + l.bookCode;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, title: `الصف ${l.grade} · ${l.bookTitle}`, items: [] };
      groups.push(g);
    }
    g.items.push(l);
  });

  return (
    <>
      <p className="sec">الدروس الحالية{list ? ` (${list.length})` : ''}</p>
      {err && <div className="card trow failed"><p className="trow-n bad">{err}</p></div>}
      {list === null && !err && <div className="card">جارٍ التحميل…</div>}
      {groups.map((g) => (
        <div key={g.key}>
          <p className="tgroup">{g.title}</p>
          {g.items.map((l) => (
            <div key={l.id} className={'card lrow' + (l.published ? '' : ' off')}>
              <div className="lrow-h">
                <span className="lrow-n" dir="ltr">{l.label}</span>
                <div>
                  <b dir="ltr">{l.title}</b>
                  <small>{l.titleAr}</small>
                </div>
              </div>
              <p className="lrow-m">
                {l.sentences} جملة · {l.questions} سؤال · {l.words} كلمة
                {!l.published && <span className="tag off"> · 🙈 مخفي عن الطلاب</span>}
                <span className={'tag' + (l.access === 'open' ? '' : ' off')}> · {ACCESS_LABEL[l.access]}</span>
              </p>
              <label className="lrow-lock">
                القفل
                <select
                  value={l.access}
                  disabled={!!busy}
                  onChange={(e) => run(l.id, () => supabase.rpc('teacher_set_access', { p_id: l.id, p_access: e.target.value }))}
                >
                  <option value="open">🔓 مفتوح للجميع</option>
                  <option value="members">🔒 مقفل للزوار (يفتح للمسجلين)</option>
                  <option value="closed">⛔ مقفل للجميع («سيتم توفير الدرس قريباً»)</option>
                </select>
              </label>
              <div className="lrow-a">
                <button className="btn" disabled={!!busy} onClick={() => download(l.id)}>⬇ تحميل</button>
                <button className="btn" disabled={!!busy} onClick={() => go('edit/' + l.id, { deep: true })}>✏️ تعديل</button>
                <button className="btn" disabled={!!busy} onClick={() => run(l.id, () => supabase.rpc('teacher_set_published', { p_id: l.id, p_published: !l.published }))}>
                  {l.published ? '🙈 إخفاء' : '👁 إظهار'}
                </button>
                <button className="btn del" disabled={!!busy} onClick={() => setConfirmId(confirmId === l.id ? null : l.id)}>🗑 حذف</button>
              </div>
              {confirmId === l.id && (
                <div className="lrow-c">
                  <p>سيُحذف الدرس «<span dir="ltr">{l.title}</span>» نهائياً مع جمله وأسئلته وكلماته. (يمكن إعادته برفع ملفه من جديد، فاحتفظ بنسخة بزر «تحميل».)</p>
                  <button className="cb rd" disabled={!!busy} onClick={async () => { await run(l.id, () => supabase.rpc('teacher_delete_lesson', { p_id: l.id })); setConfirmId(null); }}>
                    نعم، احذف
                  </button>{' '}
                  <button className="btn" onClick={() => setConfirmId(null)}>إلغاء</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// صفحة المعلم: رفع ملفات الدروس (G9-SB-U13.json) إلى قاعدة البيانات
export default function TeacherView() {
  const { reload } = useLessons();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reloaded, setReloaded] = useState(false);
  const [newAccess, setNewAccess] = useState('members');
  const [refreshKey, setRefreshKey] = useState(0);
  const input = useRef(null);

  const onPick = async (e) => {
    const files = [...e.target.files].slice(0, MAX_FILES);
    e.target.value = '';
    if (!files.length) return;
    setReloaded(false);
    const seen = new Set();
    const next = [];
    for (const f of files) {
      const it = { key: f.name + ':' + f.size + ':' + f.lastModified, name: f.name, errors: [], state: 'ready' };
      if (f.size > MAX_BYTES) it.errors.push('الملف كبير جداً (الحد 3 ميغابايت)');
      else {
        try {
          const o = JSON.parse(await f.text());
          it.obj = o;
          it.errors.push(...validateLesson(o), ...checkFileName(f.name, o));
          if (!it.errors.length) {
            it.id = lessonIdOf(o);
            it.title = o.title;
            it.label = o.label || '';
            it.sum = summarize(o);
            if (seen.has(it.id)) it.errors.push('نفس الدرس مختار مرتين');
            seen.add(it.id);
          }
        } catch (err) {
          it.errors.push('JSON غير صالح: ' + err.message);
        }
      }
      if (it.errors.length) it.state = 'error';
      next.push(it);
    }
    // أي الدروس موجودة مسبقاً (سيتم استبدالها)؟
    const ids = next.filter((i) => i.state === 'ready').map((i) => i.id);
    if (ids.length && supabase) {
      const { data } = await supabase.from('lessons').select('id,title').in('id', ids);
      const map = new Map((data || []).map((r) => [r.id, r.title]));
      next.forEach((i) => {
        if (i.id) i.existing = map.has(i.id) ? map.get(i.id) : null;
      });
    }
    setItems(next);
  };

  const readyCount = items.filter((i) => i.state === 'ready').length;

  const upload = async () => {
    setBusy(true);
    const list = [...items];
    let okCount = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].state !== 'ready') continue;
      list[i] = { ...list[i], state: 'uploading' };
      setItems([...list]);
      const { data, error } = await supabase.rpc('teacher_import_lesson', { p: list[i].obj, p_access: newAccess });
      if (error) list[i] = { ...list[i], state: 'failed', msg: uploadError(error) };
      else {
        okCount++;
        list[i] = { ...list[i], state: 'done', msg: String(data) };
      }
      setItems([...list]);
    }
    if (okCount) {
      await reload(); // تظهر الدروس الجديدة عندك فوراً
      setReloaded(true);
      setRefreshKey((k) => k + 1);
    }
    setBusy(false);
  };

  return (
    <div id="tcv" className="vw">
      <Hero title="إدارة الدروس" sig={String(items.length)}>
        <HeroText badge="للمعلمين" title="إدارة الدروس" sub="ارفع ملفات الدروس بصيغة JSON" />
      </Hero>

      <div className="card">
        <p className="tip" style={{ margin: 0 }}>
          {FILE_NAME_HELP}. يجب أن تطابق بياناته (الصف والكتاب والوحدة) ما داخل الملف. الوحدة 6.5 أو 12.5 = درس مراجعة
          (كتاب الطالب) أو اختبار تقدّم (كتاب النشاط). رفع درس موجود يستبدله (ويبقى قفله كما هو).
        </p>
        <label className="lrow-lock" style={{ marginTop: 12 }}>
          قفل الدروس <b>الجديدة</b> عند رفعها
          <select value={newAccess} onChange={(e) => setNewAccess(e.target.value)} disabled={busy}>
            <option value="members">🔒 مقفل للزوار (يفتح للمسجلين)</option>
            <option value="open">🔓 مفتوح للجميع</option>
            <option value="closed">⛔ مقفل للجميع (قريباً)</option>
          </select>
        </label>
        <p style={{ margin: '12px 0 0' }}>
          <input
            ref={input}
            id="tfiles"
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            onChange={onPick}
          />
          <button className="cb" id="tpick" onClick={() => input.current && input.current.click()} disabled={busy}>
            اختيار ملفات الدروس
          </button>
        </p>
      </div>

      {items.length > 0 && (
        <>
          <p className="sec">الملفات المختارة ({items.length})</p>
          {items.map((it) => (
            <div key={it.key} className={'card trow ' + it.state}>
              <div className="trow-h">
                <b dir="ltr">{it.name}</b>
                <span className="trow-st">
                  {it.state === 'error' ? '✗ فيه أخطاء' : STATE_TEXT[it.state] || (it.existing ? '⚠️ سيستبدل الموجود' : '🆕 درس جديد')}
                </span>
              </div>
              {it.title && (
                <p className="trow-t">
                  <span dir="ltr">{it.label ? it.label + ' · ' : ''}{it.title}</span>
                  {it.sum && <small> — {it.sum.sentences} جملة · {it.sum.questions} سؤال · {it.sum.words} كلمة</small>}
                </p>
              )}
              {it.state === 'ready' && it.existing && <p className="trow-n">سيُستبدل الدرس الحالي: <span dir="ltr">{it.existing}</span></p>}
              {it.errors.length > 0 && (
                <ul className="trow-e">
                  {it.errors.map((er, i) => (
                    <li key={i}>{er}</li>
                  ))}
                </ul>
              )}
              {it.msg && <p className={'trow-n' + (it.state === 'failed' ? ' bad' : '')}>{it.msg}</p>}
            </div>
          ))}
          <p>
            <button className="cb" id="tgo" onClick={upload} disabled={busy || !readyCount}>
              {busy ? 'جارٍ الرفع…' : `رفع ${readyCount} درس`}
            </button>{' '}
            <button className="btn" id="tclear" onClick={() => setItems([])} disabled={busy}>
              مسح القائمة
            </button>
          </p>
          {reloaded && <p className="tip">✓ تم تحديث الدروس. تظهر الآن في الكتب، وعند الطلاب في أول فتح للتطبيق.</p>}
        </>
      )}

      <LessonManager refreshKey={refreshKey} />
    </div>
  );
}
