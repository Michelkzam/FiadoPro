import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/Skeleton";

export default function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24 bg-white/20" />
            <Skeleton className="h-3 w-16 bg-white/20" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg bg-white/20" />
      </div>
      <div className="flex gap-0 border-b border-border bg-card">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-10 w-40 mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </CardContent>
        </Card>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <Skeleton className="w-14 h-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
