import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import ToastContainer from './components/ToastContainer'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Categories from './pages/Categories'
import CategoryPage from './pages/CategoryPage'
import ProductPage from './pages/ProductPage'
import Pricing from './pages/Pricing'
import Checkout from './pages/Checkout'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 pt-[72px]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:id" element={<CategoryPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout/:planId" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal />
      <ToastContainer />
    </div>
  )
}
