// Per-client content, copy, and palette. The cow mascot artwork and the QR
// canvas stay hardcoded in App.jsx for now — swapping those per client is a
// separate asset-swap pass (see developent-docs/white-label-strategy.md).
export const clientConfig = {
  id: "hugo",
  brandName: "Hugo",
  fullBrandName: "Hugo Rewards",

  // Applied as CSS custom properties (--c-<key>) at the app root — every
  // color used outside the mascot/QR artwork reads from these.
  colors: {
    dark: "#1A1420",
    darkAlt: "#3D2B45",
    cream: "#F6EEDF",
    lilac: "#D8C3E8",
    purple: "#C9A8DC",
    gold: "#D9A441",
    muted: "#6E5A73",
    faint: "#8B7A93",
    border: "#ECE0F5",
    divider: "#E3D5ED",
    inactive: "#B8ACC0",
    error: "#8A2E2E",
    errorBg: "#FBEAEA",
    errorBorder: "#E3B8B8",
  },

  joinTagline: "Join up — buy 9, the 10th's on the cow.",
  joinReturningNote: "Already joined? Enter the same phone or email to get your card back.",
  greetingSubtitle: "Keep on mooing for more rewards!",
  loadingMessage: "You're just a moo away from making your day amazing.",

  loyalty: {
    stampsForReward: 9,
    codePrefix: "HUGO",
    earnCardBody: "Buy 9, the 10th's on the cow.",
    progressLabel: (n) => `Collect ${n} stamps for a free coffee`,
  },

  hero: {
    titleLines: ["Offbeat", "Coffee"],
    swirlLines: ["Small batch.", "Big mood."],
  },

  menuStrip: [
    { name: "The Usual", tag: "house oat latte", bg: "#F6EEDF" },
    { name: "Purple Day", tag: "ube cold foam", bg: "#D8C3E8" },
    { name: "Cow in Green", tag: "mint matcha", bg: "#C9DDB8" },
  ],

  menu: {
    intro: "Hugo keeps things small and offbeat rather than trying to be everything — a short menu, done properly, adapted for dietary requirements on request.",
    categories: [
      { title: "Coffee", body: "A small, considered coffee list pulled from our own house blend — proper speciality coffee, no fuss, made the way you like it." },
      { title: "Matcha", body: "Stone-ground ceremonial matcha, whisked to order. Earthy, vibrant, and never bitter — hot or over ice." },
      { title: "Food", body: "A short, honest food menu made fresh to order — think a proper sandwich and something warm on toast, not a hundred things done half-heartedly." },
    ],
    footerNote: "Ask in store for today's specials — the board changes more often than this page does.",
  },

  howToEarn: [
    { n: 1, title: "REGISTER", body: "Sign up for Hugo Rewards and get a free coffee just for joining, plus a treat on your birthday." },
    { n: 2, title: "VISIT US", body: "Collect a stamp on every visit. Just show your code when you order." },
    { n: 3, title: "REDEEM", body: "Buy 9 coffees, the 10th's on the cow. Simple as that." },
  ],

  gift: {
    title: "Birthday Coffee",
    body: "Free drink of your choice — valid all week of your birthday",
  },

  location: {
    intro: "One shop, in the West Village. Come find the purple building, mind the cow.",
    address: "17 Perry St, New York, NY 10014",
    hours: "7am – 7pm, every day",
    phone: "212-COW-HUGO",
  },

  // Placeholder links until per-client social handles are collected.
  social: {
    facebook: "#",
    tiktok: "#",
    instagram: "#",
  },

  // Basic deterrent, not real security — ships inside the app bundle. Fine for
  // keeping casual customers out of the staff view; replace with real Supabase
  // Auth before this matters for real security.
  staffPin: "4269",
};
