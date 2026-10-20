import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, className, required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    return (
      <div className="grid gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
          {label}{required ? <span aria-hidden="true" className="ml-1 text-danger">*</span> : null}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined}
          className={cn(
            "min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:opacity-60",
            error ? "border-danger focus-visible:border-danger focus-visible:ring-danger/20" : "",
            className,
          )}
          {...props}
        />
        {hint ? <p id={hintId} className="text-xs text-muted">{hint}</p> : null}
        {error ? <p id={errorId} role="alert" className="text-xs font-medium text-danger">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";
