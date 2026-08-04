"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToastExtended } from "@/hooks/use-toast"
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface ArtistService {
  id: string
  artist_id: string
  title: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  is_active: boolean
  images: any | null
  created_at?: string
  updated_at?: string
}

interface ManageServicesProps {
  artistId: string
}

export default function ManageServices({ artistId }: ManageServicesProps) {
  const { toast, sonner } = useToastExtended()
  const [services, setServices] = useState<ArtistService[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<ArtistService | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    duration_minutes: "",
    category: "",
    is_active: true,
  })

  // Fetch services
  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error: queryError } = await supabase
        .from("artist_services")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false })

      if (queryError) throw queryError
      setServices(data || [])
    } catch (err: any) {
      console.error("Failed to fetch services:", err.message)
      sonner?.error("Failed to load services", err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (artistId) {
      fetchServices()
    }
  }, [artistId])

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      duration_minutes: "",
      category: "",
      is_active: true,
    })
    setEditingService(null)
  }

  // Open dialog for adding new service
  const handleAddService = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Open dialog for editing service
  const handleEditService = (service: ArtistService) => {
    setEditingService(service)
    setFormData({
      title: service.title,
      description: service.description || "",
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
      category: service.category || "",
      is_active: service.is_active,
    })
    setIsDialogOpen(true)
  }

  // Submit form (add or update)
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      sonner?.error("Validation Error", "Service name is required")
      return
    }
    if (!formData.price || Number.parseFloat(formData.price) <= 0) {
      sonner?.error("Validation Error", "Please enter a valid price")
      return
    }
    if (!formData.duration_minutes || Number.parseInt(formData.duration_minutes) <= 0) {
      sonner?.error("Validation Error", "Please enter a valid duration")
      return
    }

    try {
      setIsSubmitting(true)

      const serviceData = {
        artist_id: artistId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: Number.parseFloat(formData.price),
        duration_minutes: Number.parseInt(formData.duration_minutes),
        category: formData.category.trim() || null,
        is_active: formData.is_active,
      }

      let error: any

      if (editingService) {
        // Update existing service
        const { error: updateError } = await supabase
          .from("artist_services")
          .update({
            ...serviceData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingService.id)

        error = updateError

        if (!error) {
          sonner?.success("Service Updated", `${formData.title} has been updated successfully`)
        }
      } else {
        // Add new service
        const { error: insertError } = await supabase.from("artist_services").insert(serviceData)

        error = insertError

        if (!error) {
          sonner?.success("Service Added", `${formData.title} has been added successfully`)
        }
      }

      if (error) throw error

      setIsDialogOpen(false)
      resetForm()
      fetchServices()
    } catch (err: any) {
      console.error("Failed to save service:", err.message)
      sonner?.error("Save Failed", err.message || "Failed to save service")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete service
  const handleDeleteClick = (serviceId: string) => {
    setServiceToDelete(serviceId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return

    try {
      setIsSubmitting(true)
      const { error } = await supabase.from("artist_services").delete().eq("id", serviceToDelete)

      if (error) throw error

      sonner?.success("Service Deleted", "The service has been removed successfully")
      setIsDeleteDialogOpen(false)
      setServiceToDelete(null)
      fetchServices()
    } catch (err: any) {
      console.error("Failed to delete service:", err.message)
      sonner?.error("Delete Failed", err.message || "Failed to delete service")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle service status
  const handleToggleStatus = async (service: ArtistService) => {
    try {
      const { error } = await supabase
        .from("artist_services")
        .update({
          is_active: !service.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", service.id)

      if (error) throw error

      sonner?.success(
        "Status Updated",
        `Service ${!service.is_active ? "activated" : "deactivated"} successfully`
      )
      fetchServices()
    } catch (err: any) {
      console.error("Failed to toggle status:", err.message)
      sonner?.error("Update Failed", "Failed to update service status")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manage Services</h2>
          <p className="text-sm text-muted-foreground">Create and manage your professional services</p>
        </div>
        <Button onClick={handleAddService} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Services List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your first service</p>
              <Button onClick={handleAddService} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className="relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  service.is_active ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <CardHeader className="pb-3 pl-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    {service.category && (
                      <Badge variant="secondary" className="mt-1">
                        {service.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-4 space-y-4">
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <DollarSign className="h-4 w-4" />
                    ₹{service.price.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {service.duration_minutes >= 60
                      ? `${Math.floor(service.duration_minutes / 60)}h ${service.duration_minutes % 60}m`
                      : `${service.duration_minutes}m`}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`status-${service.id}`} className="text-xs cursor-pointer">
                      Toggle Status
                    </Label>
                    <Switch
                      id={`status-${service.id}`}
                      checked={service.is_active}
                      onCheckedChange={() => handleToggleStatus(service)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditService(service)}
                      className="h-8 px-2"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(service.id)}
                      className="h-8 px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update your service details below."
                : "Fill in the details to create a new service."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Service Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Bridal Makeup, Reception Look"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what's included in this service..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Bridal, Party, Editorial"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="font-medium">
                  Service Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.is_active ? "Visible to customers" : "Hidden from customers"}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingService ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>{editingService ? "Update Service" : "Add Service"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
