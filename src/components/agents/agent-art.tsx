import type { ReactNode } from "react";

const WAVE = [40, 72, 55, 88, 34, 66, 92, 48, 74, 38, 60, 84];
const SCENES = ["Hook", "Context", "Example", "Payoff"];

type AgentArtProps = { kind: "clips" | "shorts" | "marketing" | "seo" };

/**
 * The artwork in the middle of an agent card.
 *
 * One composition per agent, drawn only with shapes and `currentColor`, so every
 * piece inherits the card's ink and the same markup reads on all four card
 * colors. The whole composition is decorative: the card's own label, title,
 * description, detail, and studio carry the meaning, so the art is hidden from
 * assistive technology and its small labels are not read out as content. Motion
 * lives in the stylesheet and every animation has a still state that reads on its
 * own.
 */
function ClipsArt() {
  return (
    <>
      <div className="art-window">
        <div className="art-bar">
          <i />
          <i />
          <i />
          <b>source.mp4</b>
        </div>
        <div className="art-frame">
          <div className="art-subject" />
          <div className="art-caption">00:14:02 · keynote</div>
        </div>
        <div className="art-wave">
          {WAVE.map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
          <em />
        </div>
      </div>
      <div className="art-stack">
        <span className="art-clip art-clip-back" />
        <span className="art-clip art-clip-mid" />
        <span className="art-clip art-clip-front">
          <b>0:24</b>
          <i />
        </span>
      </div>
    </>
  );
}

function ShortsArt() {
  return (
    <>
      <div className="art-pill">
        <span />
        topic · onboarding
      </div>
      <div className="art-scenes">
        {SCENES.map((label, index) => (
          <div className="art-scene" key={label}>
            <small>0{index + 1}</small>
            <span>{label}</span>
            <i />
          </div>
        ))}
      </div>
      <div className="art-short">
        <div className="art-short-sky" />
        <div className="art-short-copy">
          Ship the idea, not the spreadsheet.
        </div>
        <span className="art-play">▶</span>
        <div className="art-short-bar" />
      </div>
    </>
  );
}

function MarketingArt() {
  return (
    <>
      <div className="art-browser">
        <div className="art-bar">
          <i />
          <i />
          <i />
          <b>positioning</b>
        </div>
        <div className="art-line art-line-strong" />
        <div className="art-line" />
        <div className="art-line art-line-short" />
        <div className="art-line" />
        <div className="art-scan" />
      </div>
      <div className="art-map">
        <span className="art-edge art-edge-1" />
        <span className="art-edge art-edge-2" />
        <span className="art-edge art-edge-3" />
        <span className="art-node art-node-main" />
        <span className="art-node art-node-1" />
        <span className="art-node art-node-2" />
        <span className="art-node art-node-3" />
      </div>
    </>
  );
}

function SeoArt() {
  return (
    <>
      <div className="art-search">
        <div className="art-search-bar">
          <span>site:your-product.com</span>
          <b>↵</b>
        </div>
        <div className="art-row">
          <small>01</small>
          <span>
            <b>/pricing</b>
            <i />
          </span>
        </div>
        <div className="art-row is-issue">
          <small>02</small>
          <span>
            <b>/docs/start</b>
            <i />
          </span>
          <em />
        </div>
        <div className="art-row">
          <small>03</small>
          <span>
            <b>/changelog</b>
            <i />
          </span>
        </div>
      </div>
      <div className="art-chart">
        <span>Visibility</span>
        <svg preserveAspectRatio="none" viewBox="0 0 120 90">
          <path d="M4 78 C 34 74, 44 52, 62 44 S 96 20, 116 12" />
        </svg>
        <b>↑</b>
      </div>
    </>
  );
}

const ART: Record<AgentArtProps["kind"], () => ReactNode> = {
  clips: ClipsArt,
  shorts: ShortsArt,
  marketing: MarketingArt,
  seo: SeoArt,
};

export function AgentArt({ kind }: AgentArtProps) {
  const Art = ART[kind];

  return (
    <div aria-hidden="true" className="agent-card-art" data-art={kind}>
      <Art />
    </div>
  );
}
