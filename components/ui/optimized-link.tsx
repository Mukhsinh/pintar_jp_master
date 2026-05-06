'use client'

import Link from 'next/link'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedLinkProps extends React.ComponentProps<typeof Link> {
  className?: string
  children: React.ReactNode
  prefetch?: boolean
}

/**
 * OptimizedLink component - Next.js Link wrapper dengan prefetch optimization
 * Menggunakan prefetch by default untuk meningkatkan navigation speed
 */
const OptimizedLink = forwardRef<HTMLAnchorElement, OptimizedLinkProps>(
  ({ className, children, prefetch = true, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        prefetch={prefetch}
        className={cn(className)}
        {...props}
      >
        {children}
      </Link>
    )
  }
)

OptimizedLink.displayName = 'OptimizedLink'

export { OptimizedLink }