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
          animate={{ opacity: 1, y: 0, rotate: rotations[index] }}
        >
          <div className="agent-card-copy">
            <span className="agent-card-label">{agent.label}</span>
            <h2>{agent.title}</h2>
            <p>{agent.description}</p>
          </div>
          <AgentArt kind={agent.id} />
        </motion.article>
      ))}
    </div>
  );
}
