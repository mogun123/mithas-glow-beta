"use client"

/**
 * Architecture Badge
 * Shows the Arctic Layer architecture info
 */

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Snowflake } from "lucide-react"

export function ArchitectureBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 cursor-help">
            <Snowflake className="h-3 w-3" />
            Arctic Layer
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold mb-1">12-Layer Architecture</p>
          <ul className="text-xs space-y-0.5 text-muted-foreground">
            <li>1. Cloudflare CDN/Edge</li>
            <li>2. Next.js Frontend (UI)</li>
            <li>3. FastAPI Backend</li>
            <li>4. Supabase PostgreSQL</li>
            <li>5. Storage (Supabase + R2)</li>
            <li>6. AI/ML Services</li>
            <li>7. AR Mirror</li>
            <li>8. Product Modules</li>
            <li>9. Security (Supabase Auth)</li>
            <li>10. Analytics (PostHog)</li>
            <li>11. DevOps (K8s/EKS)</li>
            <li>12. Payments (Razorpay)</li>
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
