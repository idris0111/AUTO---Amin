import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  ExternalLink,
  Globe,
  CheckCircle2,
  Coins,
  Edit2,
  Eye,
  FileSpreadsheet,
  FolderTree,
  History,
  Layers,
  LifeBuoy,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Ticket,
  Trash2,
  Truck,
  UserCheck,
  UserX,
  Users,
  Wallet,
  Warehouse,
  WifiOff,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import { ExecutiveCockpit } from '../components/cockpit/ExecutiveCockpit'
import type { ArticleCategory, ArticleDetail as ArticleDetailType, ArticleListResponse, ArticleSummary, Brand, Category, TicketDetail, TicketListResponse, User } from '../types'

const FIELD =
  'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-premium focus:ring-1 focus:ring-premium'

interface AdminStats {
  orders: number
  revenue: string
  average_order_value: string
  pending_orders: number
  currency: string
  orders_by_status: Record<string, number>
  low_stock: { id: string; name: string; sku: string; stock_quantity: number; low_stock_threshold: number }[]
  recent_orders: { id: string; number: string; status: string; total: string; contact_name: string; created_at: string }[]
}

interface AdminOrderRow {
  id: string
  number: string
  status: string
  allowed_transitions?: string[]
  total: string
  currency: string
  customer?: string
  contact_name: string
  contact_phone?: string
  shipping_city: string
  shipping_method?: string
  payment_method?: string
  created_at: string
}

interface CouponRow {
  id: string
  code: string
  type: string
  value: string
  min_order_amount: string
  used_count: number
  is_active: boolean
}

interface ZoneRow {
  id: string
  city: string
  region: string | null
  fee: string
  free_from: string | null
  eta_days_min: number
  eta_days_max: number
  is_active: boolean
}

interface ProductAdminItem {
  id: string
  name: string
  sku: string
  slug: string
  price: string
  old_price: string | null
  stock_quantity: number
  status: 'active' | 'draft' | 'archived'
  brand: { id: string; name: string; slug: string; logo_url: string | null }
  category: { id: string; name: string; slug: string }
  images: { id: string; url: string; is_primary: boolean }[]
  oem_numbers?: { id: string; number: string; manufacturer: string | null }[]
  short_description?: string | null
  description?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  awaiting_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждён',
  processing: 'В обработке',
  packed: 'Упакован',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  completed: 'Завершён',
  cancelled: 'Отменён',
  returned: 'Возврат',
}

const ROLE_LABELS: Record<string, string> = {
  customer: 'Клиент',
  support: 'Поддержка',
  warehouse_manager: 'Склад',
  order_manager: 'Заказы',
  content_manager: 'Контент',
  manager: 'Менеджер',
  admin: 'Администратор',
  super_admin: 'Супер-админ',
}

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  receipt: { label: 'Поступление', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  shipment: { label: 'Отгрузка', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  reservation: { label: 'Резерв', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  release: { label: 'Снятие резерва', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  adjustment: { label: 'Корректировка', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  return: { label: 'Возврат', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  write_off: { label: 'Списание', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
}

type Tab = 'overview' | 'analytics' | 'orders' | 'products' | 'inventory' | 'users' | 'support' | 'content' | 'categories' | 'brands' | 'coupons' | 'zones'

function flattenCategories(items: Category[] = [], prefix = ''): { id: string; name: string }[] {
  let list: { id: string; name: string }[] = []
  for (const cat of items) {
    list.push({ id: cat.id, name: `${prefix}${cat.name}` })
    if (cat.children && cat.children.length > 0) {
      list = list.concat(flattenCategories(cat.children, `${prefix}— `))
    }
  }
  return list
}

export default function Admin() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin'

  // Queries
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/orders/stats'),
    enabled: isAdmin && tab === 'overview',
  })

  const orders = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get<{ items: AdminOrderRow[] }>('/admin/orders?limit=50'),
    enabled: isAdmin && tab === 'orders',
  })

  const products = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get<ProductAdminItem[]>('/admin/products?limit=100'),
    enabled: isAdmin && (tab === 'products' || tab === 'overview'),
  })

  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get<Category[]>('/admin/categories'),
    enabled: isAdmin && (tab === 'products' || tab === 'categories'),
  })

  const brands = useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => api.get<Brand[]>('/admin/brands'),
    enabled: isAdmin && (tab === 'products' || tab === 'brands'),
  })

  const coupons = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get<CouponRow[]>('/admin/coupons'),
    enabled: isAdmin && tab === 'coupons',
  })

  const zones = useQuery({
    queryKey: ['admin-zones'],
    queryFn: () => api.get<ZoneRow[]>('/admin/shipping-zones'),
    enabled: isAdmin && tab === 'zones',
  })

  // Users tab state & queries
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [adjustPointsModalUser, setAdjustPointsModalUser] = useState<User | null>(null)
  const [adjustPointsAmount, setAdjustPointsAmount] = useState<number>(100)
  const [adjustPointsReason, setAdjustPointsReason] = useState<string>('')

  const usersQuery = useQuery({
    queryKey: ['admin-users', userSearch, userRoleFilter],
    queryFn: () =>
      api.get<User[]>('/admin/users', {
        q: userSearch.trim() || undefined,
        role: userRoleFilter || undefined,
        limit: 100,
      }),
    enabled: isAdmin && tab === 'users',
  })

  const updateUserAccess = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { role?: string; is_active?: boolean } }) =>
      api.patch(`/admin/users/${userId}`, data),
    onSuccess: () => void usersQuery.refetch(),
  })

  const adjustLoyaltyMutation = useMutation({
    mutationFn: ({ userId, amount, description }: { userId: string; amount: number; description: string }) =>
      api.post(`/admin/loyalty/${userId}/adjust`, { amount, description }),
    onSuccess: () => {
      setAdjustPointsModalUser(null)
      setAdjustPointsReason('')
      void usersQuery.refetch()
    },
  })

  // Inventory tab queries
  const warehousesQuery = useQuery({
    queryKey: ['admin-warehouses'],
    queryFn: () => api.get<any[]>('/admin/inventory/warehouses'),
    enabled: isAdmin && tab === 'inventory',
  })

  const movementsQuery = useQuery({
    queryKey: ['admin-movements'],
    queryFn: () => api.get<any[]>('/admin/inventory/movements?limit=100'),
    enabled: isAdmin && tab === 'inventory',
  })

  // Support Tickets tab state & queries
  const [supportFilterStatus, setSupportFilterStatus] = useState<string>('')
  const [supportSearch, setSupportSearch] = useState<string>('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [staffReplyText, setStaffReplyText] = useState<string>('')

  const adminTicketsQuery = useQuery({
    queryKey: ['admin-support-tickets', supportFilterStatus, supportSearch],
    queryFn: () =>
      api.get<TicketListResponse>('/admin/support/tickets', {
        status: supportFilterStatus || undefined,
        q: supportSearch.trim() || undefined,
        limit: 50,
      }),
    enabled: isAdmin && tab === 'support',
  })

  const adminTicketDetailQuery = useQuery({
    queryKey: ['admin-support-ticket-detail', selectedTicketId],
    queryFn: () => api.get<TicketDetail>(`/admin/support/tickets/${selectedTicketId}`),
    enabled: Boolean(selectedTicketId),
  })

  const staffReplyMutation = useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: string }) =>
      api.post(`/admin/support/tickets/${ticketId}/messages`, { body }),
    onSuccess: () => {
      setStaffReplyText('')
      void adminTicketDetailQuery.refetch()
      void adminTicketsQuery.refetch()
    },
  })

  const staffUpdateTicketMutation = useMutation({
    mutationFn: ({ ticketId, status, priority }: { ticketId: string; status?: string; priority?: string }) =>
      api.patch(`/admin/support/tickets/${ticketId}`, { status, priority }),
    onSuccess: () => {
      void adminTicketDetailQuery.refetch()
      void adminTicketsQuery.refetch()
    },
  })

  // Order Details Modal state & query
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [targetOrderStatus, setTargetOrderStatus] = useState<string>('')
  const [statusChangeNote, setStatusChangeNote] = useState<string>('')

  const orderDetailQuery = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: () => api.get<any>(`/admin/orders/${selectedOrderId}`),
    enabled: Boolean(selectedOrderId),
  })

  const handleExportProductsCSV = () => {
    if (!products.data || products.data.length === 0) return
    const headers = ['ID', 'Название детали', 'Артикул (SKU)', 'Цена (TJS)', 'Старая цена (TJS)', 'Остаток (шт)', 'Статус', 'Категория', 'Бренд']
    const rows = products.data.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.sku,
      p.price,
      p.old_price || '',
      p.stock_quantity,
      p.status,
      `"${(p.category?.name || '').replace(/"/g, '""')}"`,
      `"${(p.brand?.name || '').replace(/"/g, '""')}"`,
    ])
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autouniverse_catalog_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const flatCategories = useMemo(() => flattenCategories(categories.data ?? []), [categories.data])

  // Product Filter & Search
  const [productSearch, setProductSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')

  const filteredProducts = useMemo(() => {
    if (!products.data) return []
    return products.data.filter((p) => {
      const matchSearch =
        !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.oem_numbers?.some((o) => o.number.toLowerCase().includes(productSearch.toLowerCase()))
      const matchCat = !filterCategory || p.category?.id === filterCategory
      const matchBrand = !filterBrand || p.brand?.id === filterBrand
      return matchSearch && matchCat && matchBrand
    })
  }, [products.data, productSearch, filterCategory, filterBrand])

  // Modals & Forms
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    slug: '',
    brand_id: '',
    category_id: '',
    price: '',
    old_price: '',
    stock_quantity: 10,
    status: 'active' as 'active' | 'draft' | 'archived',
    short_description: '',
    description: '',
    image_url: '',
    oem_number: '',
  })

  const openCreateProduct = () => {
    setEditingProductId(null)
    setProductForm({
      name: '',
      sku: '',
      slug: '',
      brand_id: brands.data?.[0]?.id ?? '',
      category_id: flatCategories[0]?.id ?? '',
      price: '',
      old_price: '',
      stock_quantity: 10,
      status: 'active',
      short_description: '',
      description: '',
      image_url: '',
      oem_number: '',
    })
    setIsProductModalOpen(true)
  }

  const openEditProduct = (p: ProductAdminItem) => {
    setEditingProductId(p.id)
    setProductForm({
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      brand_id: p.brand?.id ?? '',
      category_id: p.category?.id ?? '',
      price: String(p.price),
      old_price: p.old_price ? String(p.old_price) : '',
      stock_quantity: p.stock_quantity,
      status: p.status,
      short_description: p.short_description ?? '',
      description: p.description ?? '',
      image_url: p.images?.[0]?.url ?? '',
      oem_number: p.oem_numbers?.[0]?.number ?? '',
    })
    setIsProductModalOpen(true)
  }

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      const slugVal =
        productForm.slug.trim() ||
        productForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') ||
        `part-${Date.now()}`

      if (editingProductId) {
        // Safe partial update: preserve existing specifications and cross_references!
        const updatePayload: Record<string, unknown> = {
          name: productForm.name,
          slug: slugVal,
          brand_id: productForm.brand_id,
          category_id: productForm.category_id,
          price: Number(productForm.price),
          old_price: productForm.old_price ? Number(productForm.old_price) : null,
          status: productForm.status,
          short_description: productForm.short_description || null,
          description: productForm.description || null,
        }
        if (productForm.image_url.trim()) {
          updatePayload.images = [
            { url: productForm.image_url.trim(), alt: productForm.name, is_primary: true, position: 0 },
          ]
        }
        if (productForm.oem_number.trim()) {
          updatePayload.oem_numbers = [{ number: productForm.oem_number.trim(), manufacturer: null }]
        }
        return api.patch(`/admin/products/${editingProductId}`, updatePayload)
      }

      // New product create
      const createPayload = {
        name: productForm.name,
        sku: productForm.sku,
        slug: slugVal,
        brand_id: productForm.brand_id,
        category_id: productForm.category_id,
        price: Number(productForm.price),
        old_price: productForm.old_price ? Number(productForm.old_price) : null,
        stock_quantity: Number(productForm.stock_quantity),
        status: productForm.status,
        short_description: productForm.short_description || null,
        description: productForm.description || null,
        images: productForm.image_url.trim()
          ? [{ url: productForm.image_url.trim(), alt: productForm.name, is_primary: true, position: 0 }]
          : [],
        oem_numbers: productForm.oem_number.trim()
          ? [{ number: productForm.oem_number.trim(), manufacturer: null }]
          : [],
        specifications: [],
        cross_references: [],
      }
      return api.post('/admin/products', createPayload)
    },
    onSuccess: () => {
      setIsProductModalOpen(false)
      void products.refetch()
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => void products.refetch(),
  })

  // Atomic stock delta adjustment via server
  const atomicStockMutation = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason?: string }) =>
      api.post(`/admin/products/${id}/stock-adjust`, { delta, reason }),
    onSuccess: () => {
      void products.refetch()
      void stats.refetch()
    },
  })

  // Category Form
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', parent_id: '' })
  const createCategoryMutation = useMutation({
    mutationFn: () => {
      const slug =
        categoryForm.slug.trim() ||
        categoryForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      return api.post('/admin/categories', {
        name: categoryForm.name,
        slug,
        description: categoryForm.description || null,
        parent_id: categoryForm.parent_id || null,
      })
    },
    onSuccess: () => {
      setCategoryForm({ name: '', slug: '', description: '', parent_id: '' })
      void categories.refetch()
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => void categories.refetch(),
  })

  // Brand Form
  const [brandForm, setBrandForm] = useState({ name: '', slug: '', country: '', logo_url: '' })
  const createBrandMutation = useMutation({
    mutationFn: () => {
      const slug =
        brandForm.slug.trim() ||
        brandForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      return api.post('/admin/brands', {
        name: brandForm.name,
        slug,
        country: brandForm.country || null,
        logo_url: brandForm.logo_url || null,
      })
    },
    onSuccess: () => {
      setBrandForm({ name: '', slug: '', country: '', logo_url: '' })
      void brands.refetch()
    },
  })

  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/brands/${id}`),
    onSuccess: () => void brands.refetch(),
  })

  // Coupons & Zones
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percent', value: '' })
  const createCoupon = useMutation({
    mutationFn: () => api.post('/admin/coupons', { ...couponForm, value: couponForm.value || '0' }),
    onSuccess: () => {
      setCouponForm({ code: '', type: 'percent', value: '' })
      void coupons.refetch()
    },
  })

  const [zoneForm, setZoneForm] = useState({ city: '', fee: '', free_from: '' })
  const createZone = useMutation({
    mutationFn: () =>
      api.post('/admin/shipping-zones', {
        city: zoneForm.city,
        fee: zoneForm.fee || '0',
        free_from: zoneForm.free_from || null,
      }),
    onSuccess: () => {
      setZoneForm({ city: '', fee: '', free_from: '' })
      void zones.refetch()
    },
  })

  const advanceStatus = useMutation({
    mutationFn: ({ orderId, status, note }: { orderId: string; status: string; note?: string }) =>
      api.patch(`/admin/orders/${orderId}/status`, { status, note: note || undefined }),
    onSuccess: () => {
      void orders.refetch()
      void stats.refetch()
      if (selectedOrderId) {
        void orderDetailQuery.refetch()
        setStatusChangeNote('')
      }
    },
  })


  // Content / Articles state
  const [contentSearch, setContentSearch] = useState('')
  const [contentCategory, setContentCategory] = useState('')
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false)
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [articleForm, setArticleForm] = useState({
    title: '',
    slug: '',
    category: 'guide' as ArticleCategory,
    cover_image: '',
    excerpt: '',
    content: '',
    tags: '',
    is_published: true,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
  })

  const adminArticlesQuery = useQuery({
    queryKey: ['admin-articles', contentCategory, contentSearch],
    queryFn: () =>
      api.get<ArticleListResponse>('/admin/content/articles', {
        category: contentCategory || undefined,
        search: contentSearch || undefined,
        per_page: 50,
      }),
    enabled: isAdmin && tab === 'content',
  })

  const saveArticleMutation = useMutation({
    mutationFn: async () => {
      const tagsArray = articleForm.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      const payload = {
        title: articleForm.title.trim(),
        slug: articleForm.slug.trim() || undefined,
        category: articleForm.category,
        cover_image: articleForm.cover_image.trim() || null,
        excerpt: articleForm.excerpt.trim(),
        content: articleForm.content.trim(),
        tags: tagsArray,
        is_published: articleForm.is_published,
        seo_title: articleForm.seo_title.trim() || null,
        seo_description: articleForm.seo_description.trim() || null,
        seo_keywords: articleForm.seo_keywords.trim() || null,
      }

      if (editingArticleId) {
        return api.put(`/admin/content/articles/${editingArticleId}`, payload)
      } else {
        return api.post('/admin/content/articles', payload)
      }
    },
    onSuccess: () => {
      setIsArticleModalOpen(false)
      setEditingArticleId(null)
      void adminArticlesQuery.refetch()
    },
  })

  const toggleArticlePublishMutation = useMutation({
    mutationFn: (articleId: string) =>
      api.patch(`/admin/content/articles/${articleId}/toggle-publish`),
    onSuccess: () => void adminArticlesQuery.refetch(),
  })

  const deleteArticleMutation = useMutation({
    mutationFn: (articleId: string) =>
      api.delete(`/admin/content/articles/${articleId}`),
    onSuccess: () => void adminArticlesQuery.refetch(),
  })

  const openCreateArticle = () => {
    setEditingArticleId(null)
    setArticleForm({
      title: '',
      slug: '',
      category: 'guide',
      cover_image: '',
      excerpt: '',
      content: '',
      tags: '',
      is_published: true,
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
    })
    setIsArticleModalOpen(true)
  }

  const openEditArticle = async (item: ArticleSummary) => {
    setEditingArticleId(item.id)
    try {
      const res = await api.get<ArticleDetailType>(`/content/articles/${item.slug}`)
      const d = res
      setArticleForm({
        title: d.title,
        slug: d.slug,
        category: d.category,
        cover_image: d.cover_image || '',
        excerpt: d.excerpt,
        content: d.content,
        tags: (d.tags || []).join(', '),
        is_published: d.is_published,
        seo_title: d.seo_title || '',
        seo_description: d.seo_description || '',
        seo_keywords: d.seo_keywords || '',
      })
      setIsArticleModalOpen(true)
    } catch {
      alert('Не удалось загрузить полную информацию о статье')
    }
  }


  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black">Админ-панель</h1>
        <p className="mt-3 text-muted">{t('authRequired')} доступа к админке.</p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-lg bg-premium px-6 py-3 font-semibold text-ink transition hover:opacity-90"
        >
          {t('login')}
        </Link>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black">Недостаточно прав</h1>
        <p className="mt-3 text-muted">Раздел доступен только администраторам и менеджерам AUTO UNIVERSE.</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Обзор', icon: <Wallet className="size-4" /> },
    { id: 'analytics', label: 'Аналитика & BI', icon: <BarChart3 className="size-4" /> },
    { id: 'orders', label: 'Заказы', icon: <Truck className="size-4" /> },
    { id: 'products', label: 'Товары', icon: <Package className="size-4" /> },
    { id: 'inventory', label: 'Склад & Аудит', icon: <Warehouse className="size-4" /> },
    { id: 'users', label: 'Клиенты & Доступ', icon: <Users className="size-4" /> },
    { id: 'support', label: 'Поддержка & Тикеты', icon: <LifeBuoy className="size-4" /> },
    { id: 'content', label: 'Контент & SEO', icon: <BookOpen className="size-4" /> },
    { id: 'categories', label: 'Категории', icon: <FolderTree className="size-4" /> },
    { id: 'brands', label: 'Бренды', icon: <Layers className="size-4" /> },
    { id: 'coupons', label: 'Промокоды', icon: <Ticket className="size-4" /> },
    { id: 'zones', label: 'Доставка', icon: <Tag className="size-4" /> },
  ]

  return (
    <div className="min-h-screen px-4 py-8 md:px-8" style={{ background: 'var(--surface)' }}>
      {/* Offline Alert */}
      {!isOnline && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-500">
          <div className="flex items-center gap-2">
            <WifiOff className="size-5" />
            <span className="text-sm font-medium">Отсутствует подключение к сети. Данные могут быть не актуальны.</span>
          </div>
          <button onClick={() => window.location.reload()} className="text-xs font-semibold underline">
            Повторить
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-premium" />
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">Management Console</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">AUTO UNIVERSE ADMIN</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="rounded-full border px-3.5 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {user.role.toUpperCase()}
          </span>
          <span className="text-xs text-muted">{user.email}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                active ? 'border-premium text-premium shadow-sm' : 'hover:border-premium/50'
              }`}
              style={{
                borderColor: active ? '#e32636' : 'var(--border)',
                background: active ? 'rgba(227, 38, 54, 0.1)' : 'var(--surface-2)',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* TAB: ANALYTICS & BI — EXECUTIVE HIGH-DENSITY TELEMETRY COCKPIT */}
      {tab === 'analytics' && (
        <div className="mt-8 space-y-6 animate-fade-in">
          {/* Quick Jump Pill to Full Screen Cockpit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-2.5 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-on-surface font-semibold">Stitch Executive Commerce Intelligence:</span>
              <span className="text-outline">Полнофункциональный режим мониторинга</span>
            </div>
            <Link
              to="/cockpit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold hover:brightness-110 transition shadow-lg shadow-sky-500/20"
            >
              <span>Открыть Fullscreen Cockpit</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          <ExecutiveCockpit embedded={true} />
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="mt-8 space-y-6">
          {stats.isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          )}

          {stats.isError && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-500">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5" />
                <span>Не удалось загрузить показатели.</span>
              </div>
              <button
                onClick={() => void stats.refetch()}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/20"
              >
                <RefreshCw className="size-3.5" /> Повторить
              </button>
            </div>
          )}

          {stats.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={<Wallet className="size-5 text-premium" />}
                  label="Общая выручка"
                  value={`${Number(stats.data.revenue).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ${stats.data.currency}`}
                />
                <StatCard
                  icon={<Package className="size-5 text-premium" />}
                  label="Всего заказов"
                  value={String(stats.data.orders)}
                />
                <StatCard
                  icon={<AlertTriangle className="size-5 text-amber-500" />}
                  label="Ожидают обработки"
                  value={String(stats.data.pending_orders)}
                />
                <StatCard
                  icon={<Truck className="size-5 text-premium" />}
                  label="Средний чек"
                  value={`${Number(stats.data.average_order_value).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ${stats.data.currency}`}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="size-4 text-amber-500" />
                      Критические остатки на складе (≤ 5 шт.)
                    </h2>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-500">
                      {stats.data.low_stock.length} шт
                    </span>
                  </div>
                  {stats.data.low_stock.length === 0 ? (
                    <div className="mt-6 flex flex-col items-center justify-center py-8 text-center text-muted">
                      <CheckCircle2 className="size-10 text-emerald-500/80" />
                      <p className="mt-2 text-sm">Все товары в достаточном количестве.</p>
                    </div>
                  ) : (
                    <ul className="mt-4 divide-y text-sm" style={{ borderColor: 'var(--border)' }}>
                      {stats.data.low_stock.map((product) => (
                        <li key={product.id} className="flex items-center justify-between py-3">
                          <div>
                            <span className="font-medium">{product.name}</span>
                            <div className="text-xs text-muted">Артикул: {product.sku}</div>
                          </div>
                          <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono font-bold text-premium">
                            {product.stock_quantity} шт
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">Последние заказы</h2>
                    <button onClick={() => setTab('orders')} className="text-xs font-semibold text-premium hover:underline">
                      Все заказы →
                    </button>
                  </div>
                  <ul className="mt-4 divide-y text-sm" style={{ borderColor: 'var(--border)' }}>
                    {stats.data.recent_orders.map((order) => (
                      <li key={order.id} className="flex items-center justify-between py-3">
                        <div>
                          <Link to={`/orders/${order.id}`} className="font-mono font-bold hover:text-premium">
                            {order.number}
                          </Link>
                          <div className="text-xs text-muted">{order.contact_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{Number(order.total).toFixed(2)} TJS</div>
                          <span className="text-xs text-muted">{STATUS_LABELS[order.status] ?? order.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: PRODUCTS & WAREHOUSE */}
      {tab === 'products' && (
        <div className="mt-8 space-y-6">
          {/* Controls Bar */}
          <div
            className="flex flex-col gap-4 rounded-xl border p-5 lg:flex-row lg:items-center lg:justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  className={`${FIELD} pl-10`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Поиск по названию, артикулу (SKU), OEM..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-premium"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Все категории</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-premium"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
              >
                <option value="">Все бренды</option>
                {(brands.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportProductsCSV}
                className="flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:border-premium hover:text-premium"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                title="Экспортировать каталог товаров в CSV"
              >
                <FileSpreadsheet className="size-4 text-emerald-400" />
                <span>Экспорт CSV</span>
              </button>
              <button
                type="button"
                onClick={openCreateProduct}
                className="flex items-center justify-center gap-2 rounded-lg bg-premium px-5 py-2.5 text-sm font-semibold text-ink shadow-lg transition hover:opacity-90"
              >
                <Plus className="size-4" /> Добавить товар
              </button>
            </div>
          </div>

          {products.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          )}

          {products.isError && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-500">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5" />
                <span>Ошибка загрузки списка товаров каталога.</span>
              </div>
              <button
                onClick={() => void products.refetch()}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3.5 py-1.5 text-xs font-semibold hover:bg-red-500/20"
              >
                <RefreshCw className="size-3.5" /> Повторить
              </button>
            </div>
          )}

          {!products.isLoading && !products.isError && filteredProducts.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-xl border p-12 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <Package className="size-12 text-muted" />
              <h3 className="mt-4 font-bold">Товары не найдены</h3>
              <p className="mt-1 text-sm text-muted">
                {productSearch || filterCategory || filterBrand
                  ? 'По выбранным фильтрам ничего не найдено.'
                  : 'В каталоге пока нет ни одного товара.'}
              </p>
              <button
                onClick={openCreateProduct}
                className="mt-5 rounded-lg bg-premium px-5 py-2 text-sm font-semibold text-ink hover:opacity-90"
              >
                Создать первый товар
              </button>
            </div>
          )}

          {!products.isLoading && !products.isError && filteredProducts.length > 0 && (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs font-semibold text-muted uppercase" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <tr>
                    <th className="px-5 py-3.5">Товар / Артикул</th>
                    <th className="px-5 py-3.5">Категория & Бренд</th>
                    <th className="px-5 py-3.5">Цена (TJS)</th>
                    <th className="px-5 py-3.5">Склад (Остаток)</th>
                    <th className="px-5 py-3.5">Статус</th>
                    <th className="px-5 py-3.5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {filteredProducts.map((p) => {
                    const isLowStock = p.stock_quantity <= 5
                    return (
                      <tr key={p.id} className="transition hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {p.images?.[0]?.url ? (
                              <img
                                src={p.images[0].url}
                                alt={p.name}
                                className="size-11 rounded-lg border object-cover"
                                style={{ borderColor: 'var(--border)' }}
                              />
                            ) : (
                              <div
                                className="flex size-11 items-center justify-center rounded-lg border text-xs text-muted"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                              >
                                Нет фото
                              </div>
                            )}
                            <div>
                              <Link
                                to={`/product/${p.slug}`}
                                target="_blank"
                                className="font-semibold hover:text-premium"
                              >
                                {p.name}
                              </Link>
                              <div className="font-mono text-xs text-muted">SKU: {p.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="font-medium">{p.category?.name ?? '—'}</div>
                          <div className="text-muted">{p.brand?.name ?? '—'}</div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold">
                          <div>{Number(p.price).toFixed(2)}</div>
                          {p.old_price && (
                            <div className="text-xs text-muted line-through">
                              {Number(p.old_price).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2.5 py-1 font-mono font-bold text-xs ${
                                isLowStock
                                  ? 'border border-red-500/40 bg-red-500/10 text-premium'
                                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {p.stock_quantity} шт.
                            </span>
                            <div className="flex gap-1">
                              <button
                                title="Списать 1 единицу"
                                onClick={() => atomicStockMutation.mutate({ id: p.id, delta: -1, reason: 'Списание из админки' })}
                                disabled={p.stock_quantity <= 0 || atomicStockMutation.isPending}
                                className="size-6 rounded border text-xs transition hover:border-premium disabled:opacity-30"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                              >
                                -
                              </button>
                              <button
                                title="Оприходовать 1 единицу"
                                onClick={() => atomicStockMutation.mutate({ id: p.id, delta: 1, reason: 'Приход из админки' })}
                                disabled={atomicStockMutation.isPending}
                                className="size-6 rounded border text-xs transition hover:border-premium"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                              p.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : p.status === 'draft'
                                  ? 'bg-amber-500/20 text-amber-500'
                                  : 'bg-zinc-500/20 text-zinc-500'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="rounded-lg border p-1.5 text-muted transition hover:border-premium hover:text-premium"
                              style={{ borderColor: 'var(--border)' }}
                              title="Редактировать"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Удалить товар «${p.name}»?`)) {
                                  deleteProductMutation.mutate(p.id)
                                }
                              }}
                              className="rounded-lg border p-1.5 text-muted transition hover:border-premium hover:text-premium"
                              style={{ borderColor: 'var(--border)' }}
                              title="Удалить"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {tab === 'categories' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <section className="rounded-xl border p-6 lg:col-span-1" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="text-lg font-bold">Добавить категорию</h2>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted">Название</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Например: Тормозная система"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Слаг (URL)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="brake-system"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Родительская категория</label>
                <select
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={categoryForm.parent_id}
                  onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
                >
                  <option value="">Корневая категория (без родителя)</option>
                  {flatCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Описание</label>
                <textarea
                  className={`${FIELD} h-20 resize-none`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Краткое описание категории..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>
              <button
                type="button"
                disabled={!categoryForm.name.trim() || createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate()}
                className="w-full rounded-lg bg-premium py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-40"
              >
                {createCategoryMutation.isPending ? 'Сохранение...' : 'Создать категорию'}
              </button>
              {createCategoryMutation.isError && (
                <div className="text-xs text-premium">Не удалось создать категорию.</div>
              )}
            </div>
          </section>

          <section className="rounded-xl border p-6 lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="text-lg font-bold">Все категории</h2>
            <div className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
              {flatCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <span className="font-semibold">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Удалить категорию «${cat.name}»?`)) {
                        deleteCategoryMutation.mutate(cat.id)
                      }
                    }}
                    className="rounded-lg border p-1.5 text-muted hover:border-premium hover:text-premium"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {flatCategories.length === 0 && (
                <div className="py-6 text-center text-sm text-muted">Категории пока не добавлены.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB: BRANDS */}
      {tab === 'brands' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <section className="rounded-xl border p-6 lg:col-span-1" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="text-lg font-bold">Добавить бренд</h2>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted">Название</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Например: Brembo, Bosch"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Слаг (URL)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="brembo"
                  value={brandForm.slug}
                  onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Страна</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Германия, Италия..."
                  value={brandForm.country}
                  onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Ссылка на логотип</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="https://..."
                  value={brandForm.logo_url}
                  onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })}
                />
              </div>
              <button
                type="button"
                disabled={!brandForm.name.trim() || createBrandMutation.isPending}
                onClick={() => createBrandMutation.mutate()}
                className="w-full rounded-lg bg-premium py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-40"
              >
                {createBrandMutation.isPending ? 'Сохранение...' : 'Создать бренд'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border p-6 lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="text-lg font-bold">Все бренды</h2>
            <div className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
              {(brands.data ?? []).map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    {b.logo_url && (
                      <img src={b.logo_url} alt={b.name} className="size-8 rounded border object-contain" style={{ borderColor: 'var(--border)' }} />
                    )}
                    <div>
                      <span className="font-semibold">{b.name}</span>
                      {b.country && <span className="ml-2 text-xs text-muted">({b.country})</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Удалить бренд «${b.name}»?`)) {
                        deleteBrandMutation.mutate(b.id)
                      }
                    }}
                    className="rounded-lg border p-1.5 text-muted hover:border-premium hover:text-premium"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {(brands.data ?? []).length === 0 && (
                <div className="py-6 text-center text-sm text-muted">Бренды пока не добавлены.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB: ORDERS */}
      {tab === 'orders' && (
        <div className="mt-8 space-y-4">
          {orders.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          )}

          {orders.isError && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-500">
              <span>Не удалось загрузить заказы.</span>
              <button onClick={() => void orders.refetch()} className="text-xs font-semibold underline">
                Повторить
              </button>
            </div>
          )}

          {(orders.data?.items ?? []).map((order) => {
            const availableTransitions = order.allowed_transitions ?? [
              'confirmed',
              'processing',
              'shipped',
              'delivered',
              'completed',
              'cancelled',
            ]
            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 text-sm transition hover:border-premium/50"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
              >
                <div>
                  <Link to={`/orders/${order.id}`} className="font-mono font-bold hover:text-premium">
                    {order.number}
                  </Link>
                  <div className="text-xs text-muted">
                    {order.contact_name} {order.contact_phone ? `· ${order.contact_phone}` : ''} · {order.shipping_city}
                  </div>
                </div>
                <div className="font-mono font-bold">
                  {Number(order.total).toFixed(2)} {order.currency}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold text-muted hover:border-premium hover:text-ink transition"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    title="Открыть детали заказа и историю статусов"
                  >
                    <Eye className="size-3.5" />
                    <span>Детали</span>
                  </button>
                  <span className="rounded-md border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  {availableTransitions.length > 0 && (
                    <select
                      className="rounded-md border px-2.5 py-1 text-xs outline-none focus:border-premium"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          advanceStatus.mutate({ orderId: order.id, status: event.target.value })
                        }
                      }}
                    >
                      <option value="">Сменить статус…</option>
                      {availableTransitions.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status] ?? status}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}

          {!orders.isLoading && (orders.data?.items ?? []).length === 0 && (
            <div className="rounded-xl border p-12 text-center text-muted" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              Заказы отсутствуют.
            </div>
          )}
        </div>
      )}

      {/* TAB: COUPONS */}
      {tab === 'coupons' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="mb-4 font-bold">
              <Ticket className="mr-1.5 inline size-4 text-premium" /> Создать промокод
            </h2>
            <div className="space-y-3.5">
              <input
                className={FIELD}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                placeholder="КОД (например: AUTOU10)"
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
              />
              <select
                className={FIELD}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                value={couponForm.type}
                onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
              >
                <option value="percent">Процентная скидка (%)</option>
                <option value="fixed">Фиксированная сумма (TJS)</option>
              </select>
              <input
                className={FIELD}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                placeholder="Значение скидки"
                value={couponForm.value}
                onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
              />
              <button
                type="button"
                disabled={!couponForm.code.trim() || !couponForm.value || createCoupon.isPending}
                onClick={() => createCoupon.mutate()}
                className="w-full rounded-lg bg-premium py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-40"
              >
                {createCoupon.isPending ? 'Создание...' : 'Создать промокод'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="mb-4 font-bold">Действующие промокоды</h2>
            <ul className="space-y-2.5 text-sm">
              {(coupons.data ?? []).map((coupon) => (
                <li
                  key={coupon.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <div>
                    <span className="font-mono font-bold">{coupon.code}</span>
                    <span className="ml-2 text-xs text-muted">
                      {coupon.type === 'percent' ? `${coupon.value}%` : `${Number(coupon.value).toFixed(2)} TJS`}
                    </span>
                    <div className="text-xs text-muted">Использован {coupon.used_count} раз</div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      coupon.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-500'
                    }`}
                  >
                    {coupon.is_active ? 'Активен' : 'Отключен'}
                  </span>
                </li>
              ))}
              {(coupons.data ?? []).length === 0 && (
                <li className="py-4 text-center text-sm text-muted">Промокодов пока нет.</li>
              )}
            </ul>
          </section>
        </div>
      )}

      {/* TAB: ZONES */}
      {tab === 'zones' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="mb-4 font-bold">Добавить зону доставки</h2>
            <div className="space-y-3.5">
              <input
                className={FIELD}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                placeholder="Город (например: Душанбе, Худжанд)"
                value={zoneForm.city}
                onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })}
              />
              <input
                className={FIELD}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                placeholder="Стоимость доставки (TJS)"
                value={zoneForm.fee}
                onChange={(e) => setZoneForm({ ...zoneForm, fee: e.target.value })}
              />
              <input
                className={FIELD}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                placeholder="Бесплатно от суммы (TJS, опционально)"
                value={zoneForm.free_from}
                onChange={(e) => setZoneForm({ ...zoneForm, free_from: e.target.value })}
              />
              <button
                type="button"
                disabled={!zoneForm.city.trim() || !zoneForm.fee || createZone.isPending}
                onClick={() => createZone.mutate()}
                className="w-full rounded-lg bg-premium py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-40"
              >
                {createZone.isPending ? 'Добавление...' : 'Добавить зону'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <h2 className="mb-4 font-bold">Тарифные зоны Таджикистана</h2>
            <ul className="space-y-2.5 text-sm">
              {(zones.data ?? []).map((zone) => (
                <li
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <div>
                    <span className="font-semibold">{zone.city}</span>
                    <span className="ml-2 text-xs text-muted">
                      {zone.eta_days_min}–{zone.eta_days_max} дн.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold">{Number(zone.fee).toFixed(2)} TJS</span>
                    {zone.free_from && (
                      <div className="text-xs text-emerald-500">
                        бесплатно от {Number(zone.free_from).toFixed(0)} TJS
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* TAB: INVENTORY & MOVEMENTS */}
      {tab === 'inventory' && (
        <div className="mt-8 space-y-8">
          {/* Warehouses list */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Warehouse className="size-5 text-premium" />
                  Склады и филиалы
                </h2>
                <p className="text-xs text-muted mt-0.5">Сеть распределительных центров и складских площадок компании</p>
              </div>
              <button
                type="button"
                onClick={() => void warehousesQuery.refetch()}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
              >
                <RefreshCw className={`size-3.5 ${warehousesQuery.isFetching ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>

            {warehousesQuery.isLoading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(warehousesQuery.data ?? []).map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border p-5 relative overflow-hidden transition hover:border-premium/50"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-premium uppercase bg-premium/10 px-2 py-0.5 rounded border border-premium/30">
                            {w.code}
                          </span>
                          {w.is_default && (
                            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Основной
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-base font-bold text-ink">{w.name}</h3>
                        <p className="text-xs text-muted mt-1">{w.city || 'Душанбе'}{w.address ? `, ${w.address}` : ''}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-muted">Номенклатура в наличии:</span>
                      <span className="font-bold text-ink font-mono">{w.items_count ?? 0} позиций</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Movements Audit Log */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="size-5 text-premium" />
                  Аудит-лог движения товаров (Stock Ledger)
                </h2>
                <p className="text-xs text-muted mt-0.5">Неизменяемый журнал всех складских проводок, отгрузок и возвратов</p>
              </div>
              <button
                type="button"
                onClick={() => void movementsQuery.refetch()}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
              >
                <RefreshCw className={`size-3.5 ${movementsQuery.isFetching ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>

            <div
              className="mt-4 overflow-hidden rounded-xl border shadow-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              {movementsQuery.isLoading ? (
                <div className="p-8 text-center text-sm text-muted">Загрузка журнала движений...</div>
              ) : (movementsQuery.data ?? []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">Журнал проводок пуст.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b uppercase tracking-wider text-muted font-mono" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <tr>
                        <th className="px-4 py-3">Дата & Время</th>
                        <th className="px-4 py-3">Товар / Деталь</th>
                        <th className="px-4 py-3">Склад</th>
                        <th className="px-4 py-3">Тип операции</th>
                        <th className="px-4 py-3 text-right">Кол-во</th>
                        <th className="px-4 py-3 text-right">Остаток после</th>
                        <th className="px-4 py-3">Основание / Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {(movementsQuery.data ?? []).map((m: any) => {
                        const typeInfo = MOVEMENT_TYPE_LABELS[m.type] || { label: m.type, color: 'text-muted border-border' }
                        const isPositive = m.quantity_delta > 0
                        return (
                          <tr key={m.id} className="hover:bg-white/5 transition">
                            <td className="px-4 py-3 text-muted whitespace-nowrap font-mono">
                              {new Date(m.created_at).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-ink max-w-[260px] truncate" title={m.product_name}>
                                {m.product_name || 'Товар'}
                              </div>
                              <div className="font-mono text-[11px] text-muted">{m.product_sku || m.product_id}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-muted">
                              {m.warehouse_code || 'MAIN'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-ink whitespace-nowrap">
                              {m.balance_after}
                            </td>
                            <td className="px-4 py-3 text-muted max-w-[220px] truncate" title={m.reason || m.reference_type}>
                              {m.reason || (m.reference_type ? `${m.reference_type}: ${m.reference_id}` : '—')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: USERS & RBAC ACCESS */}
      {tab === 'users' && (
        <div className="mt-8 space-y-6">
          <div
            className="flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  className={`${FIELD} pl-10`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Поиск пользователей по имени или email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-premium"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="">Все роли</option>
                {Object.entries(ROLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label} ({k})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void usersQuery.refetch()}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
              style={{ borderColor: 'var(--border)' }}
            >
              <RefreshCw className={`size-3.5 ${usersQuery.isFetching ? 'animate-spin' : ''}`} />
              Обновить список
            </button>
          </div>

          <div
            className="overflow-hidden rounded-xl border shadow-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {usersQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-muted">Загрузка списка пользователей...</div>
            ) : (usersQuery.data ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">Пользователи не найдены.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b uppercase tracking-wider text-muted font-mono" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <tr>
                      <th className="px-4 py-3">Пользователь</th>
                      <th className="px-4 py-3">Email / Телефон</th>
                      <th className="px-4 py-3">Роль (RBAC)</th>
                      <th className="px-4 py-3">Статус аккаунта</th>
                      <th className="px-4 py-3">Регистрация</th>
                      <th className="px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {(usersQuery.data ?? []).map((u: any) => (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.email || 'Без имени')}</div>
                          <div className="font-mono text-[10px] text-muted">{u.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-ink">{u.email}</div>
                          {u.phone && <div className="text-[11px] text-muted">{u.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="rounded border px-2 py-1 text-xs outline-none focus:border-premium font-medium"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            value={u.role}
                            disabled={updateUserAccess.isPending}
                            onChange={(e) =>
                              updateUserAccess.mutate({ userId: u.id, data: { role: e.target.value } })
                            }
                          >
                            {Object.entries(ROLE_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateUserAccess.mutate({ userId: u.id, data: { is_active: !u.is_active } })
                            }
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
                              u.is_active
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            {u.is_active ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}
                            {u.is_active ? 'Активен' : 'Заблокирован'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted whitespace-nowrap font-mono">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('ru-RU')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setAdjustPointsModalUser(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold text-amber-400 hover:border-amber-400 transition"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            title="Скорректировать баланс баллов лояльности"
                          >
                            <Coins className="size-3.5" />
                            <span>Бонусы</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

            {/* TAB: CONTENT & SEO */}
      {tab === 'content' && (
        <div className="mt-8 space-y-6">
          {/* Header controls & SEO Quick Links */}
          <div
            className="flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  className={`${FIELD} pl-10`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Поиск статей по названию или содержанию..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-premium"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                value={contentCategory}
                onChange={(e) => setContentCategory(e.target.value)}
              >
                <option value="">Все рубрики</option>
                <option value="guide">Руководства (Guide)</option>
                <option value="maintenance">Техобслуживание (Maintenance)</option>
                <option value="diy">Своими руками (DIY)</option>
                <option value="review">Обзоры (Review)</option>
                <option value="news">Новости (News)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
                title="Открыть актуальный файл sitemap.xml"
              >
                <Globe className="size-3.5 text-blue-400" />
                sitemap.xml
                <ExternalLink className="size-3" />
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
                title="Открыть robots.txt"
              >
                <Globe className="size-3.5 text-emerald-400" />
                robots.txt
                <ExternalLink className="size-3" />
              </a>
              <button
                type="button"
                onClick={openCreateArticle}
                className="flex items-center gap-1.5 rounded-lg bg-premium px-4 py-2 text-xs font-semibold text-ink hover:opacity-90 shadow-md"
              >
                <Plus className="size-4" />
                Написать статью
              </button>
            </div>
          </div>

          {/* Articles list table */}
          <div
            className="overflow-hidden rounded-xl border shadow-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {adminArticlesQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-muted">Загрузка материалов базы знаний...</div>
            ) : (adminArticlesQuery.data?.items ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">Статьи не найдены. Создайте первую статью!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className="border-b uppercase text-[11px] font-bold text-muted"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    <tr>
                      <th className="px-5 py-3.5">Обложка & Статья</th>
                      <th className="px-5 py-3.5">Рубрика</th>
                      <th className="px-5 py-3.5">Статус</th>
                      <th className="px-5 py-3.5">Метрики</th>
                      <th className="px-5 py-3.5">Дата</th>
                      <th className="px-5 py-3.5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {adminArticlesQuery.data?.items.map((art) => (
                      <tr key={art.id} className="transition hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {art.cover_image ? (
                              <img
                                src={art.cover_image}
                                alt=""
                                className="size-11 rounded-lg border object-cover shrink-0"
                                style={{ borderColor: 'var(--border)' }}
                              />
                            ) : (
                              <div className="size-11 rounded-lg border flex items-center justify-center bg-white/5 shrink-0" style={{ borderColor: 'var(--border)' }}>
                                <BookOpen className="size-5 text-muted" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                to={`/blog/${art.slug}`}
                                target="_blank"
                                className="font-semibold text-ink hover:text-premium line-clamp-1 flex items-center gap-1"
                              >
                                {art.title}
                                <ExternalLink className="size-3 text-muted shrink-0" />
                              </Link>
                              <div className="font-mono text-[10px] text-muted truncate">
                                /blog/{art.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded px-2 py-0.5 text-[11px] font-bold uppercase bg-white/5 border border-white/10 text-muted">
                            {art.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {art.is_published ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              Опубликовано
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-0.5 text-[11px] font-bold text-zinc-400">
                              Черновик
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          <div className="flex items-center gap-3 text-[11px]">
                            <span>👁️ {art.views_count}</span>
                            <span>⏱️ {art.reading_time_minutes} мин</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted font-mono text-[11px]">
                          {art.published_at ? new Date(art.published_at).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleArticlePublishMutation.mutate(art.id)}
                              className="rounded-lg border px-2.5 py-1 text-[11px] font-medium hover:text-ink"
                              style={{ borderColor: 'var(--border)' }}
                              title={art.is_published ? 'Снять с публикации' : 'Опубликовать'}
                            >
                              {art.is_published ? 'В черновик' : 'Опубликовать'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void openEditArticle(art)}
                              className="rounded-lg border p-1.5 text-muted hover:border-premium hover:text-premium"
                              style={{ borderColor: 'var(--border)' }}
                              title="Редактировать статью"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Удалить статью "${art.title}"?`)) {
                                  deleteArticleMutation.mutate(art.id)
                                }
                              }}
                              className="rounded-lg border p-1.5 text-muted hover:border-red-500 hover:text-red-500"
                              style={{ borderColor: 'var(--border)' }}
                              title="Удалить статью"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

{/* TAB: SUPPORT TICKETS */}
      {tab === 'support' && (
        <div className="mt-8 space-y-6">
          <div
            className="flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  className={`${FIELD} pl-10`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Поиск обращений по номеру, теме или клиенту..."
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-premium"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                value={supportFilterStatus}
                onChange={(e) => setSupportFilterStatus(e.target.value)}
              >
                <option value="">Все статусы</option>
                <option value="open">Новые (Open)</option>
                <option value="in_progress">В работе (In progress)</option>
                <option value="awaiting_customer">Ожидают ответа клиента</option>
                <option value="resolved">Решенные (Resolved)</option>
                <option value="closed">Закрытые (Closed)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void adminTicketsQuery.refetch()}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
              style={{ borderColor: 'var(--border)' }}
            >
              <RefreshCw className={`size-3.5 ${adminTicketsQuery.isFetching ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          <div
            className="overflow-hidden rounded-xl border shadow-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {adminTicketsQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-muted">Загрузка обращений...</div>
            ) : (adminTicketsQuery.data?.items ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">Обращений не найдено.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b uppercase tracking-wider text-muted font-mono" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <tr>
                      <th className="px-4 py-3">Номер & Тема</th>
                      <th className="px-4 py-3">Клиент</th>
                      <th className="px-4 py-3">Категория</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3">Обновлено</th>
                      <th className="px-4 py-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {(adminTicketsQuery.data?.items ?? []).map((t) => (
                      <tr key={t.id} className={`hover:bg-white/5 transition ${t.unread ? 'bg-premium/5' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-ink">{t.number}</span>
                            {t.unread && (
                              <span className="rounded bg-premium/20 px-1.5 py-0.2 text-[9px] font-bold text-premium">
                                Новое
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-muted mt-0.5 line-clamp-1">{t.subject}</div>
                          {t.order_number && (
                            <span className="text-[10px] text-premium font-mono">Заказ #{t.order_number}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{t.customer_name}</div>
                          <div className="text-[11px] text-muted">{t.customer_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded border px-2 py-0.5 text-[11px] text-muted font-medium" style={{ borderColor: 'var(--border)' }}>
                            {t.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold border border-white/10 uppercase">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted whitespace-nowrap font-mono">
                          {new Date(t.last_message_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(t.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-ink hover:border-premium hover:text-premium transition"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                          >
                            <MessageSquare className="size-3.5" />
                            <span>Диалог</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TICKET INSPECTOR & STAFF REPLY MODAL */}
      {selectedTicketId && adminTicketDetailQuery.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-6 shadow-2xl space-y-5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-bold text-premium">{adminTicketDetailQuery.data.number}</span>
                  <span className="rounded px-2 py-0.5 text-xs font-bold border uppercase border-white/20">
                    {adminTicketDetailQuery.data.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-ink mt-1">{adminTicketDetailQuery.data.subject}</h2>
                <div className="text-xs text-muted mt-0.5">
                  Клиент: {adminTicketDetailQuery.data.customer_name} ({adminTicketDetailQuery.data.customer_email})
                </div>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="rounded-lg p-1.5 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Quick Actions (Status change) */}
            <div className="flex items-center justify-between gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-muted">Статус обращения:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => staffUpdateTicketMutation.mutate({ ticketId: selectedTicketId, status: 'in_progress' })}
                  className="px-2.5 py-1 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                >
                  В работе
                </button>
                <button
                  type="button"
                  onClick={() => staffUpdateTicketMutation.mutate({ ticketId: selectedTicketId, status: 'resolved' })}
                  className="px-2.5 py-1 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                >
                  Решено
                </button>
                <button
                  type="button"
                  onClick={() => staffUpdateTicketMutation.mutate({ ticketId: selectedTicketId, status: 'closed' })}
                  className="px-2.5 py-1 rounded border border-zinc-500/30 text-zinc-400 bg-zinc-500/10 hover:bg-zinc-500/20"
                >
                  Закрыть
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="max-h-80 overflow-y-auto space-y-3.5 p-4 rounded-xl border border-white/10 bg-[#111418]">
              {adminTicketDetailQuery.data.messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.is_staff ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-muted">
                    <span className={m.is_staff ? 'text-premium font-bold' : 'text-ink font-medium'}>
                      {m.author_name}
                    </span>
                    <span className="font-mono text-[10px]">
                      {new Date(m.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] leading-relaxed ${
                      m.is_staff
                        ? 'bg-premium text-ink rounded-tr-sm shadow-md'
                        : 'bg-[#1C222B] border border-white/10 text-ink rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Staff Reply Box */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-muted">Ответ клиенту (будет отправлен в чат и по email):</label>
              <div className="flex gap-2.5">
                <textarea
                  rows={3}
                  value={staffReplyText}
                  onChange={(e) => setStaffReplyText(e.target.value)}
                  placeholder="Введите ответ клиенту от имени службы поддержки AutoUniverse..."
                  className="flex-1 rounded-xl border p-3 text-xs outline-none focus:border-premium resize-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                />
                <button
                  type="button"
                  disabled={!staffReplyText.trim() || staffReplyMutation.isPending}
                  onClick={() => {
                    staffReplyMutation.mutate({
                      ticketId: selectedTicketId,
                      body: staffReplyText.trim(),
                    })
                  }}
                  className="rounded-xl bg-premium px-5 text-xs font-bold text-ink transition hover:brightness-110 disabled:opacity-40 shrink-0"
                >
                  {staffReplyMutation.isPending ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS INSPECTOR MODAL */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-6 shadow-2xl space-y-6"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold font-mono">
                    Заказ #{orderDetailQuery.data?.number || selectedOrderId.slice(0, 8)}
                  </h2>
                  {orderDetailQuery.data && (
                    <span className="rounded-md border px-2.5 py-0.5 text-xs font-bold" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      {STATUS_LABELS[orderDetailQuery.data.status] ?? orderDetailQuery.data.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-1 font-mono">ID: {selectedOrderId}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedOrderId(null)
                  setTargetOrderStatus('')
                  setStatusChangeNote('')
                }}
                className="rounded-lg p-1.5 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {orderDetailQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-muted">Загрузка данных заказа...</div>
            ) : orderDetailQuery.isError || !orderDetailQuery.data ? (
              <div className="py-8 text-center text-rose-400">Ошибка загрузки деталей заказа.</div>
            ) : (
              <>
                {/* Contact & Shipping info */}
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="font-bold text-muted uppercase mb-2">Клиент и контакты</div>
                    <div className="text-sm font-semibold text-ink">{orderDetailQuery.data.contact_name}</div>
                    <div className="text-muted mt-1">📞 {orderDetailQuery.data.contact_phone || 'Не указан'}</div>
                    <div className="text-muted">✉️ {orderDetailQuery.data.contact_email || 'Не указан'}</div>
                    {orderDetailQuery.data.customer_note && (
                      <div className="mt-2 text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                        Примечание: {orderDetailQuery.data.customer_note}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="font-bold text-muted uppercase mb-2">Доставка и оплата</div>
                    <div className="text-sm font-semibold text-ink">{orderDetailQuery.data.shipping_city || 'Душанбе'}</div>
                    <div className="text-muted mt-1">{orderDetailQuery.data.shipping_street || 'Самовывоз / офис'}</div>
                    <div className="mt-2 text-muted">Способ доставки: <span className="text-ink font-medium">{orderDetailQuery.data.shipping_method}</span></div>
                    <div className="text-muted">Оплата: <span className="text-ink font-medium">{orderDetailQuery.data.payment_method}</span></div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="p-3 border-b font-bold text-xs uppercase text-muted" style={{ borderColor: 'var(--border)' }}>
                    Состав заказа ({orderDetailQuery.data.items?.length || 0} поз.)
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="border-b uppercase text-muted font-mono" style={{ borderColor: 'var(--border)' }}>
                      <tr>
                        <th className="px-4 py-2.5">Товар</th>
                        <th className="px-4 py-2.5">Артикул</th>
                        <th className="px-4 py-2.5 text-center">Кол-во</th>
                        <th className="px-4 py-2.5 text-right">Цена</th>
                        <th className="px-4 py-2.5 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {(orderDetailQuery.data.items ?? []).map((it: any) => (
                        <tr key={it.id}>
                          <td className="px-4 py-2.5 font-semibold text-ink">{it.product_name}</td>
                          <td className="px-4 py-2.5 font-mono text-muted">{it.product_sku}</td>
                          <td className="px-4 py-2.5 text-center font-mono">{it.quantity} шт</td>
                          <td className="px-4 py-2.5 text-right font-mono">{Number(it.unit_price).toFixed(2)} TJS</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">{Number(it.line_total).toFixed(2)} TJS</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Financial calculation */}
                  <div className="border-t p-4 space-y-1.5 text-xs" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between text-muted">
                      <span>Товары:</span>
                      <span className="font-mono">{Number(orderDetailQuery.data.subtotal).toFixed(2)} TJS</span>
                    </div>
                    {Number(orderDetailQuery.data.shipping_cost) > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>Доставка:</span>
                        <span className="font-mono">+{Number(orderDetailQuery.data.shipping_cost).toFixed(2)} TJS</span>
                      </div>
                    )}
                    {Number(orderDetailQuery.data.discount) > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Скидка по промокоду:</span>
                        <span className="font-mono">-{Number(orderDetailQuery.data.discount).toFixed(2)} TJS</span>
                      </div>
                    )}
                    {Number(orderDetailQuery.data.points_discount) > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Оплата бонусами ({orderDetailQuery.data.points_redeemed} баллов):</span>
                        <span className="font-mono">-{Number(orderDetailQuery.data.points_discount).toFixed(2)} TJS</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-ink pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span>Итого к оплате:</span>
                      <span className="text-premium font-mono">{Number(orderDetailQuery.data.total).toFixed(2)} TJS</span>
                    </div>
                  </div>
                </div>

                {/* Status Timeline History */}
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <h3 className="text-xs font-bold uppercase text-muted flex items-center gap-1.5">
                    <History className="size-3.5 text-premium" />
                    История статусов и аудит
                  </h3>
                  {(orderDetailQuery.data.status_history ?? []).length === 0 ? (
                    <div className="text-xs text-muted">История статусов пуста.</div>
                  ) : (
                    <div className="relative pl-4 border-l-2 space-y-3" style={{ borderColor: 'var(--border)' }}>
                      {orderDetailQuery.data.status_history.map((h: any) => (
                        <div key={h.id} className="relative text-xs">
                          <div className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-premium" />
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">
                              {STATUS_LABELS[h.to_status] ?? h.to_status}
                            </span>
                            {h.from_status && (
                              <span className="text-[10px] text-muted font-mono">
                                (из {STATUS_LABELS[h.from_status] ?? h.from_status})
                              </span>
                            )}
                            <span className="text-muted font-mono ml-auto">
                              {new Date(h.created_at).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          {h.note && (
                            <div className="mt-1 text-muted italic bg-white/5 p-1.5 rounded">
                              «{h.note}»
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Transition Control */}
                {orderDetailQuery.data.allowed_transitions?.length > 0 && (
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h3 className="text-xs font-bold uppercase text-muted">Сменить статус заказа</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        className="rounded-lg border px-3 py-2 text-xs outline-none focus:border-premium font-semibold"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                        value={targetOrderStatus}
                        onChange={(e) => setTargetOrderStatus(e.target.value)}
                      >
                        <option value="">Выберите новый статус…</option>
                        {orderDetailQuery.data.allowed_transitions.map((st: string) => (
                          <option key={st} value={st}>
                            → {STATUS_LABELS[st] ?? st}
                          </option>
                        ))}
                      </select>
                      <input
                        className="flex-1 rounded-lg border px-3 py-2 text-xs outline-none focus:border-premium"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                        placeholder="Служебная заметка к статусу (причина, трек-номер и т.д.)..."
                        value={statusChangeNote}
                        onChange={(e) => setStatusChangeNote(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={!targetOrderStatus || advanceStatus.isPending}
                        onClick={() => {
                          if (targetOrderStatus) {
                            advanceStatus.mutate({
                              orderId: selectedOrderId,
                              status: targetOrderStatus,
                              note: statusChangeNote,
                            })
                            setTargetOrderStatus('')
                          }
                        }}
                        className="rounded-lg bg-premium px-4 py-2 text-xs font-bold text-ink transition hover:opacity-90 disabled:opacity-40"
                      >
                        {advanceStatus.isPending ? 'Обновление...' : 'Применить'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* LOYALTY ADJUST MODAL */}
      {adjustPointsModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Coins className="size-5 text-amber-400" />
                <h2 className="text-base font-bold">Корректировка бонусов</h2>
              </div>
              <button
                onClick={() => setAdjustPointsModalUser(null)}
                className="rounded-lg p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-xs text-muted">
              Пользователь: <span className="font-semibold text-ink">{adjustPointsModalUser.first_name ? `${adjustPointsModalUser.first_name} ${adjustPointsModalUser.last_name || ''}`.trim() : adjustPointsModalUser.email}</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted">Количество баллов (+ для начисления, - для списания)</label>
                <input
                  type="number"
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={adjustPointsAmount}
                  onChange={(e) => setAdjustPointsAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Обоснование / комментарий</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Например: Компенсация задержки доставки"
                  value={adjustPointsReason}
                  onChange={(e) => setAdjustPointsReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setAdjustPointsModalUser(null)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={adjustPointsAmount === 0 || !adjustPointsReason.trim() || adjustLoyaltyMutation.isPending}
                onClick={() => {
                  adjustLoyaltyMutation.mutate({
                    userId: adjustPointsModalUser.id,
                    amount: adjustPointsAmount,
                    description: adjustPointsReason.trim(),
                  })
                }}
                className="rounded-lg bg-premium px-5 py-2 text-xs font-bold text-ink transition hover:opacity-90 disabled:opacity-40"
              >
                {adjustLoyaltyMutation.isPending ? 'Проведение...' : 'Сохранить проводку'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-bold">
                {editingProductId ? 'Редактировать товар' : 'Добавить новый товар'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:text-premium"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Название детали *</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Тормозные колодки передние керамические"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Артикул (SKU) *</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  disabled={Boolean(editingProductId)}
                  placeholder="BR-1029-X"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Слаг (URL-идентификатор)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="auto-generated-if-empty"
                  value={productForm.slug}
                  onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Категория *</label>
                <select
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                >
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Бренд *</label>
                <select
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={productForm.brand_id}
                  onChange={(e) => setProductForm({ ...productForm, brand_id: e.target.value })}
                >
                  {(brands.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Цена (TJS) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="350.00"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Старая цена (TJS, опционально)</label>
                <input
                  type="number"
                  step="0.01"
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="420.00"
                  value={productForm.old_price}
                  onChange={(e) => setProductForm({ ...productForm, old_price: e.target.value })}
                />
              </div>

              {!editingProductId && (
                <div>
                  <label className="text-xs font-semibold text-muted">Начальный остаток на складе (шт.) *</label>
                  <input
                    type="number"
                    className={FIELD}
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted">Статус товара</label>
                <select
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={productForm.status}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      status: e.target.value as 'active' | 'draft' | 'archived',
                    })
                  }
                >
                  <option value="active">Active (Опубликован)</option>
                  <option value="draft">Draft (Черновик)</option>
                  <option value="archived">Archived (В архиве)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Ссылка на главное фото (URL)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="https://images.unsplash.com/..."
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Оригинальный OEM-номер</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Например: 34116799964"
                  value={productForm.oem_number}
                  onChange={(e) => setProductForm({ ...productForm, oem_number: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Краткое описание</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Премиальные колодки для передней оси..."
                  value={productForm.short_description}
                  onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                />
              </div>
            </div>

            {saveProductMutation.isError && (
              <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-premium">
                Не удалось сохранить товар. Проверьте обязательные поля (название, артикул, цену).
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={
                  !productForm.name.trim() ||
                  !productForm.sku.trim() ||
                  !productForm.price ||
                  saveProductMutation.isPending
                }
                onClick={() => saveProductMutation.mutate()}
                className="rounded-lg bg-premium px-6 py-2 text-sm font-semibold text-ink shadow-lg transition hover:opacity-90 disabled:opacity-40"
              >
                {saveProductMutation.isPending ? 'Сохранение...' : 'Сохранить товар'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ARTICLE CREATE / EDIT MODAL */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-lg font-bold">
                  {editingArticleId ? 'Редактирование статьи' : 'Новая статья в Базу знаний'}
                </h2>
                <p className="text-xs text-muted">
                  Заполните текст, выберите категорию и настройте метаданные для поисковых систем (SEO).
                </p>
              </div>
              <button
                onClick={() => setIsArticleModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Заголовок статьи *</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Например: Как выбрать тормозные колодки для горных дорог"
                  value={articleForm.title}
                  onChange={(e) => {
                    const newTitle = e.target.value
                    setArticleForm({
                      ...articleForm,
                      title: newTitle,
                      slug: !editingArticleId && !articleForm.slug ? newTitle.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-').replace(/(^-|-$)/g, '') : articleForm.slug,
                    })
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">URL-адрес (Slug)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="vybor-tormoznyh-kolodok"
                  value={articleForm.slug}
                  onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">Рубрика / Категория *</label>
                <select
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  value={articleForm.category}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, category: e.target.value as ArticleCategory })
                  }
                >
                  <option value="guide">Руководства (Guide)</option>
                  <option value="maintenance">Техобслуживание (Maintenance)</option>
                  <option value="diy">Своими руками (DIY)</option>
                  <option value="review">Обзоры деталей (Review)</option>
                  <option value="news">Новости и тренды (News)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Ссылка на обложку (URL картинки)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="https://images.unsplash.com/..."
                  value={articleForm.cover_image}
                  onChange={(e) => setArticleForm({ ...articleForm, cover_image: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Краткий анонс (Excerpt) *</label>
                <textarea
                  rows={2}
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="Короткое описание статьи для карточки в каталоге и соцсетях..."
                  value={articleForm.excerpt}
                  onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Текст статьи (Markdown) *</label>
                <textarea
                  rows={8}
                  className={`${FIELD} font-mono text-xs`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="## Подзаголовок 1&#10;&#10;Текст статьи с описанием...&#10;&#10;- Пункт списка 1&#10;- Пункт списка 2"
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">Теги (через запятую)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="тормоза, колодки, brembo, то"
                  value={articleForm.tags}
                  onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                />
              </div>

              {/* SEO Block */}
              <div className="sm:col-span-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold text-premium uppercase tracking-wider">Настройки SEO & Метаданные</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">SEO Заголовок (Title)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="По умолчанию совпадает с названием"
                  value={articleForm.seo_title}
                  onChange={(e) => setArticleForm({ ...articleForm, seo_title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted">SEO Ключевые слова (Keywords)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="автозапчасти душанбе, колодки brembo"
                  value={articleForm.seo_keywords}
                  onChange={(e) => setArticleForm({ ...articleForm, seo_keywords: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted">SEO Описание (Meta Description)</label>
                <input
                  className={FIELD}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  placeholder="По умолчанию совпадает с анонсом"
                  value={articleForm.seo_description}
                  onChange={(e) => setArticleForm({ ...articleForm, seo_description: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="art_pub"
                  className="rounded border border-gray-600 bg-transparent text-premium focus:ring-premium"
                  checked={articleForm.is_published}
                  onChange={(e) => setArticleForm({ ...articleForm, is_published: e.target.checked })}
                />
                <label htmlFor="art_pub" className="text-xs font-semibold text-ink cursor-pointer">
                  Опубликовать статью сразу (если выключено — останется в черновиках)
                </label>
              </div>
            </div>

            {saveArticleMutation.isError && (
              <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-premium">
                Не удалось сохранить статью. Проверьте обязательные поля (заголовок, анонс, текст статьи).
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setIsArticleModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
                style={{ borderColor: 'var(--border)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={
                  !articleForm.title.trim() ||
                  !articleForm.excerpt.trim() ||
                  !articleForm.content.trim() ||
                  saveArticleMutation.isPending
                }
                onClick={() => saveArticleMutation.mutate()}
                className="rounded-lg bg-premium px-6 py-2 text-sm font-semibold text-ink shadow-lg transition hover:opacity-90 disabled:opacity-40"
              >
                {saveArticleMutation.isPending ? 'Сохранение...' : 'Сохранить статью'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#12161D] p-5 shadow-lg transition-all duration-300 hover:border-premium/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]">
      <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/5 blur-xl" />
      <div className="flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <div className="grid size-7 place-items-center rounded-lg bg-white/5 border border-white/10">
          {icon}
        </div>
        <span>{label}</span>
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight text-ink font-mono">{value}</div>
    </div>
  )
}
