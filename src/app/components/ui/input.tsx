import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-2xl border px-4 py-2 text-[0.9375rem] bg-input-background transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
        "border-[var(--border-input)] shadow-[var(--shadow-input)]",
        "focus-visible:border-[var(--border-input-focus)] focus-visible:shadow-[var(--shadow-input-focus)]",
        "aria-invalid:border-[var(--border-input-invalid)] aria-invalid:shadow-[var(--shadow-input-invalid)]",
        "disabled:bg-[var(--input-background-disabled)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
