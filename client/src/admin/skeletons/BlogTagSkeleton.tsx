import { Skeleton } from '@/components/ui/skeleton';

export function BlogTagSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-2">
            {/* Tag badge placeholder */}
            <Skeleton className="h-5 w-24 rounded-full" />
            {/* Action buttons */}
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          {/* Post count */}
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
