/**
 * The page's motion vocabulary.
 *
 * One entry per intent, named for what it communicates rather than for its
 * curve, so a new animation picks an intent instead of inventing a bezier. Four
 * near-identical decelerations spread across six components is what makes motion
 * feel slightly inconsistent without anyone being able to point at why.
 */

/** Content arriving: fast out of the gate, long settle. Reveals and eyebrows. */
export const EASE_ENTER = [0.16, 1, 0.3, 1] as const;

/**
 * A large element crossing a distance: gentle at both ends, so it never jerks
 * into motion or stops dead. The hero's scan line.
 */
export const EASE_SWEEP = [0.5, 0, 0.2, 1] as const;

/**
 * A state change settling into place. A long decelerate with no overshoot:
 * overshoot reads as a bounce rather than as weight.
 */
export const EASE_SETTLE = [0.25, 1, 0.4, 1] as const;

/** Editorial crossfade between two statements. Standard ease in, ease out. */
export const EASE_CROSSFADE = [0.4, 0, 0.2, 1] as const;

/** One traversal of a diagram edge. */
export const PULSE_SECONDS = 2.1;
