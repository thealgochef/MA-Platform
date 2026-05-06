import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

type ButtonVariant = "primary" | "danger" | "secondary";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-btn-hover transition-colors disabled:opacity-50",
  danger:
    "bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50",
  secondary:
    "border border-gray-300 px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingText?: ReactNode;
};

export function Button({
  variant = "primary",
  isLoading = false,
  loadingText,
  disabled,
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(variantClasses[variant], className)}
      {...props}
    >
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
