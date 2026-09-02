import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[10px] border text-[13px] font-semibold transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary disabled:text-[#97998f] disabled:shadow-none aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_#090a08] hover:-translate-y-px hover:border-[#35382f] hover:bg-[#35382f] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_3px_0_#090a08] active:translate-y-0 active:shadow-none",
        signal: "border-foreground bg-signal text-signal-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_0_var(--foreground)] hover:-translate-y-px hover:bg-[#e7fa75] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_3px_0_var(--foreground)] active:translate-y-0 active:shadow-none",
        destructive: "border-transparent bg-destructive-subtle text-destructive shadow-none hover:bg-destructive-subtle/80 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline: "border-border-strong bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_0_rgba(32,34,29,0.06)] hover:-translate-y-px hover:border-[#7f8475] hover:bg-[#f4f5ed] active:translate-y-0 active:shadow-none",
        secondary: "border-border bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/80",
        ghost: "border-transparent bg-transparent text-foreground shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 has-[>svg]:px-3.5",
        xs: "h-6 gap-1 rounded-[6px] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[6px] px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-5 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
