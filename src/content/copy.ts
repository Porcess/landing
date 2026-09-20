/**
 * Every string the visitor can read. Keep product claims grounded in the
 * workflows currently represented by the frontend and backend.
 *
 * The discount is the one value that is not fixed here: it is the active offer
 * (D-100), so anything that names it is produced by `offerText(percent)` at
 * render time rather than stored as a literal. That keeps the page from ever
 * contradicting the offer the signup actually locked in.
 */

export const siteCopy = {
  brand: "Porcess",

  nav: {
    label: "Primary",
    howItWorks: "HOW IT WORKS",
    cta: "EARLY ACCESS",
  },

  hero: {
    eyebrow: "THE WORK AFTER THE WORK",
    headline: "Build the thing. Let Porcess handle what comes next.",
    question: "Your product is only the beginning.",
    hook: "Porcess gives product teams focused agents for the work around building: content, marketing, search, and the next release.",
  },

  agents: [
    {
      id: "clips",
      label: "CLIP SELECTION",
      title: "Clips",
      name: "Clips AI Agent",
      description: "Create video shorts and highlight clips.",
      detail:
        "Find the moments worth keeping, then turn long-form video into short-form content.",
      studio: "Creator Studio",
    },
    {
      id: "shorts",
      label: "SHORTS BUILDER",
      title: "Shorts",
      name: "Shorts Builder",
      description: "Turn a topic into an editable narrated short.",
      detail:
        "Move from one idea to a structured script, scenes, captions, and narration.",
      studio: "Creator Studio",
    },
    {
      id: "marketing",
      label: "FOUNDER-LED MARKETING",
      title: "Marketing",
      name: "Marketing AI Agent",
      description: "Turn company knowledge into grounded marketing.",
      detail:
        "Research your company, organize what it knows, and turn that context into useful marketing work.",
      studio: "Growth Studio",
    },
    {
      id: "seo",
      label: "SEARCH OPPORTUNITIES",
      title: "SEO",
      name: "SEO AI Agent",
      description: "Turn search opportunities into organic growth.",
      detail:
        "Audit your search presence, identify what matters, and leave a clear path to improvement.",
      studio: "Growth Studio",
    },
  ],

  howItWorks: {
    headline: "The work moves forward in four steps.",
    body: "Porcess turns a consequential task into a bounded run with context, evidence, and a clear next action.",
    steps: [
      {
        number: "01",
        title: "Connect context",
        body: "Give an agent the product, repository, or company context it needs.",
      },
      {
        number: "02",
        title: "Choose the work",
        body: "Start a focused task instead of opening another empty dashboard.",
      },
      {
        number: "03",
        title: "Review evidence",
        body: "The run returns observations, artifacts, findings, and limitations.",
      },
      {
        number: "04",
        title: "Take the next action",
        body: "Keep the work, approve a safe change, or send the task back with direction.",
      },
    ],
  },

  pricing: {
    label: "EARLY ACCESS PRICING",
    headline: "Lock in the launch price.",
    body: "One price, set once. Everyone who joins during an offer keeps that offer after launch.",
    standardLabel: "Standard",
    perMonth: "/ month",
    cta: "GET EARLY ACCESS",
  },

  /**
   * Strings that name the discount. `{percent}` is replaced with the active
   * offer at render time, so the page can never state a discount the signup did
   * not lock in.
   */
  offer: {
    nav: "{percent}% off",
    heroNote: "Early birds get {percent}% off.",
    onList: "You’re on the list for {percent}% off when Porcess launches.",
  },

  earlyAccess: {
    headline: "Get in before the doors open.",
    body: "Porcess is building the operating layer for the work around building. Join the early list for {percent}% off.",
    benefitsLabel: "Early access includes:",
    benefits: [
      {
        number: "01",
        title: "{percent}% off",
        body: "Porcess at {percent}% off when we launch.",
        scale: "primary" as const,
      },
      {
        number: "02",
        title: "Beta access",
        body: "Get access to early builds before public launch.",
        scale: "normal" as const,
      },
      {
        number: "03",
        title: "Help shape Porcess",
        body: "Early users can influence what we build next.",
        scale: "normal" as const,
      },
    ],
  },

  form: {
    label: "Email address",
    placeholder: "you@example.com",
    submit: "GET EARLY ACCESS →",
    submitting: "GETTING YOU IN",
    idleHint: "No spam. Just one email when it’s time.",
    invalid: "That doesn’t look like an email address.",
    empty: "Enter your email address to join the early list.",
    failed: "Something went wrong on our end. Try again.",
    unavailable: "Signups aren’t connected yet. Try again shortly.",
    success: {
      headline: "You’re in.",
      welcome: "Welcome to Porcess.",
      duplicate: "You were meant to be on the list.",
    },
  },

  footer: {
    line: "Building the work after the work.",
    cta: "EARLY ACCESS",
    copyright: "© 2026 Porcess",
  },

  meta: {
    title: "Porcess | Agents for the work after the work",
    description:
      "Porcess gives product teams focused agents for content, marketing, search, and the work around building.",
    ogAlt: "Porcess agents for the work after the work.",
  },
} as const;

/**
 * Fills `{percent}` in an offer string.
 *
 * Plain replacement rather than a template engine: the only placeholder on the
 * page is the discount, and `String.replace` with a fixed token cannot
 * accidentally interpret anything else in the copy.
 */
export function fillOffer(template: string, percent: number): string {
  return template.replaceAll("{percent}", String(percent));
}
