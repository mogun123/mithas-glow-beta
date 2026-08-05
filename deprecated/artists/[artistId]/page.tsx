"use client";

import { use, useState } from "react";
import { ArtistProfileScreen } from "@/src/screens/ArtistProfileScreen";
import { useRouter, useParams } from "next/navigation";

interface PageProps {
  params: Promise<{ artistId: string }>;
}

export default function ArtistProfilePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [bookingComplete, setBookingComplete] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleBookingComplete = (bookingId: string) => {
    console.log("Booking completed:", bookingId);
    router.push(`/booking/success?bookingId=${bookingId}`);
  };

  if (bookingComplete) {
    return null;
  }

  return (
    <ArtistProfileScreen
      artistId={resolvedParams.artistId}
      onBack={handleBack}
      onBookingComplete={handleBookingComplete}
    />
  );
}
