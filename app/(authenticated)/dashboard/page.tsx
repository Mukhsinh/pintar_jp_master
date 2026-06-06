import { DashboardContent } from './DashboardContent'
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ unit_id?: string, period?: string, year?: string }> }) {
  const params = await searchParams;
  return <DashboardContent
    unitId={params.unit_id}
    period={params.period}
    year={params.year}
  />
}
