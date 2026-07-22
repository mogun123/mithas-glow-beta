/**
 * Login Page
 */

import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your MITHAS GLOW account",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl mb-2">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded">MG</span>
            <span>MITHAS GLOW</span>
          </Link>
          <p className="text-muted-foreground">Welcome back! Sign in to continue.</p>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-lg">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
