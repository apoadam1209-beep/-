export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('en-GB').format(n)

export const formatPrice = (n: number): string => `${n} ر.س`

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

// مفتاح الشهر الحالي لحساب التحميلات المجانية الشهرية
export const currentMonthKey = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
