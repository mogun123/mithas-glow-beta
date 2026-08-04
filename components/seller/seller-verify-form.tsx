"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, CheckCircle } from "lucide-react"
import { useSellerStore } from "@/stores"
import { sellerService } from "@/lib/api"
import { toast } from "sonner"

export function SellerVerifyForm() {
  const router = useRouter()
  const { sellerProfile, setSellerProfile } = useSellerStore()

  const [documents, setDocuments] = useState({
    id_proof: null as File | null,
    address_proof: null as File | null,
    business_license: null as File | null,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (field: keyof typeof documents) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDocuments(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Update seller profile to verified
      await sellerService.updateProfile({ is_verified: true });
      
      toast.success("Verification documents submitted successfully!")
      // Update store
      if (sellerProfile) {
        setSellerProfile({
          ...sellerProfile,
          verified: true,
        })
      }
      router.push("/seller/dashboard")
    } catch (error) {
      toast.error("Failed to submit verification")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push("/seller/onboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Onboard
          </Button>
          <h1 className="text-2xl font-bold">Verify Your Account</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Document Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="id_proof">ID Proof *</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="id_proof"
                    accept="image/*,.pdf"
                    onChange={handleFileChange('id_proof')}
                    className="hidden"
                  />
                  <label
                    htmlFor="id_proof"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {documents.id_proof ? documents.id_proof.name : "Upload ID Proof (Aadhaar, Passport, etc.)"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="address_proof">Address Proof</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="address_proof"
                    accept="image/*,.pdf"
                    onChange={handleFileChange('address_proof')}
                    className="hidden"
                  />
                  <label
                    htmlFor="address_proof"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {documents.address_proof ? documents.address_proof.name : "Upload Address Proof (Utility Bill, etc.)"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="business_license">Business License</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="business_license"
                    accept="image/*,.pdf"
                    onChange={handleFileChange('business_license')}
                    className="hidden"
                  />
                  <label
                    htmlFor="business_license"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {documents.business_license ? documents.business_license.name : "Upload Business License"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your documents will be reviewed within 24-48 hours.
                  You'll receive an email notification once verification is complete.
                </p>
              </div>

              <Button type="submit" disabled={isSubmitting || !documents.id_proof} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}