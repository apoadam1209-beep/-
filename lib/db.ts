import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'maleky.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    desc_ar TEXT NOT NULL DEFAULT '',
    desc_en TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'other',
    filename TEXT NOT NULL,
    mime TEXT NOT NULL DEFAULT 'text/plain',
    content TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    price REAL NOT NULL,
    started_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    cancelled_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ---------- Query helpers ----------

export function q<T = any>(sql: string, ...args: unknown[]): T | undefined {
  return db.prepare(sql).get(...(args as [])) as T | undefined;
}

export function qa<T = any>(sql: string, ...args: unknown[]): T[] {
  return db.prepare(sql).all(...(args as [])) as T[];
}

export function run(sql: string, ...args: unknown[]) {
  return db.prepare(sql).run(...(args as []));
}

// ---------- Seed data ----------

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));
const inDays = (n: number) => iso(new Date(Date.now() + n * 86400000));

const SOCIAL_TEMPLATES = `حزمة قوالب سوشيال ميديا — ملكي
=================================

محتوى الحزمة:
- 40 قالب بوستات إنستجرام (عرض 1080x1080)
- 30 قالب ستوري (1080x1920)
- 25 قالب ريلز/تيك توك (1080x1920)
- 15 غلاف فيسبوك (820x312)
- 10 بانرات يوتيوب (2560x1440)

التصنيفات: بيع، عرض، اقتباس، سؤال تفاعل، خلف، إعلان، عيد ومواعيد.

طريقة الاستخدام:
1) افتح الملف في Canva أو Figma أو Illustrator.
2) غيّر النصوص والألوان من لوحة الألوان الموحّدة.
3) صدّر بصيغة PNG بجودة عالية.

ملاحظات:
- جميع القوالب قابلة للتعديل بالكامل.
- الترخيص يسمح بالاستخدام التجاري.
- لا يُسمح بإعادة بيع القوالب نفسها.

© ملكي — منصة المنتجات الرقمية`;

const EDITING_COURSE = `# كورس المونتاج للمبتدئين

## الفصل 1: مقدمة في المونتاج
- 1.1 ما هو المونتاج ولماذا تحتاجه
- 1.2 أشهر برامج المونتاج: CapCut, DaVinci Resolve, Premiere Pro
- 1.3 إعداد مساحة العمل والملفات

## الفصل 2: الأساسيات
- 2.1 الخط الزمني (Timeline) وبنية المحرر
- 2.2 القص (Cut) والانتقالات (Transitions)
- 2.3 التكبير والتصغير (Scale & Crop)

## الفصل 3: الصوت
- 3.1 تزامن الصوت والصورة
- 3.2 إضافة مؤثرات صوتية وموسيقى
- 3.3 تنظيف الصوت وتقليل الضوضاء

## الفصل 4: النص والرسوم
- 4.1 إضافة العناوين والشرح النصي
- 4.2 الحركة (Keyframes)
- 4.3 الأيقونات والصور داخل الفيديو

## الفصل 5: الألوان والتصدير
- 5.1 تصحيح الألوان الأساسية (Color Grading)
- 5.2 إعدادات التصدير لكل منصة
- 5.3 حجم الفيديو المثالي لإنستجرام ويوتيوب وتيك توك

## الفصل 6: مشروع عملي
- مونتاج فيديو كامل من البداية للنهاية

المدة الإجمالية: 6 ساعات | مستوى: مبتدئ`;

const MARKETING_EBOOK = `أساسيات التسويق الرقمي
إي-بوك — ملكي
=========================

الفصل 1: مقدمة في التسويق الرقمي
- الفرق بين التسويق التقليدي والرقمي
- أهداف التسويق الرقمي وكيف تقاس

الفصل 2: بناء الحضور الرقمي
- اختيار المنصات المناسبة لنشاطك
- هوية بصرية بسيطة ومتسقة
- خطة محتوى شهرية خطوة بخطوة

الفصل 3: المحتوى الذي يجذب
- أنواع المحتوى: تعليمي، ترفيهي، إلهامي
- كيف تكتب عنوان لا يُتجاهل
- القصص (Storytelling) في تسع دقائق

الفصل 4: الإعلان الممول
- أساسيات إعلانات فيسبوك وإنستجرام
- الجمهور المستهدف وتقسيمه
- ميزانية إعلان ذكية للمشاريع الصغيرة

الفصل 5: التحليل والتطوير
- أهم 7 مقاييس يجب متابعتها أسبوعياً
- تحليل النتائج: ماذا يعني كل رقم؟
- تحسين مستمر: دورة اختبار وتحسين

الفصل 6: أدوات مجانية
- جدول الأدوات المفضلة: تصميم، تحليل، جدولة، بريد
- كيف توفر المال وتبدأ اليوم`;

const SOUND_EFFECTS = JSON.stringify(
  {
    pack: 'Sound Effects Pack — Maleky',
    license: 'Commercial use allowed',
    effects: [
      { name: 'click-soft', duration: '0.2s', format: 'wav' },
      { name: 'notification-pop', duration: '0.5s', format: 'wav' },
      { name: 'whoosh-fast', duration: '0.4s', format: 'wav' },
      { name: 'success-chime', duration: '1.2s', format: 'wav' },
      { name: 'error-buzz', duration: '0.6s', format: 'wav' },
      { name: 'typing-keys', duration: '2.0s', format: 'wav' },
      { name: 'page-flip', duration: '0.8s', format: 'wav' },
      { name: 'cash-register', duration: '1.5s', format: 'wav' },
      { name: 'applause-light', duration: '3.0s', format: 'wav' },
      { name: 'magic-sparkle', duration: '1.0s', format: 'wav' },
    ],
  },
  null,
  2
);

const CV_TEMPLATES = `قوالب سيرة ذاتية احترافية — ملكي
==================================

يحتوي الملف على 6 قوالب CV جاهزة للتعديل:

1) القالب الكلاسيكي — عمودي، خط واضح، مناسب للمجالات الرسمية.
2) القالب العصري — عمودان مع شريط جانبي للخدمات والمهارات.
3) القالب الإبداعي — ألوان زاهية مناسب للتصميم والتسويق.
4) القالب التقني — تخطيط نظيف يبرز الخبرة التقنية والشهادات.
5) القالب التنفيذي — تصميم راقٍ للإدارة والوظائف القيادية.
6) القالب المصغر — صفحة واحدة مكثفة للمبتدئين في سوق العمل.

تعليمات:
- الصيغ: Word + PDF لكل قالب.
- غيّر الألوان من لوحة الألوان الموحّدة.
- نصيحة: اجعل CV الخاص بك صفحة واحدة أو صفحتين كحد أقصى.

الترخيص: استخدام شخصي وتجاري غير محدود (بدون إعادة بيع القالب نفسه).`;

const PRESENTATION_TEMPLATES = `قوالب عرض تقديمي احترافية — ملكي
===================================

يحتوي الملف على 30 شريحة PPTX قابلة للتعديل:

- شريحة عنوان (3 أنماط)
- شريحة خطة العرض
- شرائح نص ونقاط
- شرائح صور كاملة
- شرائح إحصائيات بأرقام كبيرة
- شرائح مقارنة (قبل/بعد)
- شرائح خرائط ورسوم توضيحية
- شرائح أسئلة وأجوبة
- شريحة ختامية "شكراً + بيانات التواصل"

الألوان: 4 لوحات جاهزة (كحلي، بنفسجي، أخضر زمردي، ترابي).
الخطوط: Cairo + Inter مضمّنة في الملف.

ملاحظة: جميع الشرائح مقاس 16:9 وتعديلها يستغرق دقائق في PowerPoint أو Canva.`;

const ICONS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef2ff"/>
      <stop offset="1" stop-color="#f5f3ff"/>
    </linearGradient>
  </defs>
  <rect width="320" height="220" rx="16" fill="url(#bg)"/>
  <g fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="55" r="22"/>
    <path d="M42 55l6 6 12-12"/>
    <rect x="118" y="33" width="44" height="44" rx="10"/>
    <path d="M130 55h20M140 45v20"/>
    <path d="M226 33l22 44h-44z"/>
    <rect x="262" y="33" width="10" height="44" rx="4"/>
    <rect x="278" y="25" width="10" height="52" rx="4"/>
    <rect x="294" y="41" width="10" height="36" rx="4"/>
    <path d="M40 130c0-11 9-20 20-20s20 9 20 20l8 34H32z"/>
    <path d="M130 164l20-30 14 18 10-12 16 24z"/>
    <circle cx="140" cy="126" r="5"/>
    <path d="M230 120a18 18 0 1 1 0 36M230 148h-14M230 142v-26"/>
  </g>
  <text x="160" y="200" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#6366f1">Maleky SVG Icons Pack</text>
</svg>`;

const PRODUCTS_SEED = [
  {
    name_ar: 'حزمة قوالب سوشيال ميديا',
    name_en: 'Social Media Templates Pack',
    desc_ar: 'أكثر من 120 قالباً جاهزاً لإنستجرام وفيسبوك وتيك توك — تصميمات عصرية سهلة التعديل تناسب كل أنواع المحتوى.',
    desc_en: 'Over 120 ready-made templates for Instagram, Facebook and TikTok — modern, easy-to-edit designs for every type of content.',
    category: 'templates',
    filename: 'social-templates-pack.txt',
    mime: 'text/plain; charset=utf-8',
    content: SOCIAL_TEMPLATES,
    featured: 1,
  },
  {
    name_ar: 'كورس المونتاج للمبتدئين',
    name_en: 'Video Editing Course for Beginners',
    desc_ar: '6 ساعات تعلم عملي من الصفر: القص، الصوت، النصوص، الألوان، ثم مشروع عملي كامل في النهاية.',
    desc_en: '6 hours of hands-on learning from scratch: cutting, audio, text, color, and a full real-world project at the end.',
    category: 'courses',
    filename: 'editing-course.md',
    mime: 'text/markdown; charset=utf-8',
    content: EDITING_COURSE,
    featured: 1,
  },
  {
    name_ar: 'إي-بوك: أساسيات التسويق الرقمي',
    name_en: 'eBook: Digital Marketing Essentials',
    desc_ar: 'دليل عملي من 6 فصول يشرح لك كيف تبني حضورك الرقمي وتجذب عملاءك بأبسط الأدوات.',
    desc_en: 'A practical 6-chapter guide on how to build your digital presence and attract customers with the simplest tools.',
    category: 'ebooks',
    filename: 'digital-marketing-ebook.txt',
    mime: 'text/plain; charset=utf-8',
    content: MARKETING_EBOOK,
    featured: 0,
  },
  {
    name_ar: 'حزمة المؤثرات الصوتية',
    name_en: 'Sound Effects Pack',
    desc_ar: '10 مؤثرات صوتية عالية الجودة جاهزة للمونتاج والمشاريع — مع ترخيص استخدام تجاري.',
    desc_en: '10 high-quality sound effects ready for editing and projects — with commercial use license.',
    category: 'audio',
    filename: 'sound-effects-pack.json',
    mime: 'application/json; charset=utf-8',
    content: SOUND_EFFECTS,
    featured: 1,
  },
  {
    name_ar: 'قوالب سيرة ذاتية احترافية',
    name_en: 'Professional CV Templates',
    desc_ar: '6 قوالب CV أنيقة بكل المجالات (كلاسيكي، إبداعي، تقني، تنفيذي) بصيغ Word وPDF.',
    desc_en: '6 elegant CV templates for every field (classic, creative, tech, executive) in Word and PDF.',
    category: 'templates',
    filename: 'cv-templates.txt',
    mime: 'text/plain; charset=utf-8',
    content: CV_TEMPLATES,
    featured: 0,
  },
  {
    name_ar: 'حزمة أيقونات SVG',
    name_en: 'SVG Icons Pack',
    desc_ar: 'مجموعة أيقونات SVG حادة على أي دقة، قابلة للتلوين والتعديل مباشرة من الكود.',
    desc_en: 'A set of crisp SVG icons at any resolution, easily recolorable and editable from code.',
    category: 'files',
    filename: 'icons-pack.svg',
    mime: 'image/svg+xml',
    content: ICONS_SVG,
    featured: 0,
  },
  {
    name_ar: 'قوالب PowerPoint احترافية',
    name_en: 'Professional Presentation Templates',
    desc_ar: '30 شريحة PPTX جاهزة بخطوط عربية وإنجليزية و4 لوحات ألوان — لبروز العروض التقديمية.',
    desc_en: '30 ready PPTX slides with Arabic & English fonts and 4 color palettes — make your presentations stand out.',
    category: 'files',
    filename: 'presentation-templates.txt',
    mime: 'text/plain; charset=utf-8',
    content: PRESENTATION_TEMPLATES,
    featured: 0,
  },
];

function seed() {
  run("INSERT OR IGNORE INTO settings (key, value) VALUES ('monthly_price', '150')");
  run("INSERT OR IGNORE INTO settings (key, value) VALUES ('yearly_price', '1200')");

  const count = (q<{ c: number }>('SELECT COUNT(*) AS c FROM users'))?.c ?? 0;
  if (count > 0) return;

  const mkUser = (name: string, email: string, pass: string, role: string, joinedDaysAgo: number) => {
    const info = run(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?,?,?,?,?)',
      name,
      email,
      bcrypt.hashSync(pass, 10),
      role,
      daysAgo(joinedDaysAgo)
    );
    return Number(info.lastInsertRowid);
  };

  const mkSub = (
    userId: number,
    plan: 'monthly' | 'yearly',
    price: number,
    startedDaysAgo: number,
    endsInDays: number,
    cancelledDaysAgo?: number
  ) => {
    run(
      'INSERT INTO subscriptions (user_id, plan, price, started_at, ends_at, cancelled_at, created_at) VALUES (?,?,?,?,?,?,?)',
      userId,
      plan,
      price,
      daysAgo(startedDaysAgo),
      inDays(endsInDays),
      cancelledDaysAgo != null ? daysAgo(cancelledDaysAgo) : null,
      daysAgo(startedDaysAgo)
    );
  };

  // Users
  mkUser('المشرف العام', 'admin@demo.com', 'Admin@123', 'admin', 500);
  const demo = mkUser('أحمد سمير', 'demo@user.com', 'Demo@123', 'user', 45);
  const sara = mkUser('سارة محمد', 'sara@example.com', 'User@123', 'user', 12);
  const mohamed = mkUser('محمد علي', 'mohamed@example.com', 'User@123', 'user', 38);
  const noura = mkUser('نورهان حسن', 'noura@example.com', 'User@123', 'user', 70);
  const karim = mkUser('كريم فؤاد', 'karim@example.com', 'User@123', 'user', 200);
  const laila = mkUser('ليلى أحمد', 'laila@example.com', 'User@123', 'user', 5);
  const omar = mkUser('عمر خالد', 'omar@example.com', 'User@123', 'user', 55);

  // Subscriptions
  mkSub(demo, 'yearly', 1200, 45, 320);
  mkSub(sara, 'monthly', 150, 12, 18);
  mkSub(mohamed, 'monthly', 150, 38, -8, 10); // expired & cancelled
  mkSub(noura, 'monthly', 150, 22, 8);
  mkSub(noura, 'monthly', 150, 70, -40); // older, expired
  mkSub(karim, 'yearly', 1200, 200, -125); // older, expired
  mkSub(laila, 'monthly', 150, 5, 25);
  mkSub(omar, 'monthly', 150, 55, -25); // expired

  // Products
  for (const p of PRODUCTS_SEED) {
    run(
      'INSERT INTO products (name_ar, name_en, desc_ar, desc_en, category, filename, mime, content, featured, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      p.name_ar,
      p.name_en,
      p.desc_ar,
      p.desc_en,
      p.category,
      p.filename,
      p.mime,
      p.content,
      p.featured,
      daysAgo(90)
    );
  }
}

seed();
