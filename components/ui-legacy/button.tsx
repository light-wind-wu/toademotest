import {
  Button as PrizmButton,
  buttonVariants as prizmButtonVariants,
} from "@/components/ui/button";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant =
  | "solid"
  | "outline"
  | "ghost"
  | "subtle"
  | "danger"
  | "link"
  | "primary"
  | "secondary";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function mapVariant(variant?: ButtonVariant) {
  if (variant === "primary") return "solid";
  if (variant === "secondary") return "subtle";
  return variant as "solid" | "outline" | "ghost" | "subtle" | "danger" | "link" | undefined;
}

function mapSize(size?: ButtonSize) {
  if (size === "xs") return "sm";
  return size as "sm" | "md" | "lg" | "icon" | undefined;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <PrizmButton
      ref={ref}
      className={className}
      variant={mapVariant(variant)}
      size={mapSize(size)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export default Button;

export function buttonVariants({
  variant,
  size,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return prizmButtonVariants({ variant: mapVariant(variant), size: mapSize(size) });
}
