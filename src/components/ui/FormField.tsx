import type { ReactNode } from "react";

import { cn } from "./utils";

type FormFieldProps = {
  id: string;
  label: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function FormField({
  id,
  label,
  error,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("block text-sm font-medium text-text mb-1", labelClassName)}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
