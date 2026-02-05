import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ContentPlannerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards - Compact Single Row */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="py-2">
            <CardContent className="p-3 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              {/* Title */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
              </div>
              {/* Date range */}
              <Skeleton className="h-4 w-64" />
              {/* View toggle buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <Skeleton className="h-4 w-10" />
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <Skeleton key={day} className="h-4 w-8 mx-auto" />
              ))}
            </div>

            {/* Week rows - show 8 weeks */}
            {Array.from({ length: 8 }).map((_, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-8 gap-2">
                {/* Week label */}
                <Skeleton className="h-4 w-16" />

                {/* Day cells */}
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="min-h-[140px] border rounded-lg p-2 space-y-2"
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-5 w-5" />
                    </div>
                    {/* Assignment pills - vary by position for visual variety */}
                    {(weekIndex + dayIndex) % 3 === 0 && (
                      <Skeleton className="h-16 w-full rounded" />
                    )}
                    {(weekIndex + dayIndex) % 3 === 1 && (
                      <>
                        <Skeleton className="h-12 w-full rounded" />
                        <Skeleton className="h-12 w-full rounded" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
