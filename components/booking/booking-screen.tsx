"use client"

import { useState } from "react"
import { MapPin, Calendar, Clock, Star, ChevronRight, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNearbySalons, useBookingSlots, useCreateBooking } from "@/hooks/use-booking"
import { useNearbyStores } from "@/hooks/use-geo"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import Image from "next/image"

interface Salon {
  id: string
  name: string
  address: string
  rating: number
  reviewCount: number
  distance: string
  image: string
  services: { id: string; name: string; price: number; duration: number }[]
}

export function BookingScreen() {
  const [step, setStep] = useState<"browse" | "salon" | "slots" | "confirm">("browse")
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const { salons, isLoading: salonsLoading } = useNearbySalons()
  const { stores, isLoading: storesLoading } = useNearbyStores()
  const { slots, isLoading: slotsLoading } = useBookingSlots(selectedSalon?.id || "", selectedDate.toISOString())
  const { book, isBooking } = useCreateBooking()

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  const handleSelectSalon = (salon: Salon) => {
    setSelectedSalon(salon)
    setStep("salon")
  }

  const handleSelectService = (serviceId: string) => {
    setSelectedService(serviceId)
    setStep("slots")
  }

  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot)
    setStep("confirm")
  }

  const handleConfirmBooking = async () => {
    if (!selectedSalon || !selectedService || !selectedSlot) return
    await book({
      salonId: selectedSalon.id,
      serviceId: selectedService,
      date: selectedDate.toISOString(),
      time: selectedSlot,
    })
    // Reset and show success
    setStep("browse")
    setSelectedSalon(null)
    setSelectedService(null)
    setSelectedSlot(null)
  }

  // Mock salons data for UI
  const mockSalons: Salon[] = [
    {
      id: "1",
      name: "Glamour Studio",
      address: "123 Fashion St, Mumbai",
      rating: 4.8,
      reviewCount: 256,
      distance: "0.5 km",
      image: "/luxury-salon-interior.png",
      services: [
        { id: "s1", name: "Haircut & Styling", price: 500, duration: 45 },
        { id: "s2", name: "Hair Color", price: 2000, duration: 120 },
        { id: "s3", name: "Facial Treatment", price: 1500, duration: 60 },
        { id: "s4", name: "Manicure & Pedicure", price: 800, duration: 90 },
      ],
    },
    {
      id: "2",
      name: "Beauty Bliss",
      address: "45 Park Lane, Mumbai",
      rating: 4.6,
      reviewCount: 189,
      distance: "1.2 km",
      image: "/modern-beauty-salon.png",
      services: [
        { id: "s5", name: "Bridal Makeup", price: 15000, duration: 180 },
        { id: "s6", name: "Party Makeup", price: 3000, duration: 60 },
      ],
    },
  ]

  const displaySalons = salons?.length ? salons : mockSalons

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Appointment</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Nearby salons & services
          </p>
        </div>
      </div>

      {step === "browse" && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search salons, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="salons">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="salons">Salons</TabsTrigger>
              <TabsTrigger value="stores">Beauty Stores</TabsTrigger>
            </TabsList>

            <TabsContent value="salons" className="space-y-4 mt-4">
              {salonsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                displaySalons.map((salon) => (
                  <Card
                    key={salon.id}
                    className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectSalon(salon)}
                  >
                    <CardContent className="p-0">
                      <div className="flex gap-3">
                        <div className="relative w-24 h-24 shrink-0">
                          <Image
                            src={salon.image || "/placeholder.svg"}
                            alt={salon.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 py-3 pr-3">
                          <h3 className="font-semibold">{salon.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{salon.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{salon.rating}</span>
                              <span className="text-xs text-muted-foreground">({salon.reviewCount})</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {salon.distance}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center mr-3" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="stores" className="space-y-4 mt-4">
              {storesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : stores?.length ? (
                stores.map((store) => (
                  <Card key={store.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{store.name}</h3>
                      <p className="text-sm text-muted-foreground">{store.address}</p>
                      <Badge variant="secondary" className="mt-2">
                        {store.distance}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No stores found nearby</p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {step === "salon" && selectedSalon && (
        <>
          <Button variant="ghost" onClick={() => setStep("browse")} className="mb-2">
            Back to Browse
          </Button>

          <Card className="overflow-hidden">
            <div className="relative h-40">
              <Image
                src={selectedSalon.image || "/placeholder.svg"}
                alt={selectedSalon.name}
                fill
                className="object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h2 className="text-xl font-bold">{selectedSalon.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedSalon.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{selectedSalon.rating}</span>
                <span className="text-muted-foreground">({selectedSalon.reviewCount} reviews)</span>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-3">Select Service</h3>
            <div className="space-y-2">
              {selectedSalon.services.map((service) => (
                <Card
                  key={service.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedService === service.id ? "ring-2 ring-primary" : "hover:bg-muted/50",
                  )}
                  onClick={() => handleSelectService(service.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.duration} mins</p>
                    </div>
                    <p className="font-semibold text-primary">INR {service.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {step === "slots" && selectedSalon && (
        <>
          <Button variant="ghost" onClick={() => setStep("salon")} className="mb-2">
            Back to Services
          </Button>

          {/* Date Selection */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex flex-col items-center px-4 py-2 rounded-lg border-2 min-w-[60px] transition-all",
                    selectedDate.toDateString() === date.toDateString()
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted",
                  )}
                >
                  <span className="text-xs text-muted-foreground">{format(date, "EEE")}</span>
                  <span className="font-semibold">{format(date, "d")}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Available Slots
            </h3>
            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(slots?.length ? slots : ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]).map(
                  (slot) => (
                    <Button
                      key={slot}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {slot}
                    </Button>
                  ),
                )}
              </div>
            )}
          </div>
        </>
      )}

      {step === "confirm" && selectedSalon && selectedService && selectedSlot && (
        <>
          <Button variant="ghost" onClick={() => setStep("slots")} className="mb-2">
            Back to Slots
          </Button>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">Booking Summary</h3>

              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedSalon.image || "/placeholder.svg"} />
                  <AvatarFallback>{selectedSalon.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedSalon.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSalon.address}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">
                    {selectedSalon.services.find((s) => s.id === selectedService)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{format(selectedDate, "EEEE, MMM d")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedSlot}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-primary">
                    INR {selectedSalon.services.find((s) => s.id === selectedService)?.price}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleConfirmBooking} disabled={isBooking} className="w-full">
            {isBooking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Confirm Booking
          </Button>
        </>
      )}
    </div>
  )
}
