/**
 * Wallet Service - GlowPay Integration
 * Digital wallet via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"

// Types
export interface WalletBalance {
  balance: number
  currency: string
  pending_balance: number
  total_earned: number
  total_spent: number
}

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  type: "credit" | "debit"
  category: "add_funds" | "purchase" | "refund" | "payout" | "cashback" | "transfer" | "reward"
  description: string
  reference_id?: string
  reference_type?: string
  status: "pending" | "completed" | "failed"
  created_at: string
}

export interface BankAccount {
  id?: string
  account_number: string
  ifsc_code: string
  account_name: string
  bank_name?: string
  is_default?: boolean
}

export interface PayoutRequest {
  id: string
  amount: number
  bank_account: BankAccount
  status: "pending" | "processing" | "completed" | "failed"
  utr_number?: string
  created_at: string
  completed_at?: string
}

/**
 * Wallet Service
 */
export const walletService = {
  // Balance
  getBalance: (): Promise<ApiResponse<WalletBalance>> => httpClient.get(ENDPOINTS.WALLET.BALANCE),

  // Transactions
  getTransactions: (params?: {
    type?: "credit" | "debit"
    category?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<WalletTransaction[]>> => httpClient.get(ENDPOINTS.WALLET.TRANSACTIONS, { params }),

  // Add Funds (via Razorpay)
  addFunds: (amount: number): Promise<ApiResponse<{ order_id: string; razorpay_order_id: string }>> =>
    httpClient.post(ENDPOINTS.WALLET.ADD_FUNDS, { amount }),

  // Pay from Wallet
  pay: (data: {
    amount: number
    description: string
    reference_id?: string
    reference_type?: string
  }): Promise<ApiResponse<{ transaction_id: string; new_balance: number }>> =>
    httpClient.post(ENDPOINTS.WALLET.PAY, data),

  // Request Payout (for sellers)
  requestPayout: (data: {
    amount: number
    bank_account_id: string
  }): Promise<ApiResponse<PayoutRequest>> => httpClient.post(ENDPOINTS.WALLET.PAYOUT, data),

  // Transfer (user to user)
  transfer: (data: {
    recipient_id: string
    amount: number
    note?: string
  }): Promise<ApiResponse<{ transaction_id: string; new_balance: number }>> =>
    httpClient.post(ENDPOINTS.WALLET.TRANSFER, data),
}

export default walletService
