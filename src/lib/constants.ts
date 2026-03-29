export const siteConfig = {
  name: "ZC Journal",
  description:
    "A personal archive of ideas, reflections, and long-form writing on design, technology, and the quiet spaces in between.",
  author: "ZC",
  linkedIn: "https://www.linkedin.com/in/zacariecarr",
  timezone: "Australia/Sydney",
} as const;

export const navItems = [
  { href: "/", label: "Index" },
  { href: "/blog", label: "Writing" },
  { href: "/timeline", label: "Timeline" },
] as const;
