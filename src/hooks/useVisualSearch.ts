"use client"

/**
 * Visual Search Hook
 * Computer vision-based product search using TensorFlow.js
 */

import { useState, useCallback } from "react"
import * as tf from "@tensorflow/tfjs"
import { toast } from "sonner"

interface VisualSearchResult {
  id: string
  name: string
  category: string
  similarity: number
  imageUrl: string
  price: number
  features: {
    color: string[]
    shape: string
    texture: string
  }
}

export function useVisualSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<VisualSearchResult[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Extract visual features from image
  const extractFeatures = async (imageElement: HTMLImageElement) => {
    // Convert image to tensor
    const tensor = tf.browser.fromPixels(imageElement)
    const resized = tf.image.resizeBilinear(tensor, [224, 224])
    const normalized = resized.div(255.0)
    
    // Extract color features
    const mean = normalized.mean([0, 1]) // RGB mean
    const std = normalized.sub(normalized.mean()).square().mean().sqrt() // Color variation
    
    // Extract texture features (edge detection)
    const edges = tf.image.sobelEdges(normalized)
    const edgeIntensity = edges.mean()
    
    // Extract shape features (contour detection)
    const grayscale = normalized.mean(2) // Convert to grayscale
    const binary = grayscale.greater(0.5) // Simple threshold
    const shapeFeatures = binary.sum()
    
    const features = {
      color: await mean.array(),
      texture: await std.array(),
      shape: await shapeFeatures.array(),
      edges: await edgeIntensity.array()
    }
    
    // Clean up tensors
    tensor.dispose()
    resized.dispose()
    normalized.dispose()
    mean.dispose()
    std.dispose()
    edges.dispose()
    edgeIntensity.dispose()
    grayscale.dispose()
    binary.dispose()
    shapeFeatures.dispose()
    
    return features
  }

  // Calculate similarity between two feature sets
  const calculateSimilarity = (features1: any, features2: any) => {
    // Color similarity (Euclidean distance)
    const colorDistance = Math.sqrt(
      Math.pow(features1.color[0] - features2.color[0], 2) +
      Math.pow(features1.color[1] - features2.color[1], 2) +
      Math.pow(features1.color[2] - features2.color[2], 2)
    )
    
    // Texture similarity
    const textureSimilarity = 1 - Math.abs(features1.texture - features2.texture)
    
    // Shape similarity
    const shapeSimilarity = 1 - Math.abs(features1.shape - features2.shape) / 1000
    
    // Combined similarity score
    const similarity = (1 - colorDistance / 3) * 0.4 + textureSimilarity * 0.3 + shapeSimilarity * 0.3
    
    return Math.max(0, Math.min(1, similarity))
  }

  // Mock product database (in real app, this would come from API)
  const mockProductDatabase = [
    {
      id: "prod-001",
      name: "Ruby Red Lipstick",
      category: "lipstick",
      imageUrl: "/products/ruby-red.jpg",
      price: 29.99,
      features: {
        color: [0.77, 0.12, 0.23], // RGB normalized
        shape: "cylindrical",
        texture: "matte"
      }
    },
    {
      id: "prod-002", 
      name: "Nude Pink Gloss",
      category: "lipstick",
      imageUrl: "/products/nude-pink.jpg",
      price: 24.99,
      features: {
        color: [0.91, 0.71, 0.72],
        shape: "cylindrical", 
        texture: "glossy"
      }
    },
    {
      id: "prod-003",
      name: "Smoky Eyeshadow",
      category: "eyeshadow",
      imageUrl: "/products/smoky.jpg", 
      price: 19.99,
      features: {
        color: [0.21, 0.27, 0.33],
        shape: "compact",
        texture: "powdery"
      }
    },
    {
      id: "prod-004",
      name: "Golden Shimmer",
      category: "eyeshadow",
      imageUrl: "/products/golden.jpg",
      price: 22.99,
      features: {
        color: [1.0, 0.84, 0.0],
        shape: "compact",
        texture: "shimmery"
      }
    }
  ]

  // Search for similar products
  const searchSimilarProducts = useCallback(async (file: File) => {
    setIsSearching(true)
    
    try {
      // Load and analyze the uploaded image
      const imageUrl = URL.createObjectURL(file)
      const img = new Image()
      
      const features = await new Promise<any>((resolve, reject) => {
        img.onload = async () => {
          try {
            const extractedFeatures = await extractFeatures(img)
            URL.revokeObjectURL(imageUrl)
            resolve(extractedFeatures)
          } catch (error) {
            reject(error)
          }
        }
        img.onerror = reject
        img.src = imageUrl
      })

      // Calculate similarity with all products
      const searchResults = mockProductDatabase.map(product => {
        const similarity = calculateSimilarity(features, product.features)
        return {
          ...product,
          similarity: similarity * 100 // Convert to percentage
        }
      })

      // Sort by similarity and filter results above threshold
      const filteredResults = searchResults
        .filter(result => result.similarity > 30) // 30% similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10) // Top 10 results

      setResults(filteredResults)
      
      // Add to search history
      setSearchHistory(prev => [file.name, ...prev.slice(0, 4)])
      
      toast.success(`Found ${filteredResults.length} similar products`)
      
    } catch (error) {
      console.error('Visual search error:', error)
      toast.error('Failed to analyze image')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Search by color (simplified)
  const searchByColor = useCallback(async (color: string) => {
    setIsSearching(true)
    
    try {
      // Convert hex color to RGB
      const hex = color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16) / 255
      const g = parseInt(hex.substring(2, 4), 16) / 255
      const b = parseInt(hex.substring(4, 6), 16) / 255
      
      const searchResults = mockProductDatabase.map(product => {
        const colorDistance = Math.sqrt(
          Math.pow(product.features.color[0] - r, 2) +
          Math.pow(product.features.color[1] - g, 2) +
          Math.pow(product.features.color[2] - b, 2)
        )
        
        const similarity = Math.max(0, 1 - colorDistance) * 100
        
        return {
          ...product,
          similarity
        }
      }).filter(result => result.similarity > 40)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 8)

      setResults(searchResults)
      toast.success(`Found ${searchResults.length} products matching ${color}`)
      
    } catch (error) {
      toast.error('Color search failed')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Clear search results
  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  return {
    searchSimilarProducts,
    searchByColor,
    clearResults,
    isSearching,
    results,
    searchHistory
  }
}
