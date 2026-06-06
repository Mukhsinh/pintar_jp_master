import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // Get current user using getUser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get employee data
    const { data: employee } = await supabase
      .from('m_employees')
      .select('id, role, unit_id')
      .eq('user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Use optimized performance trend function
    const { data: performanceData, error } = await supabase
      .rpc('get_performance_trend', { months_back: 6 })

    if (error) {
      console.error('Error fetching performance trend:', error)
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 })
    }

    // Transform data for frontend
    const transformedData = (performanceData || []).reverse().map((item: any) => ({
      month: item.month_year,
      p1: Math.round(Number(item.p1_avg) * 10) / 10,
      p2: Math.round(Number(item.p2_avg) * 10) / 10,
      p3: Math.round(Number(item.p3_avg) * 10) / 10,
      total: Math.round(Number(item.total_avg) * 10) / 10
    }))

    const response = NextResponse.json(transformedData)

    // Add caching headers (cache for 5 minutes)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=300')

    return response
  } catch (error) {
    console.error('Performance data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
