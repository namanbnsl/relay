"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog } from "radix-ui";
import { Check, Copy, X, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const FeedbackContext = createContext<(message: string) => void>(() => {});
export const useFeedback = () => useContext(FeedbackContext);

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

export function WorkspaceFeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [message, setMessage] = useState("");
  return (
    <FeedbackContext.Provider value={setMessage}>
      {children}
      <div
        className="workspace-toast research-workspace"
        role="status"
        aria-live="polite"
      >
        {message ? (
          <>
            <Check size={16} aria-hidden />
            <span>{message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setMessage("")}
            >
              <X size={15} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </FeedbackContext.Provider>
  );
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
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="workspace-overlay" />
        <Dialog.Content
          className="workspace-dialog research-workspace"
          onOpenAutoFocus={(event) => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            const field =
              event.target instanceof HTMLElement
                ? event.target.querySelector("input, textarea")
                : null;
            if (field instanceof HTMLElement) {
              event.preventDefault();
              field.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
        >
          <div className="pe-8">
            <Dialog.Title className="text-lg font-semibold tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-4 top-4"
              aria-label="Close dialog"
            >
              <X aria-hidden />
            </Button>
          </Dialog.Close>
          <div className="mt-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AgentPrompt({ prompt }: { prompt: string }) {
  const notify = useFeedback();
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
              notify("Prompt copied. Paste it into your agent.");
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
