/**
 * Every string the visitor can read.
 *
 * Three rules apply to all of it:
 *
 * 1. No em-dashes or en-dashes anywhere. The brief's numbered benefits are a
 *    separate column instead, and its dot-joined offer strip is separate items.
 * 2. At most one middot per line.
 * 3. No claim the business cannot honour. The discount is scoped to the first
 *    three months everywhere it appears, and the giveaway states what is won,
 *    how long it lasts, and that no purchase is needed.
 */
export const siteCopy = {
  brand: "Porcess",

  /**
   * The offer, stated once here so every surface says the same thing. The
   * short form is for places with no room to qualify it; it still carries the
   * three-month scope, because an unqualified "90% off" is the ambiguous
   * promise worth avoiding.
   */
  offer: {
    discount: "90% off your first 3 months",
    short: "90% off for 3 months",
    giveaway: "Chance to win 3 months free",
    giveawayLong:
      "One early signup wins a free subscription for 3 months, drawn when we launch. No purchase needed.",
    strip: ["90% OFF FOR 3 MONTHS", "CHANCE TO WIN 3 MONTHS FREE"],
    combined: "90% off for 3 months + a chance to win 3 months free",
  },

  nav: {
    label: "Primary",
    cta: "EARLY ACCESS",
    target: "early-access",
  },

  hero: {
    /** The screen reader and crawler text. The animated letters are decorative. */
    headline: "Trust the Porcess",
    eyebrow: "TRUST THE",
    before: "PROCESS",
    after: "PORCESS",
    question: "What happens after \u201cit works\u201d?",
    hook: "You built the thing. Now comes everything else.",
  },

  problems: {
    label: "SOUND FAMILIAR?",
    status: "Processing",
    items: [
      {
        id: "marketing",
        title: "Made an app. Can\u2019t figure out marketing?",
        body: "You built something worth using. Now you have to figure out how anyone finds it.",
      },
      {
        id: "production",
        title: "Vibecoded your website. Can\u2019t get it into production?",
        body: "The demo works perfectly. Production has other plans.",
      },
      {
        id: "regressions",
        title: "Shipped a feature. Broke two others?",
        body: "Moving fast is great until you\u2019re spending the next day fixing yesterday.",
      },
      {
        id: "attention",
        title: "Built something great. Nobody knows it exists?",
        body: "Making the product was hard. Getting attention for it shouldn\u2019t be harder.",
      },
      {
        id: "time",
        title: "Know what needs doing. Don\u2019t have the time?",
        body: "The list keeps growing. There are still only 24 hours in a day.",
      },
    ],
  },

  workflow: {
    headline: "Building is only the beginning.",
    /**
     * Node labels for the cinematic graph. The story it tells without a single
     * sentence of explanation: work moves forward, one step fails, the failure
     * costs extra work, and the flow only closes by looping back to the start.
     */
    nodes: {
      build: "BUILD",
      test: "TEST",
      ship: "SHIP",
      market: "MARKET",
      distribute: "DISTRIBUTE",
      debug: "DEBUG",
      iterate: "ITERATE",
    },
    status: {
      queued: "QUEUED",
      running: "RUNNING",
      done: "DONE",
      failed: "FAILED",
    },
    /** The line that lands after the flow resolves. */
    verdict: "That\u2019s the problem.",
    follow: "We\u2019re building Porcess.",
    caption: "One step failed. Four more appeared.",
  },

  graph: {
    headline: "Nothing happens in isolation.",
    body: "One thing ships. Three more things appear.",
    nodes: {
      ship: "SHIP",
      test: "TEST",
      market: "MARKET",
      docs: "DOCS",
      debug: "DEBUG",
      distribute: "DISTRIBUTE",
      iterate: "ITERATE",
      build: "BUILD",
    },
    caption: "Seven tasks. You started with one.",
  },

  philosophy: {
    statement:
      "You shouldn\u2019t need a team of ten to turn an idea into reality.",
    support:
      "And you shouldn\u2019t have to become ten different people yourself.",
    body: "We\u2019re building Porcess for founders, builders, developers, creators, and small teams who want to spend more time building, and less time fighting everything around it.",
  },

  teaser: {
    headline: "We\u2019re already working on it.",
    body: "You just can\u2019t see all of it yet.",
    /** Labels for the abstract monitor. Deliberately generic, never a real feature. */
    monitor: [
      "scoping",
      "drafting",
      "checking",
      "publishing",
      "measuring",
      "revising",
    ],
  },

  earlyAccess: {
    headline: "Get in before the doors open.",
    body: "Porcess isn\u2019t public yet. Join the early list for 90% off your first 3 months, and a chance to win 3 months free.",
    benefitsLabel: "Early birds get:",
    /**
     * `scale` rather than a boolean emphasis flag, because there are now two
     * benefits worth leading with and the discount still has to be the loudest
     * thing in the section.
     */
    benefits: [
      {
        number: "01",
        title: "90% off for 3 months",
        body: "Your first 3 months of Porcess at 90% off when we launch.",
        scale: "primary" as const,
      },
      {
        number: "02",
        title: "Chance to win 3 months free",
        body: "One early signup wins a free subscription for 3 months, drawn when we launch. No purchase needed.",
        scale: "secondary" as const,
      },
      {
        number: "03",
        title: "Beta access",
        body: "Get access to early builds before public launch.",
        scale: "normal" as const,
      },
      {
        number: "04",
        title: "Help shape Porcess",
        body: "Early users can influence what we build next.",
        scale: "normal" as const,
      },
    ],
  },

  finalCta: {
    first: "You built the thing.",
    second: "We\u2019ll handle what\u2019s next.",
    points: [
      "90% off for 3 months",
      "Chance to win 3 months free",
      "Beta access",
    ],
  },

  form: {
    label: "Email address",
    placeholder: "you@example.com",
    submit: "GET EARLY ACCESS \u2192",
    submitting: "GETTING YOU IN",
    heroNote:
      "Early birds get 90% off for 3 months + a chance to win 3 months free.",
    idleHint: "No spam. Just one email when it\u2019s time.",
    invalid: "That doesn\u2019t look like an email address.",
    empty: "Enter your email address to join the early list.",
    failed: "Something went wrong on our end. Try again.",
    unavailable: "Signups aren\u2019t connected yet. Try again shortly.",
    success: {
      headline: "You\u2019re in.",
      welcome: "Welcome to Porcess.",
      month:
        "You\u2019re on the list for 90% off your first 3 months when Porcess launches.",
      later: "You\u2019re also in the draw for 3 months free.",
      duplicate: "You were already on the list.",
    },
  },

  footer: {
    line: "Building quietly. Launching soon.",
    cta: "EARLY ACCESS",
    copyright: "\u00a9 2026 Porcess",
  },

  meta: {
    title: "Porcess - Building what comes after",
    description:
      "You built the thing. Now comes everything else. Porcess is building something for the work around building.",
    ogAlt:
      "Porcess. You built the thing. Now comes everything else. Early access is open.",
  },
} as const;
