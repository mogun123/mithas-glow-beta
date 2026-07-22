import { Suspense } from "react"
import { AIMirrorScreen } from "@/components/ai-mirror/ai-mirror-screen"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "AI Mirror | IONTIX",
  description: "Virtual try-on and skin analysis powered by AI",
}

function AIMirrorLoading() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  )
}

export default function AIMirrorPage() {
  return (
    <Suspense fallback={<AIMirrorLoading />}>
      <AIMirrorScreen />
    </Suspense>
  )
}
