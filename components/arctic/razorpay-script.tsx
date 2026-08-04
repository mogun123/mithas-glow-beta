/**
 * Razorpay Script Loader Component
 * Loads Razorpay checkout script
 */

"use client"

import Script from "next/script"

export function RazorpayScript() {
  return <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
}

export default RazorpayScript
