import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { 
  isPublicRoute, 
  isLegacyRoute, 
  getLegacyRedirectPath,
  isRouteAllowed 
} from '@/lib/services/route-config.service'
import type { Role } from '@/lib/services/rbac.service'

// OPTIMIZED: LRU Cache with better memory management
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize = 500, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, item)
    return item.value
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

// Optimized cache instance with enhanced settings
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes TTL (increased from 5 minutes)
const MAX_CACHE_SIZE = 1000 // Increased cache size

const employeeCache = new LRUCache<{
  role: Role
  is_active: boolean
}>(MAX_CACHE_SIZE, CACHE_TTL)

// Background cleanup (runs less frequently)
let lastCleanup = 0
const CLEANUP_INTERVAL = 10 * 60 * 1000 // 10 minutes

function shouldCleanup(): boolean {
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now
    return true
  }
  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // 0. Skip middleware for static assets and favicon
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/icon') ||
      pathname.includes('.') ||
      pathname === '/api/health'
    ) {
      return response
    }

    // Background cleanup (only occasionally)
    if (shouldCleanup()) {
      employeeCache.clear()
    }

    // 1. Create supabase client - single attempt, no retries
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Get session and refresh if needed
    let session = null
    
    try {
      // First try to get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[MIDDLEWARE] Session fetch failed:', sessionError)
      } else if (currentSession) {
        session = currentSession
        
        // Check if session needs refresh (expires in less than 60 seconds)
        const expiresAt = currentSession.expires_at || 0
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = expiresAt - now
        
        if (timeUntilExpiry < 60 && timeUntilExpiry > 0) {
          // Refresh the session
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && refreshedSession) {
            session = refreshedSession
          }
        }
      }
    } catch (error) {
      console.error('[MIDDLEWARE] Session handling error:', error)
      // Continue without session - let auth pages handle it
    }

    // 2. Check if public route (login, reset-password, forbidden)
    if (isPublicRoute(pathname)) {
      return response
    }

    // 3. Check for legacy routes and redirect permanently
    if (isLegacyRoute(pathname)) {
      const newPath = getLegacyRedirectPath(pathname)
      if (newPath) {
        const url = new URL(newPath, request.url)
        url.search = request.nextUrl.search
        return NextResponse.redirect(url, 301)
      }
    }

    // 4. Validate session
    if (!session) {
      // Only redirect to login if not already on login page
      if (pathname !== '/login') {
        const loginUrl = new URL('/login', request.url)
        const redirectResponse = NextResponse.redirect(loginUrl)
        
        // Clear auth cookies
        const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'sb-auth-token']
        cookiesToClear.forEach(cookieName => {
          redirectResponse.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
        })
        
        return redirectResponse
      }
      // If already on login page, just continue
      return response
    }

    // 5. Get employee data and role (with optimized caching)
    let employeeData = employeeCache.get(session.user.id)
    
    if (!employeeData) {
      // Get employee record first to get role and status
      const { data: employee, error: employeeError } = await supabase
        .from('m_employees')
        .select('role, is_active')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle()
      
      if (employeeError || !employee) {
        console.error('[MIDDLEWARE] Employee fetch error for:', session.user.email)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'user_not_found')
        
        const redirectResponse = NextResponse.redirect(loginUrl)
        const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'sb-auth-token']
        cookiesToClear.forEach(cookieName => {
          redirectResponse.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
        })
        
        return redirectResponse
      }
      
      // Get role from employee data (primary source) or fallback to metadata
      const role = employee.role || 
                   session.user.user_metadata?.role
      
      if (!role) {
        console.error('[MIDDLEWARE] Role not found for user:', session.user.email)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'user_not_found')
        
        const redirectResponse = NextResponse.redirect(loginUrl)
        const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'sb-auth-token']
        cookiesToClear.forEach(cookieName => {
          redirectResponse.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
        })
        
        return redirectResponse
      }
      
      // Cache the employee data
      employeeData = {
        role: role as Role,
        is_active: employee.is_active
      }
      employeeCache.set(session.user.id, employeeData)
    }
    
    // 6. Check if employee is active
    if (!employeeData.is_active) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'inactive')
      
      const redirectResponse = NextResponse.redirect(loginUrl)
      const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'sb-auth-token']
      cookiesToClear.forEach(cookieName => {
        redirectResponse.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
      })
      
      return redirectResponse
    }
    
    // 7. Check route authorization
    if (!isRouteAllowed(pathname, employeeData.role)) {
      const forbiddenUrl = new URL('/forbidden', request.url)
      return NextResponse.redirect(forbiddenUrl)
    }
    
    // 8. Set security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error: any) {
    console.error('Middleware error:', error)
    
    // On any error, redirect to login and clear cookies
    const loginUrl = new URL('/login', request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'sb-auth-token']
    cookiesToClear.forEach(cookieName => {
      redirectResponse.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
    })
    
    return redirectResponse
  }
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/units/:path*',
    '/users/:path*',
    '/pegawai/:path*',
    '/kpi-config/:path*',
    '/pool/:path*',
    '/realization/:path*',
    '/assessment/:path*',
    '/reports/:path*',
    '/audit/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/notifications/:path*',
    // Legacy routes for redirect
    '/admin/:path*',
    '/manager/:path*',
    '/employee/:path*',
  ],
}