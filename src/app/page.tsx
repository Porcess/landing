import { EarlyAccessSection } from "@/components/early-access/early-access-section";
import { FinalCta } from "@/components/final-cta/final-cta";
import { SiteFooter } from "@/components/footer/site-footer";
import { Hero } from "@/components/hero/hero";
import { SiteNav } from "@/components/nav/site-nav";
import { Philosophy } from "@/components/philosophy/philosophy";
import { ProblemRotation } from "@/components/problems/problem-rotation";
import { WorkSequence } from "@/components/sequence/work-sequence";
import { Teaser } from "@/components/teaser/teaser";
import { SECTION } from "@/lib/site";

export default function Page() {
  return (
    <>
      <SiteNav />
      <main id={SECTION.main}>
        <Hero />
        <ProblemRotation />
        <WorkSequence />
        <Philosophy />
        <Teaser />
        <EarlyAccessSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
