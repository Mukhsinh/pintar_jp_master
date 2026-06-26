'use client'

import { useSettings } from '@/lib/contexts/settings-context'

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  const { settings } = useSettings()
  const footerText = settings?.footer?.text || '© 2026 JASPEL Enterprise - All Rights Reserved'

  return (
    <footer className={className || "bg-white border-t border-gray-200 py-4 px-4 md:px-6 text-center text-xs md:text-sm text-gray-600"}>
      {footerText}
    </footer>
  )
}
