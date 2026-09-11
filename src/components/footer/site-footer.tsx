import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { SECTION } from "@/lib/site";

/** Minimal on purpose. No social links, because there are no real ones yet. */
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <Container className="flex flex-col gap-8 py-14 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold tracking-eyebrow text-ink uppercase">
            {siteCopy.brand.toUpperCase()}
          </p>
          <p className="mt-3 text-sm text-ink-muted">{siteCopy.footer.line}</p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <a
            className="focus-ring w-fit font-mono text-xs tracking-label text-ink-muted uppercase transition-colors duration-150 hover:text-ink"
            href={`#${SECTION.earlyAccess}`}
          >
            {siteCopy.footer.cta}
          </a>
          <p className="font-mono text-xs text-ink-muted">
            {siteCopy.footer.copyright}
          </p>
        </div>
      </Container>
    </footer>
  );
}
