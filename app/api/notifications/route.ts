import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/services/notification.service'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ count: 0, data: [] })
    }

    // Get employee record first
    const { data: employee } = await supabase
      .from('m_employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!employee) {
      return NextResponse.json({ count: 0, data: [] })
    }

    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (unreadOnly) {
      try {
        const { count, error } = await getUnreadCount(employee.id, supabase)
        return NextResponse.json({ count: error ? 0 : count })
      } catch (error: any) {
        return NextResponse.json({ count: 0 })
      }
    }

    try {
      const { data, error } = await getNotifications(employee.id, supabase)
      return NextResponse.json(error ? [] : data)
    } catch (error: any) {
      return NextResponse.json([])
    }
  } catch (error: any) {
    // Always return safe fallback data
    return NextResponse.json({ count: 0, data: [] })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get employee record for correct user_id mapping
    const { data: employee } = await supabase
      .from('m_employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const { notificationId, markAll } = body

    if (markAll) {
      const { success, error } = await markAllAsRead(employee.id, supabase)

      if (!success) {
        return NextResponse.json({ error }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      const { success, error } = await markAsRead(notificationId, supabase)

      if (!success) {
        return NextResponse.json({ error }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
