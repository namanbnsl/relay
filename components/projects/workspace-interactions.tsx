"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check, Copy, X, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast-manager";

export function useDraftProtection(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const beforeNavigate = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest("a[href], [data-document-navigation]")
          : null;
      if (!target || target.getAttribute("target") === "_blank") return;
      if (
        !window.confirm("Discard your unsaved changes and leave this document?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigate, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigate, true);
    };
  }, [dirty]);
}

export function WorkspaceDialog({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  trigger: ReactElement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }
        onOpenChange?.(nextOpen);
      }}
    >
      <DialogTrigger render={trigger} />
        <DialogContent
          showCloseButton={false}
          className="workspace-dialog research-workspace"
          initialFocus={() =>
            document.querySelector<HTMLElement>(
              ".workspace-dialog input, .workspace-dialog textarea",
            )
          }
          finalFocus={() =>
            returnFocus.current?.isConnected ? returnFocus.current : null
          }
        >
          <div className="pe-8">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
          <DialogClose
            render={<Button
              variant="ghost"
              size="icon"
              className="absolute end-4 top-4"
              aria-label="Close dialog"
            />}
          >
              <X aria-hidden />
          </DialogClose>
          <div className="mt-6">{children}</div>
        </DialogContent>
    </Dialog>
  );
}

export function AgentPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <WorkspaceDialog
      title="Continue with your agent"
      description="Send this prompt to the agent connected to Relay. Its work will appear here automatically."
      trigger={
        <Button variant="outline">
          <ArrowUpRight aria-hidden />
          Continue with agent
        </Button>
      }
    >
      <p className="rounded-lg bg-surface-subtle p-4 text-sm leading-7 select-all">
        {prompt}
      </p>
      <div className="mt-5 flex justify-end">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setCopied(true);
              toast.add({
                title: "Prompt copied. Paste it into your agent.",
                type: "success",
              });
            } catch {
              setError("Select the prompt above and copy it to your agent.");
            }
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      ) : null}
    </WorkspaceDialog>
  );
}

export function EmptyDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <div className="workspace-empty-icon">
        <FileText size={23} strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function DocumentLoading() {
  return (
    <div role="status" className="mx-auto max-w-[720px] py-10">
      <span className="sr-only">Loading document…</span>
      <div className="mb-8 h-7 w-1/3 rounded bg-secondary" />
      {[100, 92, 97, 72].map((width) => (
        <div
          key={width}
          style={{ width: `${width}%` }}
          className="mb-4 h-3 rounded bg-surface-subtle"
        />
      ))}
    </div>
  );
}
