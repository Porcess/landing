import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

/**
 * A deliberately non-representational composition.
 *
 * This is the closest the page comes to showing the product, and it shows
 * nothing: no words, no interface chrome, no terminal, no controls. Just soft
 * light, hairline rules at unreadable widths and a few drifting bars. It is not
 * a mock of anything, so it cannot misrepresent anything.
 *
 * The decorative layer is hidden from assistive technology, cannot receive
 * pointer events, and is contained exactly within the section box. Nothing here
 * bleeds outside its own bounds on purpose: a decorative element overlapping
 * neighbouring text makes contrast impossible to verify mechanically, and a
 * teaser is not worth an unverifiable page.
 *
 * The loops only run when reduced motion is not requested.
 */

const RULE_WIDTHS = [62, 38, 74, 52, 30, 44];
const BAR_DELAYS = [0, 4.5, 9, 12.5];

export function Teaser() {
  return (
    <section
      aria-labelledby="teaser-label"
      className="relative isolate overflow-hidden border-y border-hairline bg-ground-raised"
      id="teaser"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="teaser-light-a absolute inset-0" />
        <div className="teaser-light-b absolute inset-0" />

        <div className="absolute inset-x-6 top-12 -bottom-12 -rotate-1 overflow-hidden border border-hairline bg-ground/50 sm:inset-x-16">
          <div className="flex flex-col gap-6 p-8 sm:p-12">
            {RULE_WIDTHS.map((width) => (
              <span
                className="block h-px bg-ink/10"
                key={width}
                style={{ width: `${width}%` }}
              />
            ))}
          </div>

          <div className="absolute inset-x-8 bottom-16 flex flex-col gap-4 sm:inset-x-12">
            {BAR_DELAYS.map((delay) => (
              <span
                className="teaser-bar block h-0.5 w-1/2 bg-ink/20"
                key={delay}
                style={{ animationDelay: `-${delay}s` }}
              />
            ))}
          </div>
        </div>

        <div className="teaser-veil absolute inset-0" />
      </div>

      <Container className="relative py-32 sm:py-44">
        <h2
          className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
          id="teaser-label"
        >
          {siteCopy.teaser.headline}
        </h2>
        <p className="mt-5 max-w-prose text-lead text-ink-muted">
          {siteCopy.teaser.body}
        </p>
      </Container>
    </section>
  );
}
