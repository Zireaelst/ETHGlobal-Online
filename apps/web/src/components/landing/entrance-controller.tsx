"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function EntranceController({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    element.classList.add("motion-ready");
    function onEnd(event: AnimationEvent) {
      (event.target as HTMLElement).dataset.visible = "true";
    }
    element.addEventListener("animationend", onEnd);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (element.getAnimations().length === 0) element.classList.add("motion-settled");
    }));
    return () => { cancelAnimationFrame(frame); element.removeEventListener("animationend", onEnd); };
  }, []);
  return <div className="entrance-root" ref={root}>{children}</div>;
}
