const API_BASE = '/api/v1'

const ACCESS_KEY = 'au_access'
const REFRESH_KEY = 'au_refresh'
const GUEST_KEY = 'au_guest'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function getGuestId(): string {
  let guest = localStorage.getItem(GUEST_KEY)
  if (!guest) {
    guest = `guest-${crypto.randomUUID()}`
    localStorage.setItem(GUEST_KEY, guest)
  }
  return guest
}

export class ApiError extends Error {
  status: number
  details: { field: string; message: string }[]
  constructor(status: number, message: string, details: { field: string; message: string }[] = []) {
    super(message)
    this.status = status
    this.details = details
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  query?: Record<string, string | string[] | number | boolean | undefined | null>
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!response.ok) {
    clearTokens()
    return false
  }
  const data = await response.json()
  setTokens(data.access_token, data.refresh_token)
  return true
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)))
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const headers: Record<string, string> = { 'X-Guest-Id': getGuestId() }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const access = getAccessToken()
  if (access) headers['Authorization'] = `Bearer ${access}`

  let response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await (refreshPromise ??= tryRefresh().finally(() => {
      refreshPromise = null
    }))
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${getAccessToken()}` }
      response = await fetch(url.toString(), {
        method: options.method ?? 'GET',
        headers: retryHeaders,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      })
    }
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail ?? 'Request failed',
      Array.isArray(data.errors) ? data.errors : [],
    )
  }
  return data as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => apiRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
