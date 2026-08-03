/**

 * Reels Service - Glow Reels Integration

 * Short video content via FastAPI + Cloudflare Stream

 */



import { httpClient, type ApiResponse } from "../http-client"

import { ENDPOINTS } from "../config"



// Types

export interface Reel {

  id: string

  video_url: string

  thumbnail_url: string

  caption: string

  hashtags: string[]

  creator_id: string

  creator: {

    id: string

    username: string

    display_name: string

    avatar_url: string

    is_verified: boolean

  }

  likes_count: number

  comments_count: number

  shares_count: number

  views: number

  products: ReelProduct[]

  is_liked?: boolean

  is_saved?: boolean

  is_active: boolean

  is_featured: boolean

  duration: number

  created_at: string

}



export interface ReelProduct {

  id: string

  product_id: string

  product: {

    id: string

    name: string

    price: number

    images: string[]

    seller_id: string

  }

  timestamp?: number

  position?: { x: number; y: number }

}



export interface ReelComment {

  id: string

  reel_id: string

  user_id: string

  user: {

    id: string

    username: string

    avatar_url: string

  }

  content: string

  likes_count: number

  replies_count: number

  is_liked?: boolean

  created_at: string

}



export interface CreateReelData {

  video_url: string

  thumbnail_url?: string

  caption: string

  hashtags?: string[]

  product_ids?: string[]

}



export interface ReelFilters {

  creator_id?: string

  is_featured?: boolean

  hashtag?: string

  page?: number

  limit?: number

}



/**

 * Reels Service

 */

export const reelsService = {

  // Feed

  feed: (filters?: ReelFilters): Promise<ApiResponse<Reel[]>> =>

    httpClient.get(ENDPOINTS.REELS.FEED, { params: filters }),



  forYou: (params?: {

    page?: number

    limit?: number

  }): Promise<ApiResponse<Reel[]>> => httpClient.get(ENDPOINTS.REELS.FOR_YOU, { params }),



  trending: (limit?: number): Promise<ApiResponse<Reel[]>> =>

    httpClient.get(ENDPOINTS.REELS.TRENDING, { params: { limit } }),



  // Single Reel

  get: (id: string): Promise<ApiResponse<Reel>> => httpClient.get(ENDPOINTS.REELS.DETAIL(id)),



  // Create

  create: (data: CreateReelData): Promise<ApiResponse<Reel>> => httpClient.post(ENDPOINTS.REELS.CREATE, data),



  uploadVideo: (file: File): Promise<ApiResponse<{ video_url: string; thumbnail_url: string }>> => {

    const formData = new FormData()

    formData.append("video", file)

    return httpClient.upload(ENDPOINTS.REELS.UPLOAD, formData)

  },



  // Interactions

  like: (id: string): Promise<ApiResponse<{ likes_count: number }>> => httpClient.post(ENDPOINTS.REELS.LIKE(id)),



  unlike: (id: string): Promise<ApiResponse<{ likes_count: number }>> => httpClient.post(ENDPOINTS.REELS.UNLIKE(id)),



  share: (id: string, platform?: string): Promise<ApiResponse<{ share_url: string }>> =>

    httpClient.post(ENDPOINTS.REELS.SHARE(id), { platform }),



  // Comments

  getComments: (id: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<ReelComment[]>> =>

    httpClient.get(ENDPOINTS.REELS.COMMENTS(id), { params }),



  addComment: (id: string, content: string): Promise<ApiResponse<ReelComment>> =>

    httpClient.post(ENDPOINTS.REELS.COMMENTS(id), { content }),



  // Products

  getProducts: (id: string): Promise<ApiResponse<ReelProduct[]>> => httpClient.get(ENDPOINTS.REELS.PRODUCTS(id)),

}



export default reelsService

