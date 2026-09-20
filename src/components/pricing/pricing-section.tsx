import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import {
  discountLabel,
  formatUsd,
  hasDiscount,
  offerPriceCents,
  type Offer,
} from "@/lib/offer/format";
import { SECTION } from "@/lib/site";

/**
 * The price, stated once.
 *
 * The listed price and the discounted price sit side by side because the offer
 * only means anything next to what it is cutting: a discount shown alone is a
 * number, and a discount shown against its base is a reason to act. Both are
 * derived from the active offer, so the section cannot advertise a price the
 * signup will not honour.
 */
export function PricingSection({ offer }: { offer: Offer }) {
  const priceCents = offerPriceCents(offer);
  const discounted = hasDiscount(offer);

  return (
    <Section id={SECTION.pricing} labelledBy="pricing-label">
      <Container>
        <div className="product-section-intro">
          <div>
            <p className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase">
              {siteCopy.pricing.label}
            </p>
            <h2 id="pricing-label">{siteCopy.pricing.headline}</h2>
          </div>
          <p>{siteCopy.pricing.body}</p>
        </div>

        <div className="pricing-panel">
          <div className="pricing-figure">
            <p className="pricing-amount font-display">
              {formatUsd(priceCents)}
              <span className="pricing-period">
                {siteCopy.pricing.perMonth}
              </span>
            </p>

            {discounted ? (
              <p className="pricing-standard">
                <span className="pricing-standard-label">
                  {siteCopy.pricing.standardLabel}
                </span>
                <s className="pricing-strike">
                  {formatUsd(offer.basePriceCents)}
                </s>
              </p>
            ) : null}
          </div>

          <div className="pricing-action">
            {discounted ? (
              <p className="pricing-badge font-mono">
                {discountLabel(offer.percent)}
              </p>
            ) : null}
            <a
              className="focus-ring pricing-cta font-mono"
              href={`#${SECTION.earlyAccess}`}
            >
              {siteCopy.pricing.cta}
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
