import { AgentDetails } from "@/components/agents/agent-details";
import { ProductHero } from "@/components/hero/product-hero";
import { HowItWorksSection } from "@/components/how-it-works/how-it-works-section";
import { EarlyAccessSection } from "@/components/early-access/early-access-section";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteNav } from "@/components/nav/site-nav";
import { SECTION } from "@/lib/site";

export default function Page() {
  return (
    <>
      <SiteNav />
      <main id={SECTION.main}>
        <ProductHero />
        <HowItWorksSection />
        <AgentDetails />
        <EarlyAccessSection />
      </main>
      <SiteFooter />
    </>
  );
}
