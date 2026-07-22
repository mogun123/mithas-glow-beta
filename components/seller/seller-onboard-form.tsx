"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Store, Upload } from "lucide-react"
import { useSellerStore } from "@/stores"
import { sellerService } from "@/lib/api"
import { toast } from "sonner"

export function SellerOnboardForm() {
  const router = useRouter()
  const { setSellerProfile } = useSellerStore()

  const [formData, setFormData] = useState({
    shop_name: "",
    shop_type: "",
    shop_description: "",
    business_registration_number: "",
    gst_number: "",
    pan_number: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await sellerService.register({
        shop_name: formData.shop_name,
        shop_type: formData.shop_type,
        shop_description: formData.shop_description,
        business_registration_number: formData.business_registration_number,
        gst_number: formData.gst_number,
        pan_number: formData.pan_number,
      })

      if (response.success) {
        // Update seller to set verified = false
        await sellerService.updateProfile({ is_verified: false });
        
        // Update store
        setSellerProfile({
          user_id: response.data!.user_id,
          onboarded: true,
          verified: false,
          shop_name: response.data!.shop_name,
        })

        toast.success("Seller profile created successfully!")
        router.push("/seller/verify")
      } else {
        toast.error(response.error || "Failed to create seller profile")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push("/shop")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shop
          </Button>
          <h1 className="text-2xl font-bold">Become a Seller</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Shop Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shop_name">Shop Name *</Label>
                  <Input
                    id="shop_name"
                    value={formData.shop_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, shop_name: e.target.value }))}
                    placeholder="Enter your shop name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="shop_type">Shop Type *</Label>
                  <Select value={formData.shop_type} onValueChange={(value) => setFormData(prev => ({ ...prev, shop_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shop type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boutique">Boutique</SelectItem>
                      <SelectItem value="Jewellery">Jewellery</SelectItem>
                      <SelectItem value="Beauty / Salon">Beauty / Salon</SelectItem>
                      <SelectItem value="Fashion">Fashion</SelectItem>
                      <SelectItem value="Accessories">Accessories</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="shop_description">Shop Description</Label>
                <Textarea
                  id="shop_description"
                  value={formData.shop_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, shop_description: e.target.value }))}
                  placeholder="Describe your shop..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_registration_number">Business Registration Number</Label>
                  <Input
                    id="business_registration_number"
                    value={formData.business_registration_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_registration_number: e.target.value }))}
                    placeholder="Enter registration number"
                  />
                </div>

                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_number: e.target.value }))}
                    placeholder="Enter GST number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  value={formData.pan_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value }))}
                  placeholder="Enter PAN number"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating Profile..." : "Continue to Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}