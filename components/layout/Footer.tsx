'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Footer() {
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

        if (!error && data?.value?.text) {
          setFooterText(data.value.text)
        }
      } catch (error) {
        // Use default footer on error
        console.error('Failed to load footer:', error)
      }
    }

    loadFooter()
  }, [])

  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-4 md:px-6 text-center text-xs md:text-sm text-gray-600">
      {footerText}
    </footer>
  )
}
