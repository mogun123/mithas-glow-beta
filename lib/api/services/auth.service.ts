/**
 * Auth Service - Authentication Integration
 * Supabase Auth + FastAPI session management
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"
import type { UserProfile } from "./user.service"

// Types
export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name?: string
  phone?: string
  gender?: "female" | "male" | "other"
}

export interface AuthResponse {
  user: UserProfile
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface OTPVerification {
  identifier: string
  otp: string
  type: "email" | "phone"
}

/**
 * Auth Service
 */
export const authService = {
  // Login
  login: (data: LoginData): Promise<ApiResponse<AuthResponse>> => httpClient.post(ENDPOINTS.AUTH.LOGIN, data),

  // Register
  register: (data: RegisterData): Promise<ApiResponse<AuthResponse>> => httpClient.post(ENDPOINTS.AUTH.REGISTER, data),

  // Logout
  logout: (): Promise<ApiResponse<void>> => httpClient.post(ENDPOINTS.AUTH.LOGOUT),

  // Refresh Token
  refreshToken: (refreshToken: string): Promise<ApiResponse<{ access_token: string; expires_at: number }>> =>
    httpClient.post(ENDPOINTS.AUTH.REFRESH, { refresh_token: refreshToken }),

  // Current User
  me: (): Promise<ApiResponse<UserProfile>> => httpClient.get(ENDPOINTS.AUTH.ME),

  // OTP
  sendOTP: (identifier: string, type: "email" | "phone"): Promise<ApiResponse<{ message: string }>> =>
    httpClient.post(ENDPOINTS.AUTH.SEND_OTP, { identifier, type }),

  verifyOTP: (data: OTPVerification): Promise<ApiResponse<AuthResponse>> =>
    httpClient.post(ENDPOINTS.AUTH.VERIFY_OTP, data),

  // Password Reset
  forgotPassword: (email: string): Promise<ApiResponse<{ message: string }>> =>
    httpClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),

  resetPassword: (token: string, password: string): Promise<ApiResponse<{ message: string }>> =>
    httpClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password }),
}

export default authService
