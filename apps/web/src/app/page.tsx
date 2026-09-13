import { BackgroundVideo } from "@/components/landing/background-video";
import { EntranceController } from "@/components/landing/entrance-controller";
import { Hero } from "@/components/landing/hero";
import { ProductStory } from "@/components/landing/product-story";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <BackgroundVideo />
        <EntranceController><SiteHeader /><Hero /></EntranceController>
      </section>
      <ProductStory />
      <SiteFooter />
    </div>
  );
}
