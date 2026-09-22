import { AgentDetails } from "@/components/agents/agent-details";
import { EarlyAccessSection } from "@/components/early-access/early-access-section";
import { SiteFooter } from "@/components/footer/site-footer";
import { ProductHero } from "@/components/hero/product-hero";
import { HowItWorksSection } from "@/components/how-it-works/how-it-works-section";
import { PricingSection } from "@/components/pricing/pricing-section";
import { getActiveOffer } from "@/lib/offer/settings";
import { SECTION } from "@/lib/site";

/**
 * The offer is read on every request rather than baked at build time, so a change
 * made from the private dashboard is live immediately. The read is one indexed
 * singleton select, and it falls back to the launch offer when the database is
 * missing or unreadable, so this page never depends on the database to render.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  const offer = await getActiveOffer();

  return (
    <>
      <main id={SECTION.main}>
        <ProductHero offer={offer} />
        <HowItWorksSection />
        <AgentDetails />
        <PricingSection offer={offer} />
        <EarlyAccessSection offer={offer} />
      </main>
      <SiteFooter />
    </>
  );
}
