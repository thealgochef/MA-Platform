import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
};

export function Card({ as: Component = "section", className, children, ...props }: CardProps) {
  return (
    <Component className={cn("bg-surface-alt rounded-lg shadow-sm p-6", className)} {...props}>
      {children}
    </Component>
  );
}
