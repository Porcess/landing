import { siteCopy } from "@/content/copy";

/**
 * The offer, restated once mid-page as a slow horizontal strip.
 *
 * One marquee on the page, not several: a second one would make it filler rather
 * than a beat. The movement is CSS only, gated behind a no-preference media query
 * in the stylesheet, so a visitor who asked for less motion gets the same strip
 * sitting still rather than a strip that keeps sliding.
 *
 * The repeated half is hidden from assistive technology, so the offer is read
 * once rather than twice.
 */
export function OfferMarquee() {
  const items = siteCopy.offer.strip;

  return (
    <div className="overflow-hidden border-y border-hairline bg-ground-raised py-3">
      <div className="offer-marquee flex w-max">
        {[0, 1].map((copy) => (
          <div
            aria-hidden={copy === 1 ? "true" : undefined}
            className="flex shrink-0 items-center"
            key={copy}
          >
            {items.map((item) => (
              <span className="flex items-center" key={`${copy}-${item}`}>
                <span className="px-6 font-mono text-micro tracking-label text-ink uppercase">
                  {item}
                </span>
                <span
                  aria-hidden="true"
                  className="h-3 w-px shrink-0 bg-hairline-strong"
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
