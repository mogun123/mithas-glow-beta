/**
 * Payments Service - Razorpay Integration
 * Payment processing via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"

// Types
export interface PaymentOrder {
  order_id: string
  razorpay_order_id: string
  amount: number
  currency: string
  status: "created" | "paid" | "failed"
  receipt: string
  notes?: Record<string, string>
}

export interface PaymentVerification {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface PaymentMethod {
  id: string
  type: "upi" | "card" | "netbanking" | "wallet"
  name: string
  icon_url?: string
  is_popular: boolean
}

export interface UPIIntent {
  intent_url: string
  qr_code_url: string
  vpa?: string
}

export interface RefundRequest {
  payment_id: string
  amount?: number
  reason: string
}

export interface RefundResponse {
  refund_id: string
  amount: number
  status: "pending" | "processed" | "failed"
}

/**
 * Payments Service
 */
export const paymentsService = {
  // Create Order
  createOrder: (data: {
    amount: number
    currency?: string
    receipt?: string
    notes?: Record<string, string>
    order_id?: string
  }): Promise<ApiResponse<PaymentOrder>> => httpClient.post(ENDPOINTS.PAYMENTS.CREATE_ORDER, data),

  // Verify Payment
  verifyPayment: (data: PaymentVerification): Promise<ApiResponse<{ verified: boolean; order_id: string }>> =>
    httpClient.post(ENDPOINTS.PAYMENTS.VERIFY, data),

  // Request Refund
  requestRefund: (data: RefundRequest): Promise<ApiResponse<RefundResponse>> =>
    httpClient.post(ENDPOINTS.PAYMENTS.REFUND, data),

  // Get Payment Methods
  getPaymentMethods: (): Promise<ApiResponse<PaymentMethod[]>> => httpClient.get(ENDPOINTS.PAYMENTS.METHODS),

  // Get UPI Intent
  getUPIIntent: (orderId: string): Promise<ApiResponse<UPIIntent>> =>
    httpClient.post(ENDPOINTS.PAYMENTS.UPI_INTENT, { order_id: orderId }),
}

export default paymentsService
