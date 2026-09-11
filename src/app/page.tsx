import { EarlyAccessSection } from "@/components/early-access/early-access-section";
import { FinalCta } from "@/components/final-cta/final-cta";
import { SiteFooter } from "@/components/footer/site-footer";
import { Hero } from "@/components/hero/hero";
import { SiteNav } from "@/components/nav/site-nav";
import { OfferMarquee } from "@/components/offer/offer-marquee";
import { Philosophy } from "@/components/philosophy/philosophy";
import { ProblemRotation } from "@/components/problems/problem-rotation";
import { Teaser } from "@/components/teaser/teaser";
import { WorkGraphSection } from "@/components/workgraph/work-graph-section";
import { WorkflowSection } from "@/components/workflow/workflow-section";
import { SECTION } from "@/lib/site";

/**
 * The page as one composition, alternating between a statement and something
 * moving. Two scripted diagrams carry the argument, the marquee restates the
 * offer once mid-page, and the copy sections sit between them so neither kind of
 * section runs together.
 */
export default function Page() {
  return (
    <>
      <SiteNav />
      <main id={SECTION.main}>
        <Hero />
        <ProblemRotation />
        <WorkflowSection />
        <OfferMarquee />
        <WorkGraphSection />
        <Philosophy />
        <Teaser />
        <EarlyAccessSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
