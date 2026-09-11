import { EarlyAccessForm } from "@/components/early-access/early-access-form";
import { ViewEvent } from "@/components/analytics/view-event";
import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

/**
 * The closing beat, and the one place the page inverts.
 *
 * Everything above is off-black with off-white ink; this slab is the reverse,
 * which makes the last call to action impossible to scroll past without seeing
 * it. It is a single deliberate colour block, not a second theme: the same two
 * colours, swapped once.
 */
export function FinalCta() {
  const id = "final-cta";

  return (
    <section
      aria-labelledby={`${id}-label`}
      className="bg-slab text-slab-ink"
      id={id}
    >
      <ViewEvent event="final_cta_view" target={id} />
      <Container className="py-20 sm:py-28 lg:py-36">
        <h2
          className="font-display text-statement font-semibold"
          id={`${id}-label`}
        >
          {siteCopy.finalCta.first}
        </h2>
        <p className="mt-1 font-display text-statement font-semibold">
          {siteCopy.finalCta.second}
        </p>

        <div className="mt-10 max-w-xl sm:mt-12">
          <EarlyAccessForm placement="final" tone="slab" />
        </div>

        <ul className="mt-10 flex flex-col gap-2 border-t border-slab-ink/25 pt-6 font-mono text-xs tracking-label uppercase sm:mt-12 sm:flex-row sm:gap-8">
          {siteCopy.finalCta.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
