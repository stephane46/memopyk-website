import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function ImageBankSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          {/* Image Preview */}
          <div className="relative aspect-video">
            <Skeleton className="w-full h-full" />
            {/* Usage badge */}
            <div className="absolute top-2 right-2">
              <Skeleton className="h-5 w-16" />
            </div>
          </div>

          {/* Image Info */}
          <CardContent className="p-3 space-y-2">
            {/* Filename */}
            <Skeleton className="h-4 w-3/4" />

            {/* Category and Size */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>

            {/* Label badges */}
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
