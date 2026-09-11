import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

/**
 * One statement, set in an off-centre column so the page keeps its asymmetry.
 * No image, no card, no list: the type is the whole section.
 */
export function Philosophy() {
  return (
    <Section id="philosophy" labelledBy="philosophy-label">
      <Container>
        <div className="lg:grid lg:grid-cols-12">
          <div className="lg:col-span-8 lg:col-start-4">
            <h2
              className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
              id="philosophy-label"
            >
              {siteCopy.philosophy.statement}
            </h2>
            <p className="mt-6 max-w-measure text-lead text-ink-muted">
              {siteCopy.philosophy.support}
            </p>
            <p className="mt-8 max-w-measure text-base text-ink-muted">
              {siteCopy.philosophy.body}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
