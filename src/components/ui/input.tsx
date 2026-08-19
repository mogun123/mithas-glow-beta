import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-xl border border-purple-100/80 bg-white/80 px-3.5 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 dark:bg-gray-900/80 dark:border-purple-950/40 dark:text-gray-100 dark:placeholder:text-gray-500 shadow-xs transition-all outline-none focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/20 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
