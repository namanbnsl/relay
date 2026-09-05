"use client";
import { Button } from "@/components/ui/button";
export function EmptyResearch({ onStart }: { onStart: () => void }) { return <div className="py-12"><h2 className="text-base font-medium">Start an investigation</h2><p className="mt-2 text-sm text-muted-foreground">Collect findings for this question.</p><Button className="mt-5" onClick={onStart}>Start investigation</Button></div>; }
