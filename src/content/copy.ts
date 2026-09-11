/**
 * Every string the visitor can read.
 *
 * Two deliberate departures from the original brief, both forced by this
 * project's copy rules:
 *   1. No em-dashes or en-dashes anywhere. The brief's numbered benefits
 *      (`01 - 1 month free`) become a separate numbered column, and its em-dash
 *      inside the philosophy paragraph becomes a comma.
 *   2. Middots are rationed to at most one per line, so the closing
 *      `1 month free · Beta access · Early-user perks` strip is rendered as
 *      three separate items instead of one dot-joined string.
 */
export const siteCopy = {
  brand: "Porcess",

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

  sequence: {
    headline: "Building is only the beginning.",
    steps: [
      "BUILD",
      "SHIP",
      "TEST",
      "MARKET",
      "DISTRIBUTE",
      "ITERATE",
      "REPEAT",
    ],
    terminus: "MORE WORK",
    terminusBody: "There is enormous work surrounding the product itself.",
  },

  philosophy: {
    statement:
      "You shouldn\u2019t need a team of ten to turn an idea into reality.",
    support:
      "And you shouldn\u2019t have to become ten different people yourself.",
    body: "We\u2019re building Porcess for founders, builders, developers, creators, and small teams who want to spend more time building, and less time fighting everything around it.",
  },

  teaser: {
    headline: "We\u2019re not ready to show you yet.",
    body: "But we\u2019re getting close.",
  },

  earlyAccess: {
    headline: "Get in before everyone else.",
    body: "Porcess isn\u2019t public yet. Join the early list and be among the first to try it.",
    benefitsLabel: "Early birds get:",
    benefits: [
      {
        number: "01",
        title: "1 month free",
        body: "Your first month of Porcess is free when Porcess launches.",
        emphasized: true,
      },
      {
        number: "02",
        title: "Beta access",
        body: "Get access to early builds before public launch.",
        emphasized: false,
      },
      {
        number: "03",
        title: "Help shape Porcess",
        body: "Early users can influence what we build next.",
        emphasized: false,
      },
      {
        number: "04",
        title: "Early-user perks",
        body: "Early users may receive launch-era perks and trials.",
        emphasized: false,
      },
    ],
  },

  finalCta: {
    first: "You built the thing.",
    second: "Let\u2019s deal with everything else.",
    points: ["1 month free", "Beta access", "Early-user perks"],
  },

  form: {
    label: "Email address",
    placeholder: "you@example.com",
    submit: "GET EARLY ACCESS \u2192",
    submitting: "GETTING YOU IN",
    /** Hero placement: the shortest honest statement of the offer. */
    heroNote: "Early birds get 1 month free + beta access.",
    idleHint: "No spam. One email when it\u2019s time.",
    invalid: "That doesn\u2019t look like an email address.",
    empty: "Enter your email address to join the early list.",
    failed: "Something went wrong on our end. Try again.",
    unavailable: "Signups aren\u2019t connected yet. Try again shortly.",
    success: {
      headline: "You\u2019re in.",
      welcome: "Welcome to Porcess.",
      month: "Your first month will be free when Porcess launches.",
      later: "We\u2019ll let you know when it\u2019s time.",
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
