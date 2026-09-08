import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SearchInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  label: string;
};

function SearchInput({ className, label, ...props }: SearchInputProps) {
  return (
    <label
      className={cn(
        "relative block min-w-0 text-muted-foreground",
        className,
      )}
    >
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
      <Input
        {...props}
        type="search"
        aria-label={props["aria-label"] ?? label}
        className="ps-9"
      />
    </label>
  );
}

export { SearchInput };
