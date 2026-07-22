import type React from "react"
import type { Metadata, Viewport } from "next"
import { Poppins, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"
import { Providers } from "./providers"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "MITHAS GLOW - Beauty & Fashion Marketplace",
    template: "%s | MITHAS GLOW",
  },
  description:
    "Discover AI-powered beauty recommendations, AR try-on, and shop from verified sellers. Your personalized beauty and fashion destination.",
  keywords: ["beauty", "fashion", "cosmetics", "skincare", "AI recommendations", "AR try-on", "marketplace"],
  authors: [{ name: "MITHAS GLOW" }],
  creator: "MITHAS GLOW",
  publisher: "MITHAS GLOW",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://mithasglow.com",
    siteName: "MITHAS GLOW",
    title: "MITHAS GLOW - Beauty & Fashion Marketplace",
    description: "AI-powered beauty recommendations and AR try-on experience",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MITHAS GLOW",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MITHAS GLOW",
    description: "AI-powered beauty recommendations and AR try-on experience",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E91E63" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
