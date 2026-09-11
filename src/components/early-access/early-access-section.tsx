import { EarlyAccessForm } from "@/components/early-access/early-access-form";
import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { SECTION } from "@/lib/site";

/**
 * The main conversion section.
 *
 * The offer and the form come first, and the benefits follow as a plain
 * numbered list with a single hairline per row, so nothing competes with the
 * field. The first benefit carries the weight because one free month is the
 * part that matters.
 */
export function EarlyAccessSection() {
  return (
    <Section id={SECTION.earlyAccess} labelledBy="early-access-label">
      <Container>
        <h2
          className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
          id="early-access-label"
        >
          {siteCopy.earlyAccess.headline}
        </h2>
        <p className="mt-5 max-w-prose text-lead text-ink-muted">
          {siteCopy.earlyAccess.body}
        </p>

        <div className="mt-8 max-w-xl sm:mt-10">
          <EarlyAccessForm placement="earlyAccess" />
        </div>

        <div className="mt-16 sm:mt-24">
          <h3 className="font-mono text-xs tracking-label text-ink-muted">
            {siteCopy.earlyAccess.benefitsLabel}
          </h3>

          <dl className="mt-6">
            {siteCopy.earlyAccess.benefits.map((benefit) => (
              <div
                className="grid gap-y-2 border-t border-hairline py-6 sm:grid-cols-12 sm:gap-x-6"
                key={benefit.number}
              >
                <dt className="sm:col-span-5 sm:flex sm:items-baseline sm:gap-4">
                  <span
                    className={cn(
                      "font-mono text-xs tracking-label",
                      benefit.scale === "normal"
                        ? "text-ink-muted"
                        : "text-ink",
                    )}
                  >
                    {benefit.number}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block font-display font-semibold text-ink sm:mt-0",
                      benefit.scale === "primary" && "text-2xl sm:text-3xl",
                      benefit.scale === "secondary" && "text-xl sm:text-2xl",
                      benefit.scale === "normal" && "text-lg",
                    )}
                  >
                    {benefit.title}
                  </span>
                </dt>
                <dd className="max-w-measure text-sm text-ink-muted sm:col-span-6 sm:col-start-7">
                  {benefit.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}
