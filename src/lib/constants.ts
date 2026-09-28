export const navItems = [
  { href: "/", label: "Index" },
  { href: "/sessions", label: "Sessions" },
  { href: "/timeline", label: "Timeline" },
  { href: "/about", label: "About" },
] as const;

export const HEADLINE_PRESETS = {
  "getting-it-out-there": ["Getting it", "out there."],
  "sessions-not-blogs": ["Sessions,", "not blogs."],
  "smashing-it-out": ["Smashing", "it out."],
  "written-not-edited": ["Written,", "not edited."],
  "thoughts-unfiltered": ["Thoughts,", "unfiltered."],
} as const;

export const siteConfig = {
  name: "zcarr.dev",
  description:
    "Sessions are me writing. Code, systems, work, and whatever else won't leave me alone. Not blogs. Mostly unedited.",
  author: "Zacarie Carr",
  timezone: "Australia/Sydney",
  headline: HEADLINE_PRESETS["getting-it-out-there"],
  readme:
    "Sessions are me writing. Smashing out what I think and how I feel about code, systems, work, and whatever else won't leave me alone. Not blogs. Mostly unedited.",
  socials: [
    { label: "X", url: "https://x.com/zc_carr" },
    { label: "GitHub", url: "https://github.com/zacariec" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/zacariecarr" },
  ],
} as const;
