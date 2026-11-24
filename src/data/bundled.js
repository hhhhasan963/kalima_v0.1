// نسخة مضمّنة في التطبيق: كل الدروس تُحمَّل من ملفات content/ عبر tools/build-bundled.mjs،
// فيعمل التطبيق بدون إنترنت من أول تشغيل. Supabase (إن وُجد) يحدّثها لاحقاً في الخلفية.
import { LESSONS, DICT } from './lessons.generated.js';

const DICT_A = "poorly:بشكل سيّئ|paid:مدفوع الأجر|teacher:معلمة / معلم|teachers:معلمين|west:غرب|bank:ضفة|won:فازت (فاز)|prize:جائزة|global:عالمي|committee:لجنة|praised:أشادت (مدح)|method:طريقة|methods:أساليب|employs:تستخدم (توظّف)|still:ما زالت|besides:إلى جانب|clown:مهرّج|outfit:زيّ|balloons:بالونات|hula-hoops:أطواق الهولاهوب|toy:لعبة|toys:ألعاب|cars:سيارات|puppets:دمى|explain:تشرح|lessons:دروس|aim:هدف|classroom:غرفة الصف|calm:هادئ|fun:ممتع|children:أطفال|forget:ينسى|struggle:كفاح|daily:يومي|life:حياة|open:يفتح|minds:عقول|play:يلعب / لعب|learn:يتعلم|learning:يتعلمون|kids:أطفال|realise:يدرك|addition:إضافة|pays:تدفع|own:خاص|money:مال|videos:مقاطع فيديو|even:حتى|month:شهر|school:مدرسة|year:عام|new:جديد|first:أول|eight-year-old:بعمر ثماني سنوات|pupils:تلاميذ|exercise:تمرين|book:دفتر / كتاب|parents:الأهل|often:غالباً|refuse:يرفض|focus:تركيز|soon:قريباً|changes:يتغير|improve:يحسّن|behaviour:سلوك|especially:خاصةً|troubled:مضطرب|academic:دراسي|results:نتائج|duty:واجب|build:تبني|characters:شخصيات|violence:عنف|motto:شعار|plans:تخطط|establish:تؤسّس|foundation:مؤسسة|winnings:مكاسب|train:تدرّب|other:آخرين|follow:تتبع|approach:نهج|worth:جدير|mentioning:بالذكر|dream:حلم|doctor:طبيبة / طبيب|failing:الفشل|prevent:يمنع|special:مميز|person:شخص|difference:فرق|make:تجعل / تُحدث|sees:ترى|says:تقول|said:قالت|hanan:حنان (اسم)|al-hroub:الحروب (اسم العائلة)|mrs:السيدة|was:كانت (كان)|a:أداة تنكير (واحد)|an:أداة تنكير (واحد)|the:أداة التعريف (ال)|in:في|then:ثم|she:هي|her:لها / ـها|their:لهم / ـهم|them:هم|they:هم|million:مليون|and:و|which:التي|of:من / لـ|with:مع / بـ|to:إلى / لـ / أن|where:حيث|can:يستطيع|about:عن|we:نحن|when:عندما|are:يكونون / هم|don't:لا (do not)|is:هو / يكون|for:لـ / من أجل|may:قد|not:لا / ليس|see:يرى|that:أن / ذلك|also:أيضاً|as:بوصف / كـ|it:هو / ذلك|no:لا|be:يكون|but:لكن|did:فعل مساعد للماضي (did not = لم)|from:من|could:يستطيع / استطاع|who:الذي|so:ذلك (do so = يفعل ذلك)|do:يفعل|use:تستخدم|uses:تستخدم|some:بعض|being:كونها|class:صف|classes:صفوف|powerpoint:برنامج العروض التقديمية (بوربوينت)";
const DICT_B = "light:نور|initiative:مبادرة|what:ما / ماذا|what's:ما هو / ما هي|started:بدأت (بدأ)|two:اثنان|people:أشخاص / ناس|now:الآن|includes:تضم|more:أكثر|than:من (في المقارنة)|volunteer:متطوّع|voluntarily:طوعاً|record:يسجّل / تسجيل|college:كلية|benefit:فائدة|visually:بصرياً|impaired:ذوو إعاقة|grade:صف دراسي|9th:التاسع|12th:الثاني عشر|university:جامعة|reference:مرجع|meet:تلبّي|actual:فعلية / حقيقية|need:احتياج / يحتاج|whatever:مهما|how:كيف|work:يعمل|usually:عادةً|desire:رغبة|study:يدرس|curriculum:منهاج|contacts:يتصل|administration:إدارة|provides:يزوّد|provide:يزوّد|needed:مطلوبة|divided:يُقسَّم|task:مهمة|number:عدد|social:اجتماعي|media:وسائل التواصل|page:صفحة|facebook:فيسبوك|youtube:يوتيوب|channel:قناة|announce:يعلنون|finished:أنهوا|this:هذا / هذه|these:هذه|publish:ينشرون|recording:تسجيل|saved:محفوظة|format:صيغة|mp3:صيغة ملفات صوتية|service:خدمة|cost:تكلفة / تكلّف|absolutely:تماماً|free:مجاني|i:أنا|e:اختصار لـ i.e. أي|doesn't:لا (does not)|anyone:أي شخص|anything:أي شيء|network:شبكة|access:وصول|tool:أداة|simple:بسيط|thing:شيء|mobile:هاتف محمول|laptop:حاسوب محمول|montage:مونتاج|professional:احترافي|project:مشروع|turning:تحويل|syrian:سوري|braille:طريقة برايل|help:يساعد|student:طالب|suffer:يعاني|sight:بصر|problem:مشكلة|target:هدف|trying:تحاول|bring:تُدخل|on:على|at:عند|by:بواسطة|into:إلى|all:كل / جميع|any:أي|one:واحد|if:إذا|will:سوف|would:سوف / كان سوف|have:لدى|has:لديه|others:آخرون|there:هناك|me:لي|my:ـي (ملكية)|you:أنت|he:هو|his:له|our:نا (ملكية)|only:فقط|very:جداً|just:فقط|like:مثل / يحب|such:مثل هذا|because:لأن|through:عبر / من خلال|while:بينما|why:لماذا|those:تلك|were:كانوا|been:كان|its:له / لها (ملكية)|life:حياة|lives:حياة|future:مستقبل|different:مختلف|futurologist:عالم مستقبليات|predict:يتوقع|probably:ربما|field:مجال|activity:نشاط|entertainment:ترفيه|technology:تكنولوجيا|imagined:تخيّل|easy:سهل|relaxing:مريح|worse:أسوأ|difficult:صعب|comfortable:مريح|think:أعتقد|obvious:واضح|aspect:جانب|education:تعليم|better:أفضل|e-books:الكتب الإلكترونية|replace:تحلّ محل|traditional:تقليدي|robot:روبوت|every:كل|day:يوم|on-line:عبر الإنترنت|teaching:تعليم|absent:غائب|second:ثانياً|health:صحة|important:مهم|role:دور|medicine:دواء|get:يصبح / يحصل|sometimes:أحياناً|add:أضف|scientist:عالم|researcher:باحث|find:يجد|cure:علاج|many:كثير|disease:مرض|aids:الإيدز|cancer:السرطان|live:يعيش|longer:أطول|third:ثالثاً|housing:سكن|end:نهاية / ينتهي|everywhere:في كل مكان|everyone:الجميع|place:مكان|fourth:رابعاً|hunger:جوع|come:يأتي|grow:يزرع|type:نوع|crop:محصول|roof:سطح|building:مبنى|fifth:خامساً|last:أخيراً|world:العالم|peace:سلام|spread:ينتشر|previous:سابقة|nothing:لا شيء|fight:يتقاتل|food:طعام|happier:أسعد|love:حب|seen:رأى|house:بيت|home:منزل";

const D = Object.create(null);
function parseDict(str, onlyNew) {
  str.split('|').forEach((s) => {
    const i = s.indexOf(':');
    const k = s.slice(0, i).trim();
    if (!k || (onlyNew && k in D)) return;
    D[k] = s.slice(i + 1).trim();
  });
}
parseDict(DICT_A, false);
parseDict(DICT_B, true);

// نسخة احتياطية مضمّنة في التطبيق: تُستخدم فقط عند أول تشغيل بدون إنترنت

// القاموس: القاموس القديم أولاً ثم قاموس الملفات (الأول يفوز)
Object.entries(DICT).forEach(([k, v]) => {
  if (!(k in D) && typeof v === 'string') D[k] = v;
});

export const BUNDLED = {
  lessons: LESSONS,
  dict: { ...D },
};

// الصفوف والكتب (نسخة احتياطية تُستخدم عند أول تشغيل بدون إنترنت)
export const BUNDLED_CATALOG = {
  grades: [
    { id: 'g7', title: 'الصف السابع', available: false, order: 7 },
    { id: 'g8', title: 'الصف الثامن', available: false, order: 8 },
    { id: 'g9', title: 'الصف التاسع', available: true, order: 9 },
  ],
  books: [
    { id: 'g9-sb', grade: 'g9', code: 'sb', title: 'Student’s Book', titleAr: 'كتاب الطالب', subtitle: 'كتاب الطالب · 12 وحدة ودرسا مراجعة', listTitle: 'الوحدات ودروس المراجعة', order: 1 },
    { id: 'g9-wb', grade: 'g9', code: 'wb', title: 'Workbook', titleAr: 'كتاب النشاط', subtitle: 'كتاب النشاط · 12 وحدة واختبارا تقدّم', listTitle: 'الوحدات واختبارا التقدّم', order: 2 },
  ],
};
