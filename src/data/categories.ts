import {
  PenTool,
  Type,
  Camera,
  Clapperboard,
  Music,
  Shapes,
  Grid3x3,
  Palette,
  Presentation,
  LayoutTemplate,
  BookOpen,
  GraduationCap,
  Layers,
  BadgeCheck,
  Printer,
  type LucideIcon,
} from 'lucide-react'

export interface Category {
  id: string
  name: string
  desc: string
  icon: LucideIcon
  gradient: string
}

export const categories: Category[] = [
  {
    id: 'design-templates',
    name: 'قوالب التصميم',
    desc: 'قوالب احترافية جاهزة للتعديل للسوشيال ميديا والإعلانات والهويات.',
    icon: PenTool,
    gradient: 'from-violet-500 to-purple-700',
  },
  {
    id: 'fonts',
    name: 'الخطوط',
    desc: 'مكتبة خطوط عربية ولاتينية أنيقة بشتى الأنماط والاستخدامات.',
    icon: Type,
    gradient: 'from-fuchsia-500 to-pink-600',
  },
  {
    id: 'photos',
    name: 'الصور الفوتوغرافية',
    desc: 'صور عالية الدقة من مصورين محترفين لجميع الاستخدامات.',
    icon: Camera,
    gradient: 'from-sky-500 to-blue-700',
  },
  {
    id: 'video',
    name: 'مقاطع الفيديو',
    desc: 'لقطات فيديو ولقطات جوية ومقدمات متحركة بجودة 4K.',
    icon: Clapperboard,
    gradient: 'from-red-500 to-rose-700',
  },
  {
    id: 'music',
    name: 'الموسيقى والمؤثرات',
    desc: 'مقاطع موسيقية خلفية ولوبات صوتية بدون حقوق نشر.',
    icon: Music,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'sfx',
    name: 'المؤثرات الصوتية',
    desc: 'مكتبة ضخمة من المؤثرات الصوتية للأفلام والألعاب والمونتاج.',
    icon: Shapes,
    gradient: 'from-teal-500 to-emerald-700',
  },
  {
    id: 'icons',
    name: 'الأيقونات',
    desc: 'أيقونات متجهية عصرية بأساليب متنوعة وبأحجام قابلة للتكبير.',
    icon: Grid3x3,
    gradient: 'from-indigo-500 to-violet-700',
  },
  {
    id: 'illustrations',
    name: 'الرسوم التوضيحية',
    desc: 'رسومات وفرشيات وأشكال فيكتور مرسومة بأيدي فنانين مميزين.',
    icon: Palette,
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    id: 'presentations',
    name: 'العروض التقديمية',
    desc: 'قوالب بوربوينت و Keynote و Google Slides بتصاميم مبهرة.',
    icon: Presentation,
    gradient: 'from-orange-500 to-red-600',
  },
  {
    id: 'web',
    name: 'قوالب المواقع',
    desc: 'قوالب هبوط ومتاجر ومواقع كاملة جاهزة للنشر والتخصيص.',
    icon: LayoutTemplate,
    gradient: 'from-cyan-500 to-sky-700',
  },
  {
    id: 'ebooks',
    name: 'الكتب الإلكترونية',
    desc: 'كتب رقمية في التصميم والأعمال والتطوير والتنمية الذاتية.',
    icon: BookOpen,
    gradient: 'from-lime-500 to-green-700',
  },
  {
    id: 'courses',
    name: 'الدورات التعليمية',
    desc: 'دورات مصورة في التصميم والمونتاج والبرمجة والتسويق الرقمي.',
    icon: GraduationCap,
    gradient: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'ui-kits',
    name: 'واجهات UI Kits',
    desc: 'واجهات تطبيقات ومواقع كاملة بأنظمة تصميم جاهزة لـ Figma.',
    icon: Layers,
    gradient: 'from-purple-500 to-indigo-700',
  },
  {
    id: 'logos',
    name: 'الشعارات',
    desc: 'شعارات احترافية قوالب وهويات جاهزة للتخصيص الفوري.',
    icon: BadgeCheck,
    gradient: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'printables',
    name: 'المنتجات القابلة للطباعة',
    desc: 'ملفات طباعة: سير ذاتية، أجندات، مخططات ومواد تسويقية.',
    icon: Printer,
    gradient: 'from-rose-500 to-pink-700',
  },
]

export const getCategory = (id: string) => categories.find((c) => c.id === id)
