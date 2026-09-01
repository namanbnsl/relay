"use client";

import { useEffect, useState } from "react";

const sectionLinks = [
  { id: "color", label: "Color" },
  { id: "type", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "components", label: "Components" },
  { id: "product", label: "Product pattern" },
  { id: "principles", label: "Principles" },
] satisfies ReadonlyArray<{ id: string; label: string }>;

export function DesignSystemNav() {
  const [activeId, setActiveId] = useState("color");

  useEffect(() => {
    const sections = sectionLinks.flatMap(({ id }) => {
      const section = document.getElementById(id);
      return section ? [section] : [];
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries.find((entry) => entry.isIntersecting);
        if (visibleSection) setActiveId(visibleSection.target.id);
      },
      { rootMargin: "-18% 0px -72%", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Sections" className="hidden gap-0.5 min-[661px]:flex min-[901px]:mt-9 min-[901px]:grid">
      {sectionLinks.map(({ id, label }) => {
        const isActive = id === activeId;
        return (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActiveId(id)}
            aria-current={isActive ? "location" : undefined}
            className={`relative block rounded-md px-2 py-1.5 text-[13px] transition-colors ${isActive ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {label}
            {isActive ? (
              <span className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full border border-foreground bg-signal" aria-hidden="true" />
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}
