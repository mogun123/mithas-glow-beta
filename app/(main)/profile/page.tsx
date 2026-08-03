import { Suspense } from "react"
import { ProfileScreen } from "@/components/profile/profile-screen"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Profile | IONTIX",
  description: "Your profile and account settings",
}

function ProfileLoading() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileScreen />
    </Suspense>
  )
}
