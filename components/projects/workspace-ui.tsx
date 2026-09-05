import type { ReactNode } from "react";

export const workspacePageClass =
  "mx-auto w-full max-w-[1040px] px-5 py-8 sm:px-10 sm:py-10 lg:px-12";
export const workspaceSelectClass =
  "min-h-9 min-w-0 max-w-full rounded-md border border-border-strong bg-background px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-[13px]";

export function WorkspaceHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.035em]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function ViewButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative min-h-10 min-w-6 shrink-0 border-b-2 px-0.5 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
