import { BackgroundVideo } from "@/components/landing/background-video";
import { EntranceController } from "@/components/landing/entrance-controller";
import { Hero } from "@/components/landing/hero";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="landing">
      <BackgroundVideo />
      <EntranceController><SiteHeader /><Hero /></EntranceController>
    </div>
  );
}
