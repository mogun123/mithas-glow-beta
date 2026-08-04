/**
 * Payment Service - Razorpay Integration via FastAPI
 * Secure payment processing
 */

import { arcticConfig } from "@/lib/config/arctic"
import { httpClient, type ApiResponse } from "@/lib/api/http-client"
import { ENDPOINTS } from "@/lib/api/config"

declare global {
  interface Window {
    Razorpay: any
  }
}

// Types
export interface PaymentOrder {
  order_id: string
  razorpay_order_id: string
  amount: number
  currency: string
  receipt: string
}

export interface PaymentResult {
  success: boolean
  payment_id?: string
  order_id?: string
  signature?: string
  error?: string
}

export interface PaymentVerification {
  verified: boolean
  order_id: string
  payment_id: string
  amount: number
}

export interface WalletTransaction {
  id: string
  type: "credit" | "debit"
  amount: number
  description: string
  created_at: string
}

/**
 * Payment Service for Razorpay Integration
 */
class PaymentService {
  private razorpayKeyId: string
  private razorpayLoaded = false

  constructor() {
    this.razorpayKeyId = arcticConfig.backend.razorpay.keyId
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return arcticConfig.backend.razorpay.enabled
  }

  /**
   * Load Razorpay script
   */
  async loadRazorpayScript(): Promise<boolean> {
    if (typeof window === "undefined") return false

    if (this.razorpayLoaded || window.Razorpay) {
      this.razorpayLoaded = true
      return true
    }

    return new Promise((resolve) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => {
        this.razorpayLoaded = true
        resolve(true)
      }
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  /**
   * Create payment order via FastAPI
   */
  async createOrder(data: {
    amount: number
    currency?: string
    receipt?: string
    notes?: Record<string, string>
  }): Promise<ApiResponse<PaymentOrder>> {
    return httpClient.post(ENDPOINTS.PAYMENTS.CREATE_ORDER, {
      amount: data.amount,
      currency: data.currency || "INR",
      receipt: data.receipt,
      notes: data.notes,
    })
  }

  /**
   * Process payment with Razorpay checkout
   */
  async processPayment(
    order: PaymentOrder,
    userInfo: {
      name: string
      email: string
      phone: string
    },
    options?: {
      theme_color?: string
      logo?: string
    },
  ): Promise<PaymentResult> {
    const loaded = await this.loadRazorpayScript()
    if (!loaded) {
      return { success: false, error: "Failed to load payment gateway" }
    }

    return new Promise((resolve) => {
      const razorpayOptions = {
        key: this.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "MITHAS GLOW",
        description: "Beauty Products & Services",
        order_id: order.razorpay_order_id,
        prefill: {
          name: userInfo.name,
          email: userInfo.email,
          contact: userInfo.phone,
        },
        theme: {
          color: options?.theme_color || "#ec4899",
        },
        image: options?.logo || "/logo.png",
        handler: (response: any) => {
          resolve({
            success: true,
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            signature: response.razorpay_signature,
          })
        },
        modal: {
          ondismiss: () => {
            resolve({ success: false, error: "Payment cancelled by user" })
          },
          escape: true,
          backdropclose: false,
        },
      }

      const razorpay = new window.Razorpay(razorpayOptions)
      razorpay.on("payment.failed", (response: any) => {
        resolve({
          success: false,
          error: response.error.description || "Payment failed",
        })
      })
      razorpay.open()
    })
  }

  /**
   * Verify payment via FastAPI
   */
  async verifyPayment(data: {
    payment_id: string
    order_id: string
    signature: string
  }): Promise<ApiResponse<PaymentVerification>> {
    return httpClient.post(ENDPOINTS.PAYMENTS.VERIFY, data)
  }

  /**
   * Request refund
   */
  async requestRefund(data: {
    payment_id: string
    amount?: number
    reason?: string
  }): Promise<ApiResponse<{ refund_id: string; status: string }>> {
    return httpClient.post(ENDPOINTS.PAYMENTS.REFUND, data)
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(): Promise<
    ApiResponse<{
      upi: boolean
      cards: boolean
      netbanking: boolean
      wallet: boolean
      emi: boolean
    }>
  > {
    return httpClient.get(ENDPOINTS.PAYMENTS.METHODS)
  }

  /**
   * Generate UPI intent for payment
   */
  async generateUPIIntent(orderId: string): Promise<ApiResponse<{ intent_url: string; qr_code: string }>> {
    return httpClient.post(ENDPOINTS.PAYMENTS.UPI_INTENT, { order_id: orderId })
  }

  /**
   * Complete checkout flow
   */
  async checkout(data: {
    cart_total: number
    user: { name: string; email: string; phone: string }
    address_id: string
    payment_method: "razorpay" | "wallet" | "cod"
  }): Promise<{ success: boolean; order_id?: string; error?: string }> {
    // Create payment order
    const orderResponse = await this.createOrder({
      amount: data.cart_total * 100, // Convert to paise
      notes: {
        address_id: data.address_id,
        payment_method: data.payment_method,
      },
    })

    if (!orderResponse.success || !orderResponse.data) {
      return { success: false, error: "Failed to create order" }
    }

    if (data.payment_method === "cod") {
      // Cash on delivery - no payment processing needed
      return { success: true, order_id: orderResponse.data.order_id }
    }

    if (data.payment_method === "wallet") {
      // Use GlowPay wallet
      const walletResponse = await httpClient.post("/wallet/pay", {
        amount: data.cart_total,
        description: `Order ${orderResponse.data.order_id}`,
        reference_id: orderResponse.data.order_id,
        reference_type: "order",
      })

      return {
        success: walletResponse.success,
        order_id: orderResponse.data.order_id,
        error: walletResponse.error,
      }
    }

    // Razorpay payment
    const paymentResult = await this.processPayment(orderResponse.data, data.user)

    if (!paymentResult.success) {
      return { success: false, error: paymentResult.error }
    }

    // Verify payment
    const verification = await this.verifyPayment({
      payment_id: paymentResult.payment_id!,
      order_id: paymentResult.order_id!,
      signature: paymentResult.signature!,
    })

    return {
      success: verification.success && verification.data?.verified === true,
      order_id: orderResponse.data.order_id,
      error: verification.error,
    }
  }
}

export const paymentService = new PaymentService()
export default paymentService
