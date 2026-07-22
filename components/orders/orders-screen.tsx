"use client"

import { useState } from "react"
import { Package, Truck, CheckCircle, Clock, ChevronRight, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrders } from "@/hooks/use-orders"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  processing: { icon: Package, color: "text-blue-500", label: "Processing" },
  shipped: { icon: Truck, color: "text-purple-500", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "text-green-500", label: "Delivered" },
  cancelled: { icon: Clock, color: "text-red-500", label: "Cancelled" },
}

export function OrdersScreen() {
  const [activeTab, setActiveTab] = useState("all")
  const { orders, isLoading } = useOrders()

  const filteredOrders = orders?.filter((order) => {
    if (activeTab === "all") return true
    return order.status === activeTab
  })

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="all" className="flex-1">
            All
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Pending
          </TabsTrigger>
          <TabsTrigger value="shipped" className="flex-1">
            Shipped
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1">
            Delivered
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            filteredOrders?.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending
              const StatusIcon = status.icon
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Order #{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn("flex items-center gap-1", status.color, "bg-transparent")}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Order Items Preview */}
                      <div className="flex gap-2 mb-3">
                        {order.items?.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={item.product?.image || "/placeholder.svg"}
                              alt={item.product?.name || "Product"}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">+{order.items.length - 3}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{order.items?.length || 0} items</p>
                          <p className="font-semibold">INR {order.total?.toLocaleString()}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
