"use client";

import { BookingScreen } from "@/src/screens/BookingScreen";
import { useRouter } from "next/navigation";

export default function BookingPage() {
  const router = useRouter();

  return (
    <BookingScreen
      onNavigateToMirror={() => router.push("/ai-mirror")}
      onNavigateToProfile={() => router.push("/profile")}
      onNavigateHome={() => router.push("/")}
    />
  );
}
