import { EarlyAccessSection } from "@/components/early-access/early-access-section";
import { SiteFooter } from "@/components/footer/site-footer";
import { Hero } from "@/components/hero/hero";
import { SiteNav } from "@/components/nav/site-nav";
import { Philosophy } from "@/components/philosophy/philosophy";
import { ProblemRotation } from "@/components/problems/problem-rotation";
import { Teaser } from "@/components/teaser/teaser";
import { WorkGraphSection } from "@/components/workgraph/work-graph-section";
import { WorkflowSection } from "@/components/workflow/workflow-section";
import { SECTION } from "@/lib/site";

/**
 * The page as one composition, alternating between a statement and something
 * moving. Two scripted diagrams carry the argument, and the copy sections sit
 * between them so neither kind of section runs together.
 */
export default function Page() {
  return (
    <>
      <SiteNav />
      <main id={SECTION.main}>
        <Hero />
        <ProblemRotation />
        <WorkflowSection />
        <WorkGraphSection />
        <Philosophy />
        <Teaser />
        <EarlyAccessSection />
      </main>
      <SiteFooter />
    </>
  );
}
