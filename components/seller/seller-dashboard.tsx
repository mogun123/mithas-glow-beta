"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Plus,
  Settings,
  BarChart3,
  Users,
  Loader2,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSellerDashboard, useSellerProducts, useAddProduct } from "@/hooks/use-seller"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"

const statCards = [
  { key: "totalSales", label: "Total Sales", icon: DollarSign, format: "currency" },
  { key: "totalOrders", label: "Orders", icon: ShoppingCart, format: "number" },
  { key: "totalProducts", label: "Products", icon: Package, format: "number" },
  { key: "totalViews", label: "Store Views", icon: Eye, format: "number" },
]

export function SellerDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [addProductOpen, setAddProductOpen] = useState(false)
  const { dashboard, isLoading } = useSellerDashboard()
  const { products, isLoading: productsLoading } = useSellerProducts()
  const { addProduct, isAdding } = useAddProduct()

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
  })

  const handleAddProduct = async () => {
    await addProduct({
      name: newProduct.name,
      description: newProduct.description,
      price: Number.parseFloat(newProduct.price),
      category: newProduct.category,
      stock: Number.parseInt(newProduct.stock),
    })
    setAddProductOpen(false)
    setNewProduct({ name: "", description: "", price: "", category: "", stock: "" })
  }

  const stats = dashboard || {
    totalSales: 125000,
    totalOrders: 48,
    totalProducts: 24,
    totalViews: 1250,
    recentOrders: [],
    topProducts: [],
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.push('/shop')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage your store and products</p>
          </div>
        </div>
        <Link href="/seller/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat) => {
          const value = stats[stat.key as keyof typeof stats]
          const displayValue =
            stat.format === "currency" ? `INR ${(value as number)?.toLocaleString()}` : value?.toLocaleString()

          return (
            <Card key={stat.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <stat.icon className="h-4 w-4" />
                  <span className="text-xs">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? "-" : displayValue}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Sales Chart Placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Sales This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-end justify-between gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                  const height = [40, 65, 45, 80, 55, 90, 70][i]
                  return (
                    <div key={day} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="w-full bg-primary/20 rounded-t relative overflow-hidden"
                        style={{ height: `${height}%` }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-primary"
                          style={{ height: `${height * 0.7}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{day}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats.topProducts?.length ? stats.topProducts : mockTopProducts).map((product, i) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-4">{i + 1}</span>
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted">
                    <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                  </div>
                  <p className="text-sm font-medium">INR {product.revenue?.toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Customers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recent Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-background" />
                ))}
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +12
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4 mt-4">
          {/* Add Product Dialog */}
          <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Fill in the details to add a new product to your store.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Product description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (INR)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newProduct.category}
                    onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skincare">Skincare</SelectItem>
                      <SelectItem value="makeup">Makeup</SelectItem>
                      <SelectItem value="haircare">Haircare</SelectItem>
                      <SelectItem value="fragrance">Fragrance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProduct} disabled={isAdding} className="w-full">
                  {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Products List */}
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {(products?.length ? products : mockProducts).map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                        <Image
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-sm text-primary font-semibold">INR {product.price?.toLocaleString()}</p>
                          </div>
                          <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 mt-4">
          {(stats.recentOrders?.length ? stats.recentOrders : mockOrders).map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      order.status === "delivered" && "text-green-500",
                      order.status === "shipped" && "text-purple-500",
                      order.status === "pending" && "text-yellow-500",
                      "bg-transparent",
                    )}
                  >
                    {order.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {format(new Date(order.created_at), "MMM d, yyyy - h:mm a")}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{order.items} items</p>
                  <p className="font-semibold">INR {order.total?.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Mock data for UI display
const mockTopProducts = [
  { id: "1", name: "Vitamin C Serum", image: "/vitamin-c-serum.png", sold: 145, revenue: 72500 },
  { id: "2", name: "Matte Lipstick Set", image: "/lipstick-set.png", sold: 98, revenue: 49000 },
  { id: "3", name: "Hydrating Face Cream", image: "/face-cream-display.png", sold: 76, revenue: 38000 },
]

const mockProducts = [
  { id: "1", name: "Vitamin C Serum", price: 500, stock: 45, image: "/vitamin-c-serum.png" },
  { id: "2", name: "Matte Lipstick Set", price: 500, stock: 23, image: "/lipstick-set.png" },
  { id: "3", name: "Hydrating Face Cream", price: 500, stock: 0, image: "/face-cream-display.png" },
]

const mockOrders = [
  { id: "ord-123456", status: "delivered", created_at: new Date().toISOString(), items: 3, total: 2500 },
  {
    id: "ord-123457",
    status: "shipped",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: 2,
    total: 1800,
  },
  {
    id: "ord-123458",
    status: "pending",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    items: 5,
    total: 4200,
  },
]
