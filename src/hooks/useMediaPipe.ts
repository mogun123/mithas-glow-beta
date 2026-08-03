"use client"

import { useRef, useCallback, useEffect, useState } from 'react'
import { Camera } from '@mediapipe/camera_utils'
import { FaceMesh, Results } from '@mediapipe/face_mesh'

interface FaceLandmark {
  x: number
  y: number
  z: number
}

interface FaceRegion {
  forehead: FaceLandmark[]
  leftEye: FaceLandmark[]
  rightEye: FaceLandmark[]
  nose: FaceLandmark[]
  mouth: FaceLandmark[]
  leftCheek: FaceLandmark[]
  rightCheek: FaceLandmark[]
  chin: FaceLandmark[]
}

interface MediaPipeResult {
  landmarks: FaceLandmark[]
  faceRegions: FaceRegion
  faceOval: FaceLandmark[]
  iris: {
    left: FaceLandmark[]
    right: FaceLandmark[]
  }
  confidence: number
}

export function useMediaPipe() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [results, setResults] = useState<MediaPipeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const faceMeshRef = useRef<FaceMesh | null>(null)
  const cameraRef = useRef<Camera | null>(null)

  // Initialize MediaPipe Face Mesh
  const initialize = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas element not found')
      }

      // Initialize Face Mesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        }
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      faceMesh.onResults(onResults)
      faceMeshRef.current = faceMesh

      // Setup camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current })
          }
        },
        width: 640,
        height: 480
      })

      cameraRef.current = camera
      setIsReady(true)
      setIsLoading(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize MediaPipe')
      setIsLoading(false)
    }
  }, [])

  // Process MediaPipe results
  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = results.image.width
    canvas.height = results.image.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0]

      // Draw face mesh (optional - for debugging)
      drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 })
      drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030' })
      drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' })
      drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30' })
      drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYEBROW, { color: '#30FF30' })
      drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0' })
      drawConnectors(ctx, landmarks, FACEMESH_LIPS, { color: '#E0E0E0' })

      // Extract face regions
      const faceRegions = extractFaceRegions(landmarks)
      const faceOval = extractFaceOval(landmarks)
      const iris = extractIris(landmarks)

      // Update results
      setResults({
        landmarks: landmarks.map(point => ({
          x: point.x,
          y: point.y,
          z: point.z
        })),
        faceRegions,
        faceOval,
        iris,
        confidence: 0.9 // Placeholder - actual confidence would come from MediaPipe
      })
    }
  }, [])

  // Extract specific face regions
  const extractFaceRegions = (landmarks: any[]): FaceRegion => {
    // Face mesh indices for different regions
    const foreheadIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 17, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
    
    const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
    const rightEyeIndices = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
    
    const noseIndices = [1, 2, 5, 4, 6, 19, 20, 94, 125, 141, 235, 236, 237, 238, 239, 240, 241, 242, 276, 277, 278, 279, 280, 281, 282, 295, 296, 334, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427]
    
    const mouthIndices = [13, 14, 78, 80, 81, 82, 87, 88, 95, 61, 84, 17, 312, 314, 315, 316, 321, 322, 375, 323, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318]
    
    const leftCheekIndices = [50, 101, 205, 206, 207, 209, 214, 215, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307]
    
    const rightCheekIndices = [280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317]
    
    const chinIndices = [18, 175, 199, 200, 207, 208, 13, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10]

    return {
      forehead: foreheadIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      leftEye: leftEyeIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      rightEye: rightEyeIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      nose: noseIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      mouth: mouthIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      leftCheek: leftCheekIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      rightCheek: rightCheekIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      chin: chinIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z }))
    }
  }

  const extractFaceOval = (landmarks: any[]): FaceLandmark[] => {
    const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 17, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
    return faceOvalIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z }))
  }

  const extractIris = (landmarks: any[]) => {
    const leftIrisIndices = [468, 469, 470, 471, 472]
    const rightIrisIndices = [473, 474, 475, 476, 477]
    
    return {
      left: leftIrisIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z })),
      right: rightIrisIndices.map(i => ({ x: landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z }))
    }
  }

  // Start camera
  const start = useCallback(async () => {
    if (!isReady) {
      await initialize()
    }
    
    if (cameraRef.current) {
      try {
        await cameraRef.current.start()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start camera')
      }
    }
  }, [isReady, initialize])

  // Stop camera
  const stop = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop()
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      stop()
      if (faceMeshRef.current) {
        faceMeshRef.current.close()
      }
    }
  }, [stop])

  return {
    videoRef,
    canvasRef,
    isLoading,
    isReady,
    results,
    error,
    start,
    stop,
    initialize
  }
}

// Helper function to draw connectors (simplified version)
function drawConnectors(ctx: CanvasRenderingContext2D, landmarks: any[], connections: any[], style: any) {
  // This is a simplified version - in production you'd use the actual MediaPipe drawing utilities
  ctx.strokeStyle = style.color || '#00FF00'
  ctx.lineWidth = style.lineWidth || 1
  
  connections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      ctx.beginPath()
      ctx.moveTo(landmarks[start].x * ctx.canvas.width, landmarks[start].y * ctx.canvas.height)
      ctx.lineTo(landmarks[end].x * ctx.canvas.width, landmarks[end].y * ctx.canvas.height)
      ctx.stroke()
    }
  })
}

// Face mesh connections (simplified - these would come from MediaPipe)
const FACEMESH_TESSELATION = []
const FACEMESH_RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
const FACEMESH_RIGHT_EYEBROW = [46, 53, 52, 51, 48, 115, 131, 134, 102, 49, 220, 305, 292, 334, 293, 300, 276, 283, 282, 295, 285, 336, 331, 296, 336]
const FACEMESH_LEFT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
const FACEMESH_LEFT_EYEBROW = [276, 283, 282, 295, 285, 336, 331, 296, 336, 296, 334, 293, 300, 276, 283, 282, 295, 285]
const FACEMESH_FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 17, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
const FACEMESH_LIPS = [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318]
