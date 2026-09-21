"use client";

import { motion, useReducedMotion } from "motion/react";

import { siteCopy } from "@/content/copy";

import { AgentArt } from "./agent-art";

const rotations = [-5, -1.5, 2.5, 6];
const colors = [
  "agent-card-rose",
  "agent-card-teal",
  "agent-card-sage",
  "agent-card-coral",
];

/**
 * The agent deck.
 *
 * Each card is the whole agent: a kind pill in the top-right corner, the agent's
 * name, and one piece of artwork that fills the rest of the card and bleeds to its
 * edges. There is nothing in the card below the artwork: everything the card needs
 * to say is on the artwork or above it, so the card reads as a portrait rather than
 * as a clipped paragraph with an illustration.
 *
 * The deck sits on the hero's bottom edge as full cards and is wider than the
 * viewport, so the outermost cards bleed past it; the diagonal seam passes through
 * the Clips card, which is what ties the deck to the split behind it.
 */
export function AgentDeck() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-label="Porcess agents"
      className="agent-deck"
      id="agents"
      role="list"
    >
      {siteCopy.agents.map((agent, index) => (
        <motion.article
          animate={{ opacity: 1, y: 0, rotate: rotations[index] }}
          className={`agent-card ${colors[index]}`}
          initial={false}
          key={agent.id}
          role="listitem"
          transition={{
            delay: reduced ? 0 : 0.15 + index * 0.1,
            duration: 0.85,
            ease: [0.16, 1, 0.3, 1],
          }}
          whileHover={reduced ? undefined : { y: -16, rotate: 0, scale: 1.025 }}
        >
          <div className="agent-card-top">
            <span className="agent-card-label">{agent.label}</span>
            <h2 className="agent-card-title">{agent.title}</h2>
          </div>

          <AgentArt kind={agent.id} />

          <p className="agent-card-studio">{agent.studio}</p>
        </motion.article>
      ))}
    </div>
  );
}
