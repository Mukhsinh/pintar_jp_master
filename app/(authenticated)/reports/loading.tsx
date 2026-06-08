import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <div className="md:col-span-1 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
                <div className="md:col-span-3 space-y-4">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-10 w-48" />
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-[600px] w-full" />
                </div>
            </div>
        </div>
    )
}
