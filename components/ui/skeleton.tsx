import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/80 to-muted',
        className
      )}
      {...props}
    />
  )
}

function ProductCardSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <Skeleton className="aspect-square rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  )
}

function CartItemSkeleton() {
  return (
    <div className="flex gap-6 rounded-lg border p-6">
      <Skeleton className="h-24 w-24 rounded-lg shrink-0" />
      <div className="flex-1 space-y-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-10 py-10">
      <div className="space-y-5">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="flex gap-3">
          {Array(4).fill(null).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function PageHeaderSkeleton() {
  return (
    <div className="space-y-4 py-8">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export { Skeleton, ProductCardSkeleton, CartItemSkeleton, ProductDetailSkeleton, PageHeaderSkeleton }
