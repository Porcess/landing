import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

export function AgentDetails() {
  return (
    <Section
      className="agent-details-section"
      id="agent-details"
      labelledBy="agent-details-heading"
    >
      <Container>
        <div className="product-section-intro">
          <h2 id="agent-details-heading">
            A focused agent for each kind of work.
          </h2>
          <p>
            Start with the job in front of you. Keep the output, evidence, and
            next action together.
          </p>
        </div>
        <div className="agent-details-list">
          {siteCopy.agents.map((agent) => (
            <article key={agent.id}>
              <span>{agent.studio}</span>
              <h3>{agent.name}</h3>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
