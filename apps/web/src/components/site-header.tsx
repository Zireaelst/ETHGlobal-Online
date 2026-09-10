"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const firstLink = dialogRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('a, button:not([disabled])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function onResize() { if (window.innerWidth > 900) close(); }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label={`${siteConfig.name} home`}>
        <BrandMark /><span>{siteConfig.name}</span>
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {siteConfig.nav.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="button button--primary header-demo" href={siteConfig.demoHref}>Launch Demo</Link>
        <button
          aria-controls="mobile-menu"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="menu-toggle"
          onClick={() => setOpen((value) => !value)}
          ref={toggleRef}
          type="button"
        >
          <span /><span />
        </button>
      </div>
      {open ? (
        <div aria-label="Site navigation" aria-modal="true" className="mobile-menu" id="mobile-menu" ref={dialogRef} role="dialog">
          <nav aria-label="Mobile navigation">
            {siteConfig.nav.map((item) => <Link href={item.href} key={item.href} onClick={() => close()}>{item.label}</Link>)}
            <Link className="button button--primary" href={siteConfig.demoHref} onClick={() => close()}>Launch Demo</Link>
          </nav>
          <p>Bounded data. Explicit terms. Separate warranty.</p>
        </div>
      ) : null}
    </header>
  );
}
