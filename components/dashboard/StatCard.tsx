'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Building2, 
  TrendingUp, 
  CheckCircle, 
  Award, 
  Target, 
  Activity 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { memo } from 'react'

const iconMap = {
  Users,
  Building2,
  TrendingUp,
  CheckCircle,
  Award,
  Target,
  Activity
}

type IconName = keyof typeof iconMap

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  iconName: IconName
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export const StatCard = memo(function StatCard({ 
  title, 
  value, 
  description, 
  iconName, 
  trend, 
  className 
}: StatCardProps) {
  const Icon = iconMap[iconName]
  
  return (
    <Card className={cn('hover:shadow-lg hover:border-blue-200 transition-all duration-300 border border-gray-100 bg-gradient-to-br from-white to-gray-50', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</CardTitle>
        <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-black text-gray-900">{value}</div>
        {description && (
          <p className="text-sm text-gray-500 font-medium">{description}</p>
        )}
        {trend && trend.value !== 0 && (
          <div className={cn(
            'text-xs font-bold mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            trend.isPositive 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          )}>
            <span className="text-lg">{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-gray-500 text-xs">bulan lalu</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
