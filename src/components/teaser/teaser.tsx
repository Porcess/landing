import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

import { ProcessMonitor } from "./process-monitor";

/**
 * The curtain.
 *
 * Replaces the earlier "we are not ready yet" apology, which read as a product
 * that is unfinished rather than one that is close. The monitor beside it makes
 * the section do something: work is visibly moving, and none of it is explained.
 *
 * There are no product words anywhere in this section. The monitor's stages are
 * generic on purpose, so the section can never be mistaken for a screenshot or a
 * claim about a feature.
 */
export function Teaser() {
  return (
    <section
      aria-labelledby="teaser-label"
      className="relative border-y border-hairline bg-ground-raised"
      id="teaser"
    >
      {/* Same vertical rhythm as every other section, so the page keeps one
          beat. This band and the closing slab previously used a slightly
          different padding, which read as almost-but-not-quite aligned against
          the neighbouring sections. */}
      <Container className="py-20 sm:py-28 lg:py-36">
        {/* `grid-cols-1` and `min-w-0` are both load bearing: an implicit auto
            column sizes itself to a child's min-content width, which is how the
            monitor's longest row pushed the layout 9px past a 320px viewport. */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-6">
            <h2
              className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
              id="teaser-label"
            >
              {siteCopy.teaser.headline}
            </h2>
            <p className="mt-6 max-w-measure text-lead text-ink-muted">
              {siteCopy.teaser.body}
            </p>
          </div>

          <div className="min-w-0 lg:col-span-6">
            <ProcessMonitor />
          </div>
        </div>
      </Container>
    </section>
  );
}
