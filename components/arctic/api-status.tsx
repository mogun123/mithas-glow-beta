"use client"

/**
 * API Status Component
 * Shows connection status to FastAPI backend
 */

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { arcticConfig, isBackendConfigured } from "@/lib/config/arctic"
import { Cloud, CloudOff, Loader2 } from "lucide-react"

export function ApiStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading")

  useEffect(() => {
    const checkConnection = async () => {
      if (!isBackendConfigured()) {
        setStatus("disconnected")
        return
      }

      try {
        const response = await fetch(`${arcticConfig.backend.url}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        })
        setStatus(response.ok ? "connected" : "disconnected")
      } catch {
        setStatus("disconnected")
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  if (status === "loading") {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking API...
      </Badge>
    )
  }

  if (status === "connected") {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
      >
        <Cloud className="h-3 w-3" />
        API Connected
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800"
    >
      <CloudOff className="h-3 w-3" />
      Offline Mode
    </Badge>
  )
}
