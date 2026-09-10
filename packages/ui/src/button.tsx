import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "ghost";

export function ButtonLink({
  children,
  className = "",
  tone = "primary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; tone?: Tone }) {
  return <a className={`button button--${tone} ${className}`.trim()} {...props}>{children}</a>;
}

export function Button({
  children,
  className = "",
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: Tone }) {
  return <button className={`button button--${tone} ${className}`.trim()} {...props}>{children}</button>;
}
