export const navigation = [
  { number: "01", label: "Index", href: "/" },
  { number: "02", label: "Sessions", href: "/sessions" },
  { number: "03", label: "Timeline", href: "/timeline" },
  { number: "04", label: "About", href: "/about" },
  { number: "05", label: "Preferences", href: "/preferences" },
] as const;

export function publicPathname(pathname: string) {
  return pathname.replace(/^\/preview(?=\/|$)/, "") || "/";
}

export function currentNavigation(pathname: string) {
  const path = publicPathname(pathname);
  return (
    navigation.find((item) => item.href !== "/" && path.startsWith(item.href)) ?? navigation[0]
  );
}
