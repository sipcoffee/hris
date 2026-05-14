import { Users } from "lucide-react";

import { cn } from "@/lib/utils";

interface MarkProps {
  className?: string;
}

export function HrisMark({ className }: MarkProps) {
  return <Users className={cn("h-5 w-5", className)} aria-hidden />;
}

interface WordmarkProps {
  className?: string;
  badge?: string;
}

export function Wordmark({ className, badge }: WordmarkProps) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <HrisMark className="h-4 w-4" />
      </span>
      <span className="text-base">
        HR<span className="text-primary">IS</span>
      </span>
      {badge && (
        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {badge}
        </span>
      )}
    </span>
  );
}
