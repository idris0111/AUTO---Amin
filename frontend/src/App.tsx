import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import './i18n'
import './index.css'
import Footer from './components/layout/Footer'
import Header from './components/layout/Header'
import MobileTabBar from './components/layout/MobileTabBar'
import ScrollToTop from './components/layout/ScrollToTop'
import ComparisonFloatingBar from './components/common/ComparisonFloatingBar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import { useAuth } from './stores/auth'
import { useFavorites } from './stores/favorites'

const Catalog = lazy(() => import('./pages/Catalog'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Comparison = lazy(() => import('./pages/Comparison'))
const Garage = lazy(() => import('./pages/Garage'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const AiMechanic = lazy(() => import('./pages/AiMechanic'))
const Support = lazy(() => import('./pages/Support'))
const Blog = lazy(() => import('./pages/Blog'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
})

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-premium focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-2xl focus:outline-none"
      >
        Перейти к основному содержимому
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-20 md:pb-0 outline-none">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl animate-pulse space-y-4 px-4 py-16">
              <div className="h-8 w-1/3 rounded" style={{ background: 'var(--surface-2)' }} />
              <div className="h-48 rounded-xl" style={{ background: 'var(--surface-2)' }} />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      <ComparisonFloatingBar />
      <Footer />
      <MobileTabBar />
    </div>
  )
}

export default function App() {
  const initialize = useAuth((state) => state.initialize)
  const user = useAuth((state) => state.user)
  const loadFavorites = useFavorites((state) => state.load)
  const clearFavorites = useFavorites((state) => state.clear)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    if (user) void loadFavorites()
    else clearFavorites()
  }, [user, loadFavorites, clearFavorites])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Shell><Home /></Shell>} />
          <Route path="/catalog" element={<Shell><Catalog /></Shell>} />
          <Route path="/ai-mechanic" element={<Shell><AiMechanic /></Shell>} />
          <Route path="/3d-explorer" element={<Navigate to="/catalog" replace />} />
          <Route path="/compare" element={<Shell><Comparison /></Shell>} />
          <Route path="/product/:slug" element={<Shell><ProductDetail /></Shell>} />
          <Route path="/cart" element={<Shell><Cart /></Shell>} />
          <Route path="/checkout" element={<Shell><Checkout /></Shell>} />
          <Route path="/favorites" element={<Shell><Favorites /></Shell>} />
          <Route path="/login" element={<Shell><Login /></Shell>} />
          <Route path="/register" element={<Shell><Register /></Shell>} />
          <Route path="/garage" element={<Shell><Garage /></Shell>} />
          <Route path="/orders" element={<Shell><Orders /></Shell>} />
          <Route path="/orders/:id" element={<Shell><OrderDetail /></Shell>} />
          <Route path="/profile" element={<Shell><Profile /></Shell>} />
          <Route path="/support" element={<Shell><Support /></Shell>} />
          <Route path="/blog" element={<Shell><Blog /></Shell>} />
          <Route path="/blog/:slug" element={<Shell><ArticleDetail /></Shell>} />
          <Route path="/admin" element={<Shell><Admin /></Shell>} />
          <Route path="*" element={<Shell><NotFound /></Shell>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
