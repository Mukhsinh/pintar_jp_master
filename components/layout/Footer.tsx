'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  const [footerText, setFooterText] = useState('© 2026 JASPEL Enterprise - All Rights Reserved')

  useEffect(() => {
    const loadFooter = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('t_settings')
          .select('value')
          .eq('key', 'footer')
          .maybeSingle()

        if (error) {
          console.error('Error fetching footer:', error)
          return
        }

        if (data?.value) {
          if (typeof data.value === 'string') {
            setFooterText(data.value)
          } else if (data.value && typeof data.value === 'object' && 'text' in data.value) {
            setFooterText((data.value as any).text)
          }
        }
      } catch (error) {
        console.error('Failed to load footer:', error)
      }
    }

    loadFooter()
  }, [])

  return (
    <footer className={className || "bg-white border-t border-gray-200 py-4 px-4 md:px-6 text-center text-xs md:text-sm text-gray-600"}>
      {footerText}
    </footer>
  )
}
