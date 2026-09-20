import type { ReactNode } from "react";

type AgentArtProps = { kind: "clips" | "shorts" | "marketing" | "seo" };

const bars = [18, 34, 24, 44, 28, 40, 22, 52, 30, 46, 26, 38, 20, 32];

function ClipsArt() {
  return (
    <div className="agent-art agent-art-clips" aria-hidden="true">
      <div className="art-window art-video-window">
        <div className="art-window-bar">
          <span />
          <span />
          <span />
          <b>01:42:18</b>
        </div>
        <div className="art-video-frame">
          <div className="art-video-subject" />
          <div className="art-video-caption">a moment worth keeping</div>
        </div>
        <div className="art-waveform">
          {bars.map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
          <em />
        </div>
      </div>
      <div className="art-clip-stack">
        <span className="art-clip-card art-clip-card-back" />
        <span className="art-clip-card art-clip-card-middle" />
        <span className="art-clip-card art-clip-card-front">
          <b>00:32</b>
          <i />
        </span>
      </div>
    </div>
  );
}

function ShortsArt() {
  return (
    <div className="agent-art agent-art-shorts" aria-hidden="true">
      <div className="art-topic-pill">
        <span />
        <b>one idea</b>
      </div>
      <div className="art-scene-list">
        {["HOOK", "CONTEXT", "TURN", "CLOSE"].map((label, index) => (
          <div className="art-scene" key={label}>
            <small>0{index + 1}</small>
            <span>{label}</span>
            <i />
          </div>
        ))}
      </div>
      <div className="art-short-preview">
        <div className="art-short-sky" />
        <div className="art-short-copy">make the next move</div>
        <div className="art-play">▶</div>
        <div className="art-short-progress" />
      </div>
    </div>
  );
}

function MarketingArt() {
  return (
    <div className="agent-art agent-art-marketing" aria-hidden="true">
      <div className="art-browser">
        <div className="art-window-bar">
          <span />
          <span />
          <span />
          <b>company context</b>
        </div>
        <div className="art-browser-line art-browser-line-strong" />
        <div className="art-browser-line" />
        <div className="art-browser-line art-browser-line-short" />
        <div className="art-browser-scan" />
      </div>
      <div className="art-knowledge-map">
        <i className="art-map-node art-map-node-main" />
        <i className="art-map-node art-map-node-one" />
        <i className="art-map-node art-map-node-two" />
        <i className="art-map-node art-map-node-three" />
        <i className="art-map-edge art-map-edge-one" />
        <i className="art-map-edge art-map-edge-two" />
        <i className="art-map-edge art-map-edge-three" />
      </div>
      <div className="art-strategy-note">
        <span>POSITIONING</span>
        <b>what the company knows</b>
        <i />
      </div>
    </div>
  );
}

function SeoArt() {
  return (
    <div className="agent-art agent-art-seo" aria-hidden="true">
      <div className="art-search-results">
        <div className="art-search-bar">
          <span>your product</span>
          <b>⌕</b>
        </div>
        {["/product", "/guide", "/compare", "/pricing"].map((path, index) => (
          <div
            className={`art-search-row ${index === 2 ? "is-issue" : ""}`}
            key={path}
          >
            <small>{index + 1}</small>
            <span>
              <b>{path}</b>
              <i />
            </span>
            {index === 2 ? <em /> : null}
          </div>
        ))}
      </div>
      <div className="art-ranking-chart">
        <span>ORGANIC POSITION</span>
        <svg viewBox="0 0 180 100" role="presentation">
          <path d="M4 86 C30 80 38 72 61 75 S90 52 111 58 S143 25 176 12" />
        </svg>
        <b>↑</b>
      </div>
    </div>
  );
}

export function AgentArt({ kind }: AgentArtProps): ReactNode {
  if (kind === "clips") return <ClipsArt />;
  if (kind === "shorts") return <ShortsArt />;
  if (kind === "marketing") return <MarketingArt />;
  return <SeoArt />;
}
