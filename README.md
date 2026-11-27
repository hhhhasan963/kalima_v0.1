# كلمة · Kalima (React + Supabase) — V1.01

تطبيق «كلمة» لتعلّم الإنكليزية: React + Vite، والدروس والحسابات على Supabase.

## التشغيل
```bash
npm install
npm run dev      # للتطوير
npm run build    # ملفات الإنتاج في dist/
```
ملف `.env` فيه رابط مشروع Supabase والمفتاح العام (publishable). المفتاح العام مصمَّم ليكون ظاهراً في المتصفح،
والحماية الفعلية عبر سياسات RLS في قاعدة البيانات. بدون `.env` يرفض `npm run build` البناء، ولو شُغّلت نسخة بلا إعداد تظهر رسالة خطأ ولا تُفتح الدروس.

## كيف تعمل الأمور
- **التحميل:** كل درس له رقم تعديل. يسأل التطبيق عن «قائمة خفيفة» ويحمّل الدروس **المتغيّرة فقط** (تعديل درس واحد = تحميل درس واحد). المحتوى يُحفظ بالجهاز ويعمل بدون إنترنت.
- **أنواع القفل لكل درس** (`lessons.access`): `open` مفتوح للجميع · `members` مقفل للزوار (الافتراضي) · `closed` مقفل للجميع، ويظهر «سيتم توفير الدرس قريباً». يغيّرها المعلم من «إدارة الدروس».
- **الدروس** في جداول `lessons / sentences / questions / dictionary`. تعدّلها من لوحة Supabase (Table Editor)
  وتظهر عند الطلاب تلقائياً: رقم نسخة المحتوى (`content_meta.version`) يزيد مع أي تعديل،
  والتطبيق يسأل عنه فقط ولا يحمّل الدروس إلا إذا تغيّر.
- **درس جديد:** ملف باسم `G9-SB-U13.json`. يرفعه المعلم من التطبيق (الملف الشخصي ← إدارة الدروس)، أو المشرف بـ `npm run import:lessons`. التفاصيل في `content/README.md`.
- **المعلمون:** جدول `teachers`. الصلاحية تُمنح بـ `select public.make_teacher('email')` والرفع يمر بدالة `teacher_import_lesson` التي تتحقق من الصلاحية في قاعدة البيانات.
  نوع القفل (`access`) يحدده المعلم لكل درس.
- **الصفوف والكتب:** جداول `grades` و`books`. الصف التاسع مفتوح بكتابين (كتاب الطالب وكتاب النشاط)، والسابع والثامن مقفلان (`available = false`).
  عند أول دخول يختار الطالب صفه، وتظهر له كتب صفه فقط، مع زر «تغيير الصف».
- **الزائر:** يرى عناوين كل الدروس لكن نص الدرس وأسئلته للدروس `open` فقط، والقفل مطبَّق في قاعدة البيانات (RLS) لا في المتصفح.
- **تقدّم الطالب** في جدول `progress` (صف واحد لكل طالب، لا يراه غيره). يُحفظ محلياً ويُرفع دفعة واحدة كل ثوانٍ قليلة.
  تقدّم ما قبل الحساب (أو الزائر) على الجهاز ينتقل إلى أول حساب يُنشأ.
- **بدون إنترنت:** يعمل من الجلسة والدروس المحفوظة، ويرفع التقدم عند عودة الاتصال.

## بنية الكود
- `src/lib/` عميل Supabase، تحميل الكتالوج والدروس والتحقق منها، دمج التقدّم
- `content/` دروس المشروع بصيغة JSON، و`tools/import-lessons.mjs` أداة الفحص والرفع، و`src/lib/lessonFile.js` مدقّق الملفات (مشترك بين الأداة وصفحة المعلم)
- `src/hooks/` الحساب (useAuth) · الدروس (useLessons) · الحالة والمزامنة (useStore) · النطق · التوجيه · السحب بين التبويبات
- `src/components/` الواجهات (AuthScreen, Home, BookView, Hero, LockPrompt, ...)
- `src/data/bundled.js` نسخة احتياطية: الدرس الأول من كل كتاب فقط (تُستخدم عند أول تشغيل بدون إنترنت)، وبقية الدروس تأتي من Supabase

## ملاحظات Supabase
- التأكيد بالبريد مفعّل افتراضياً. للتجربة أوقفه من Authentication ← Sign In / Providers ← Email ← Confirm email.
  للاستخدام الفعلي أضف مزوّد SMTP (الإرسال المدمج محدود).
- الخطة المجانية توقف المشروع بعد أسبوع بلا نشاط.

## إعدادات Supabase المطلوبة (من لوحة التحكم)
- **Authentication ← URL Configuration:** ضع **عنوان التطبيق بعد نشره** (مثل https://kalima.example.com) في **Site URL**، وأضف العناوين الأخرى المسموحة (مثل http://localhost:5173 للتجربة) في **Redirect URLs**. إليه يعيد Supabase المستخدم بعد ضغط رابط «نسيت كلمة المرور» أو تأكيد البريد.
- **Authentication ← Sign In / Providers ← Email:** «Confirm email» مفعّل افتراضياً (أبقِه في الإنتاج).
- **البريد (SMTP):** الإرسال المدمج **رسالتان في الساعة للمشروع كله** (توثيق Supabase الرسمي) ومخصص للتجربة. للاستخدام الفعلي اربط مزوّد بريد (Authentication ← Emails ← SMTP Settings) فيصير الحد الافتراضي 30 مستخدماً جديداً في الساعة ويمكن رفعه من Authentication ← Rate Limits. عطّل «link tracking» عند المزوّد حتى لا يفسد الروابط.

## إصدار جديد
`npm run bump` يزيد الرقم (V1.00 ← V1.01)، ثم أضف سطراً في `CHANGELOG.md`.


## بناء تطبيق الجوال (Capacitor)

المتطلبات: Node 22+، وAndroid Studio (للأندرويد). للآيفون: جهاز Mac وXcode.

```bash
npm install
npm run android          # يبني الويب ثم يزامنه ويفتح Android Studio
# ثم من Android Studio: Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)
```

- بعد أي تعديل على الكود أو الدروس: `npm run cap:sync`.
- تغيير معرّف الحزمة `com.kalima.app` واسم التطبيق: في `capacitor.config.json` **قبل** النشر على المتجر (لا يمكن تغيير المعرّف بعد النشر).
- الآيفون: `npm i -D @capacitor/ios` ثم `npx cap add ios` على جهاز Mac.
- أيقونة التطبيق وشاشة البداية: ضع `icon.png` (1024×1024) و`splash.png` في مجلد `assets/` ثم `npx @capacitor/assets generate`.

## بناء APK عبر GitHub Actions

الملفات في `.github/workflows/`:

| الملف | متى يعمل | الناتج |
|---|---|---|
| `android-debug.yml` | عند كل push إلى `main` أو يدوياً | `app-debug.apk` للتجربة على أي جوال |
| `android-release.yml` | يدوياً فقط | `kalima-release.apk` موقّع |

**الإعداد (مرة واحدة):** في المستودع: Settings ▸ Secrets and variables ▸ Actions ▸ New repository secret:
- `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY`: قيمتاهما من ملف `.env` عندك (لأن `.env` غير مرفوع إلى git). بدونهما يُبنى التطبيق بلا سيرفر.
- للنسخة الموقّعة فقط: `KEYSTORE_BASE64` و`KEYSTORE_PASSWORD` و`KEY_ALIAS` و`KEY_PASSWORD`.

**إنشاء مفتاح التوقيع (مرة واحدة، واحفظه في مكان آمن؛ فقدانه يمنعك من تحديث التطبيق):**
```bash
keytool -genkeypair -v -keystore release.jks -alias kalima -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.jks     # الناتج يوضع في سر KEYSTORE_BASE64
```

**التنزيل:** تبويب Actions ▸ اختر التشغيل ▸ Artifacts في آخر الصفحة.
ملاحظة: Google Play يطلب ملف AAB وليس APK؛ عند النشر على المتجر نضيف workflow لـ `bundleRelease`.

## الشعار وشريط الحالة

- الشعار: `public/logo.svg` (نسخة منه في `src/assets/`). أيقونات أندرويد وشاشات البداية مولَّدة منه في `android/app/src/main/res/`. إذا غيّرت الشعار أعد توليدها (الأيقونة التكيّفية: خلفية متدرجة `drawable/ic_launcher_bg_gradient.xml` + رمز بحجم 84% داخل منطقة الأمان).
- شريط الحالة على أندرويد: لونه من `:root::before` في `src/extras.css` (المتغير `--sbc`). لتغيير لونه غيّر `--sbc` ولون `statusBarColor` في `android/app/src/main/res/values/styles.xml` للأجهزة الأقدم.

## تحديث التطبيق على الجوال

- كل نسخة debug تُوقَّع بنفس المفتاح (`android/app/kalima-debug.keystore`) فتتحدث فوق النسخة المثبّتة بلا حذف. لا تغيّر هذا الملف ولا تحذفه، وإلا عاد خطأ «التطبيق غير مثبّت».
- ارفع رقم الإصدار في `src/version.js` مع كل نسخة (`npm run bump`)؛ `versionCode` يُحسب منه تلقائياً (الرئيسي×1000 + الفرعي).
- للنسخة الموقّعة النهائية (release) استخدم workflow `android-release.yml` بمفتاحك الخاص، ولا تخلط التوقيعين على نفس الجهاز.
