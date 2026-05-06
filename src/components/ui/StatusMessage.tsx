import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

type StatusMessageProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function StatusMessage({ children, className, ...props }: StatusMessageProps) {
  return (
    <span role="status" className={cn("text-sm text-text-secondary", className)} {...props}>
      {children}
    </span>
  );
}
