export const siteConfig = {
  name: "zcarr.dev",
  description:
    "Code, systems, taste, and whatever else is rattling around in my head.",
  author: "ZC",
  linkedIn: "https://www.linkedin.com/in/zacariecarr",
  github: "https://github.com/zacariec",
  twitter: "https://x.com/zacariec",
  timezone: "Australia/Sydney",
} as const;

export const socialLinks = [
  { label: "Li", href: "https://www.linkedin.com/in/zacariecarr" },
  { label: "GH", href: "https://github.com/zacariec" },
  { label: "X", href: "https://x.com/zacariec" },
] as const;

export const navItems = [
  { href: "/", label: "Index" },
  { href: "/blog", label: "Writing" },
  { href: "/timeline", label: "Timeline" },
] as const;
