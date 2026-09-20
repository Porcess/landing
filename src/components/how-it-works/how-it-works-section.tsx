import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { SECTION } from "@/lib/site";

export function HowItWorksSection() {
  return (
    <Section id={SECTION.howItWorks} labelledBy="how-it-works-heading">
      <Container>
        <div className="product-section-intro">
          <h2 id="how-it-works-heading">{siteCopy.howItWorks.headline}</h2>
          <p>{siteCopy.howItWorks.body}</p>
        </div>
        <ol className="product-steps">
          {siteCopy.howItWorks.steps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
