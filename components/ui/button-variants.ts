import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[8px] border text-[13px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
        signal:
          "border-signal bg-signal text-signal-foreground hover:bg-primary-hover",
        outline:
          "border-border-strong bg-card text-foreground hover:border-border-hover hover:bg-secondary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:bg-secondary",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive-hover focus-visible:ring-destructive",
        link: "h-auto border-transparent p-0 text-primary shadow-none underline-offset-4 hover:text-primary-hover hover:underline",
      },
      size: {
        default: "h-10 px-3.5 has-[>svg]:px-3",
        xs: "h-8 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-[8px] px-3.5 text-[13px] has-[>svg]:px-3",
        lg: "h-11 px-4 text-sm has-[>svg]:px-3.5",
        icon: "size-10",
        "icon-xs": "size-8 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
