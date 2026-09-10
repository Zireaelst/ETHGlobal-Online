"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";

export function BackgroundVideo() {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`hero-media${failed ? " hero-media--fallback" : ""}`} aria-hidden="true">
      {!failed ? <video autoPlay loop muted onError={() => setFailed(true)} playsInline preload="metadata" src={siteConfig.videoUrl} /> : null}
      <div className="hero-scrim" />
    </div>
  );
}
