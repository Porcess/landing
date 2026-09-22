/**
 * The site mark in the masthead lockup, beside the brand.
 *
 * The same two-square motif as the app icon, drawn with `currentColor` instead
 * of fixed strokes so it inherits the masthead's difference-blended white.
 * Decorative: the brand link already names Porcess for assistive technology.
 */
export function SiteMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 32 32"
    >
      <rect
        fill="none"
        height="13"
        stroke="currentColor"
        strokeWidth="2.5"
        width="13"
        x="5"
        y="5"
      />
      <rect
        fill="none"
        height="13"
        opacity="0.5"
        stroke="currentColor"
        strokeWidth="2.5"
        width="13"
        x="14"
        y="14"
      />
    </svg>
  );
}
