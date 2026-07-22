"use client"

/**
 * Visual Search Screen
 * Computer vision-powered product discovery
 */

import { useState, useRef, useCallback } from "react"
import { Camera, Upload, Search, Image as ImageIcon, Palette, Sparkles, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useVisualSearch } from "@/hooks/useVisualSearch"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useTranslation } from "react-i18next"

export function VisualSearchScreen() {
  const { t } = useTranslation()
  const { searchSimilarProducts, searchByColor, clearResults, isSearching, results, searchHistory } = useVisualSearch()
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'image' | 'color'>('image')
  const [selectedColor, setSelectedColor] = useState('#C41E3A')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    // Display uploaded image
    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Perform visual search
    await searchSimilarProducts(file)
  }, [searchSimilarProducts])

  // Handle camera capture
  const handleCameraCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })

      // Create video element
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Create canvas for capture
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')

      // Wait for video to load
      setTimeout(() => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Convert to blob and search
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
              setUploadedImage(canvas.toDataURL())
              await searchSimilarProducts(file)
            }
          }, 'image/jpeg', 0.8)
        }

        // Stop camera
        stream.getTracks().forEach(track => track.stop())
      }, 1000)

    } catch (error) {
      console.error('Camera error:', error)
      alert('Camera access denied or not available')
    }
  }, [searchSimilarProducts])

  // Handle color search
  const handleColorSearch = useCallback(async () => {
    await searchByColor(selectedColor)
  }, [searchByColor, selectedColor])

  // Clear search
  const handleClear = useCallback(() => {
    setUploadedImage(null)
    clearResults()
  }, [clearResults])

  // Popular colors for quick selection
  const popularColors = [
    { name: 'Ruby Red', hex: '#C41E3A' },
    { name: 'Nude Pink', hex: '#E8B4B8' },
    { name: 'Navy Blue', hex: '#000080' },
    { name: 'Forest Green', hex: '#228B22' },
    { name: 'Royal Purple', hex: '#7851A9' },
    { name: 'Golden', hex: '#FFD700' },
    { name: 'Coral', hex: '#FF7F50' },
    { name: 'Chocolate', hex: '#D2691E' }
  ]

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Visual Search 🔍</h1>
        <p className="text-muted-foreground">Find products with AI-powered visual recognition</p>
      </div>

      {/* Search Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={searchMode === 'image' ? 'default' : 'outline'}
              onClick={() => setSearchMode('image')}
              className="flex items-center gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Image Search
            </Button>
            <Button
              variant={searchMode === 'color' ? 'default' : 'outline'}
              onClick={() => setSearchMode('color')}
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              Color Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Search Mode */}
      {searchMode === 'image' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload or Capture Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Uploaded Image Preview */}
            {uploadedImage && (
              <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <Image src={uploadedImage} alt="Uploaded" fill className="object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload Controls */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSearching}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Image
              </Button>
              <Button
                variant="outline"
                onClick={handleCameraCapture}
                disabled={isSearching}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Color Search Mode */}
      {searchMode === 'color' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Select Color
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Picker */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Choose Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-16 h-16 rounded cursor-pointer"
                  />
                  <div>
                    <div className="font-mono text-sm">{selectedColor}</div>
                    <div className="text-xs text-muted-foreground">Click to change</div>
                  </div>
                </div>
              </div>
              <Button onClick={handleColorSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Popular Colors */}
            <div>
              <label className="text-sm font-medium">Popular Colors</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {popularColors.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedColor(color.hex)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                      selectedColor === color.hex ? "border-primary bg-primary/5" : "border-transparent"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-muted"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isSearching && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="font-medium">Analyzing image...</div>
                <Progress value={66} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Found {results.length} Similar Products</span>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {results.map((product) => (
                <div key={product.id} className="flex gap-4 p-3 border rounded-lg">
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold">${product.price}</span>
                      <Badge variant="secondary">
                        {product.similarity.toFixed(1)}% match
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button size="sm">View</Button>
                    <Button variant="outline" size="sm">Add to Cart</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!uploadedImage && results.length === 0 && !isSearching && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Start Visual Search</h3>
              <p className="text-sm text-muted-foreground">
                Upload an image or select a color to find similar products
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
