export type SiteNavItem = Readonly<{ label: string; href: string }>;

export const siteConfig = Object.freeze({
  name: "BlockTerms",
  title: "BlockTerms — Verifiable Agent Data Infrastructure",
  description: "Buy live blockchain data through x402, verify its promised state, and recover value from provider collateral when delivery breaks its terms.",
  nav: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Proofs", href: "/proofs" },
    { label: "Providers", href: "/providers" },
    { label: "Docs", href: "/docs" },
  ] satisfies readonly SiteNavItem[],
  footerNav: [
    { label: "Product", href: "/product" },
    { label: "Developers", href: "/developers" },
    { label: "Demo", href: "/demo" },
  ] satisfies readonly SiteNavItem[],
  demoHref: "/demo",
  videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4",
  featureFlags: Object.freeze({ liveDemo: false, explorerLinks: false }),
});
