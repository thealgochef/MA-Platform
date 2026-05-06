import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { FormField } from "./FormField";
import { cn } from "./utils";

const baseInputClasses = "w-full border rounded-md px-3 py-2 text-sm";

type FieldProps = {
  label: ReactNode;
  error?: ReactNode;
  labelClassName?: string;
};

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { id, label, error, className, labelClassName, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField id={inputId} label={label} error={error} labelClassName={labelClassName}>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(baseInputClasses, className)}
        {...props}
      />
    </FormField>
  );
});

export type TextareaInputProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  function TextareaInput({ id, label, error, className, labelClassName, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <FormField id={inputId} label={label} error={error} labelClassName={labelClassName}>
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(baseInputClasses, className)}
          {...props}
        />
      </FormField>
    );
  }
);

export type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & FieldProps;

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { id, label, error, className, labelClassName, children, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField id={inputId} label={label} error={error} labelClassName={labelClassName}>
      <select
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(baseInputClasses, className)}
        {...props}
      >
        {children}
      </select>
    </FormField>
  );
});
