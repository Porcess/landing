"use client";

import { motion, useReducedMotion } from "motion/react";

import { siteCopy } from "@/content/copy";

import { AgentArt } from "./agent-art";

const rotations = [3, -2.5, 3.5, 4, -3.5];
const colors = [
  "agent-card-rose",
  "agent-card-teal",
  "agent-card-sage",
  "agent-card-coral",
  "agent-card-ink",
];

/**
 * The agent deck.
 *
 * Each card is the whole agent: a kind pill in the top-right corner, the agent's
 * name, one concise line naming what it does, and one piece of artwork below. The
 * card reads as a portrait: name, purpose, then the composition.
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
          whileHover={
            reduced
              ? undefined
              : {
                  y: -16,
                  /* Only part of the way back toward upright: the card keeps its
                     tilt and leans slightly the other way rather than snapping
                     straight. */
                  rotate: rotations[index] * 0.6,
                  scale: 1.025,
                  /* The staggered entrance delay must not carry into hover: the
                     card lifts the moment the pointer is over it. */
                  transition: { delay: 0, duration: 0.25 },
                }
          }
        >
          <div className="agent-card-top">
            <span className="agent-card-label">{agent.label}</span>
            <h2 className="agent-card-title">{agent.title}</h2>
            <p className="agent-card-desc">{agent.description}</p>
          </div>

          <AgentArt kind={agent.id} />

          <p className="agent-card-studio">{agent.studio}</p>
        </motion.article>
      ))}
    </div>
  );
}
