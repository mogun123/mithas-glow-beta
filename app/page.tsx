/**
 * Home Page
 * MITHAS GLOW Landing
 * Uses FastAPI backend for data fetching
 */

import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, ShoppingBag, Camera, MessageCircle, Play, ChevronRight } from "lucide-react"
import { serverProducts } from "@/lib/services/fastapi"

function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

async function FeaturedProducts() {
  const response = await serverProducts.featured(8)
  const products = response.data || []

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No featured products yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((product: any) => (
        <Link key={product.id} href={`/shop/product/${product.id}`} className="group">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            {product.images?.[0] && (
              <img
                src={product.images[0] || "/placeholder.svg"}
                alt={product.name}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            )}
            {product.original_price && product.original_price > product.price && (
              <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1">
            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {product.currency || "INR"} {product.price}
              </span>
              {product.original_price && (
                <span className="text-muted-foreground text-sm line-through">{product.original_price}</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default async function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5" />
        <div className="container px-4 py-20 text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 hover:bg-primary/15 transition-colors">
            <Sparkles className="w-4 h-4" />
            AI-Powered Beauty Experience
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance">
            Discover Your
            <span className="text-primary block md:inline"> Perfect Glow</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Personalized beauty recommendations, AR try-on, and curated fashion from verified sellers. Your beauty
            journey starts here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 font-semibold rounded-lg" asChild>
              <Link href="/shop">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Start Shopping
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold rounded-lg border-2" asChild>
              <Link href="/mirror">
                <Camera className="w-5 h-5 mr-2" />
                Try AI Mirror
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                icon: Camera,
                title: "AI Skin Analysis",
                description: "Get personalized recommendations",
                href: "/mirror",
                color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
              },
              {
                icon: Sparkles,
                title: "AR Try-On",
                description: "Virtual makeup experience",
                href: "/mirror",
                color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
              },
              {
                icon: Play,
                title: "Beauty Reels",
                description: "Trending tutorials & tips",
                href: "/reels",
                color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
              },
              {
                icon: MessageCircle,
                title: "AI Stylist",
                description: "Chat with your beauty expert",
                href: "/chat",
                color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
              },
            ].map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md hover:bg-card/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2 text-sm md:text-base group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-1">Featured Products</h2>
              <p className="text-muted-foreground font-medium">Curated picks just for you</p>
            </div>
            <Button variant="ghost" className="group" asChild>
              <Link href="/shop" className="flex items-center gap-1">
                View All
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          <Suspense
            fallback={
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <FeaturedProducts />
          </Suspense>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Shop by Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
            {[
              { name: "Skincare", image: "/skincare-products-display.png", slug: "skincare" },
              { name: "Makeup", image: "/makeup-cosmetics-flatlay.png", slug: "makeup" },
              { name: "Haircare", image: "/haircare-products.jpg", slug: "haircare" },
              { name: "Fashion", image: "/diverse-fashion-collection.png", slug: "fashion" },
              { name: "Jewelry", image: "/assorted-jewelry.png", slug: "jewelry" },
              { name: "Fragrances", image: "/perfume-fragrance.jpg", slug: "fragrances" },
            ].map((category) => (
              <Link key={category.slug} href={`/shop?category=${category.slug}`} className="group text-center">
                <div className="aspect-square rounded-2xl overflow-hidden bg-muted mb-4 mx-auto w-20 md:w-24 group-hover:ring-2 ring-primary ring-offset-2 transition-all duration-300 group-hover:shadow-lg">
                  <img
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <div className="container px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-primary-foreground/90 max-w-xl mx-auto mb-10 text-lg">
            Join thousands of sellers on MITHAS GLOW and reach millions of beauty enthusiasts.
          </p>
          <Button size="lg" variant="secondary" className="h-12 px-8 font-semibold rounded-lg hover:shadow-lg" asChild>
            <Link href="/become-seller">Become a Seller</Link>
          </Button>
        </div>
      </section>

      {/* Bottom Navigation Spacer for Mobile */}
      <div className="h-20 md:hidden" />
    </main>
  )
}
