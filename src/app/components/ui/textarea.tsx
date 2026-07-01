import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none placeholder:text-muted-foreground/70 flex field-sizing-content min-h-16 w-full rounded-2xl border bg-input-background px-4 py-[1rem] text-[0.9375rem] transition-[color,box-shadow,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
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

export { Textarea };
