import CategoryCard from '../components/CategoryCard'
import { categories } from '../data/categories'
import { products } from '../data/products'

export default function Categories() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-4xl font-black text-white">
          تصفح <span className="text-gradient">{categories.length} قسماً</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-white/55">
          مكتبة ضخمة من المنتجات الرقمية الاحترافية — {products.length} منتجاً جاهزاً للتحميل
          الفوري باشتراكك في كرياتيفو.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  )
}
