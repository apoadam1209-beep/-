export interface Plan {
  id: string
  name: string
  tagline: string
  monthly: number
  yearly: number
  popular?: boolean
  features: string[]
  cta: string
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'مجاني',
    tagline: 'للتجربة والبدايات',
    monthly: 0,
    yearly: 0,
    cta: 'ابدأ مجاناً',
    features: [
      'تحميل 3 منتجات مدفوعة شهرياً',
      'وصول كامل لكل المنتجات المجانية',
      'تصفح الأقسام الـ 15 بلا حدود',
      'جودة تحميل قياسية',
      'ترخيص استخدام شخصي',
    ],
  },
  {
    id: 'pro',
    name: 'برو',
    tagline: 'لصانع المحتوى المستقل',
    monthly: 49,
    yearly: 490,
    popular: true,
    cta: 'اشترك الآن',
    features: [
      'تحميل غير محدود لكل المنتجات',
      'كل الأقسام الـ 15 + المنتجات الجديدة',
      'رخصة تجارية كاملة للمشاريع',
      'تحميل بأعلى جودة متاحة',
      'أرشيف التحميلات في لوحة التحكم',
      'دعم فني خلال 24 ساعة',
    ],
  },
  {
    id: 'studio',
    name: 'ستوديو',
    tagline: 'للفرق والوكالات الصغيرة',
    monthly: 99,
    yearly: 990,
    cta: 'اشترك الآن',
    features: [
      'كل مزايا خطة برو',
      'حتى 5 أعضاء في الفريق',
      'رخصة تجارية للعملاء (Client License)',
      'مكتبة مفضلة مشتركة للفريق',
      'أولوية في إضافة المنتجات المطلوبة',
      'دعم فني عبر واتساب مباشر',
    ],
  },
  {
    id: 'agency',
    name: 'أجنسري',
    tagline: 'للوكالات والشركات الكبيرة',
    monthly: 199,
    yearly: 1990,
    cta: 'تواصل معنا',
    features: [
      'كل مزايا خطة ستوديو',
      'أعضاء فريق غير محدودين',
      'رخصة مؤسسية شاملة',
      'منتجات حصرية للوكالات',
      'مدير حساب مخصص',
      'تدريب فريقك على استخدام المنصة',
    ],
  },
]

export const getPlan = (id: string) => plans.find((pl) => pl.id === id)
