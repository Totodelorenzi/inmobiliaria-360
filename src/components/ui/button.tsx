import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const variants = {
  /** Color de la inmobiliaria. */
  brand: "bg-brand text-brand-fg hover:brightness-110",
  /** Amarillo: tour 360° y planos, el llamado a la acción más fuerte de la ficha. */
  accent: "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm",
  outline: "border border-border bg-bg text-fg hover:bg-surface",
  ghost: "text-fg hover:bg-surface",
  danger: "bg-danger text-white hover:brightness-110",
  /** Verde WhatsApp oscurecido para contraste AA con texto blanco. */
  whatsapp: "bg-[#0e7a40] text-white hover:bg-[#0b6636]",
} as const;

const sizes = {
  /** Todos los tamaños miden al menos 44 px de alto (objetivo táctil). */
  md: "min-h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "min-h-14 px-6 text-base gap-3 rounded-2xl",
  icon: "size-11 rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

type StyleOptions = { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string };

/** Clases de botón, para usar también en <Link> y <a>. */
export function buttonStyles({ variant = "brand", size = "md", fullWidth, className }: StyleOptions = {}) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<StyleOptions, "className"> & { loading?: boolean };

export function Button({
  variant,
  size,
  fullWidth,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
