import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ContentKeywordsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Stats Overview - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-16 mt-1" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <Skeleton className="h-10 w-full" />

            {/* Tier Filter */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-8" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>

            {/* Intent Filter */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-14" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3"><Skeleton className="h-4 w-20" /></th>
                  <th className="text-left p-3"><Skeleton className="h-4 w-10" /></th>
                  <th className="text-right p-3"><Skeleton className="h-4 w-24" /></th>
                  <th className="text-left p-3"><Skeleton className="h-4 w-24" /></th>
                  <th className="text-left p-3"><Skeleton className="h-4 w-14" /></th>
                  <th className="text-center p-3"><Skeleton className="h-4 w-16" /></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </td>
                    <td className="p-3"><Skeleton className="h-5 w-14" /></td>
                    <td className="p-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-14" /></td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
