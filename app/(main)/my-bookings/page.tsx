"use client";

import { MyBookingsScreen } from "@/src/screens/MyBookingsScreen";
import { useRouter } from "next/navigation";

export default function MyBookingsPage() {
  const router = useRouter();
  
  // In production, get this from auth context
  const userId = "current-user-id";

  const handleNavigateToArtistProfile = (artistId: string) => {
    router.push(`/artists/${artistId}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <MyBookingsScreen
      userId={userId}
      onNavigateToArtistProfile={handleNavigateToArtistProfile}
      onBack={handleBack}
    />
  );
}
