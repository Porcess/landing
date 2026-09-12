import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { SECTION } from "@/lib/site";

import { RoleReel } from "./role-reel";

/**
 * The origin story.
 *
 * Founder-built rather than a generic "something exciting is coming" curtain: a
 * small team describing the mess they live in, with the roles they juggle
 * travelling past beside it. There are no product words anywhere in this
 * section. The reel's words are lives, not features, so the section can never be
 * mistaken for a screenshot or a claim about a feature.
 *
 * The columns are deliberately unequal and the reel is not centred against the
 * copy. Five and seven with no gutter between them puts the reel at the optical
 * centre of the right half, which is where the movement needs to sit, instead of
 * the two even halves that read as a panel.
 */
export function Teaser() {
  return (
    <section
      aria-labelledby="teaser-label"
      className="relative border-y border-hairline bg-ground-raised"
      id={SECTION.teaser}
    >
      {/* Same vertical rhythm as every other section, so the page keeps one
          beat. */}
      <Container className="py-20 sm:py-28 lg:py-36">
        {/* `grid-cols-1` and `min-w-0` are both load bearing: an implicit auto
            column sizes itself to a child's min-content width, which is how a
            long word pushed the layout past a 320px viewport in an earlier
            revision. */}
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-5">
            <p className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase">
              {siteCopy.teaser.eyebrow}
            </p>
            <h2
              className="mt-5 max-w-statement font-display text-statement font-semibold text-balance text-ink"
              id="teaser-label"
            >
              {siteCopy.teaser.headline}
            </h2>
            <p className="mt-6 max-w-measure text-lead text-ink-muted">
              {siteCopy.teaser.body}
            </p>
            <p className="mt-4 max-w-measure text-lead text-ink-muted">
              {siteCopy.teaser.detail}
            </p>
            <p className="mt-6 max-w-measure font-display text-lead font-medium text-ink">
              {siteCopy.teaser.closing}
            </p>
          </div>

          {/* The reel's own height is fixed by its slot count, so it never
              changes and nothing below it can shift as the words move. */}
          <div className="min-w-0 lg:col-span-7">
            <RoleReel />
          </div>
        </div>
      </Container>
    </section>
  );
}
