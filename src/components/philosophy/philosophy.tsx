import { ViewEvent } from "@/components/analytics/view-event";
import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

/**
 * One statement, then its support beside it rather than stacked under it.
 *
 * The earlier version was a single narrow column with a lot of air around it.
 * Two columns at the wide breakpoint keeps the asymmetry and removes the dead
 * space, without turning the section into a feature list.
 */
export function Philosophy() {
  return (
    <Section id="philosophy" labelledBy="philosophy-label">
      <ViewEvent event="philosophy_section_view" target="philosophy" />
      <Container>
        <h2
          className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
          id="philosophy-label"
        >
          {siteCopy.philosophy.statement}
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-12">
          <p className="max-w-measure text-lead text-ink lg:col-span-5">
            {siteCopy.philosophy.support}
          </p>
          <p className="max-w-measure text-base text-ink-muted lg:col-span-6 lg:col-start-7">
            {siteCopy.philosophy.body}
          </p>
        </div>
      </Container>
    </Section>
  );
}
