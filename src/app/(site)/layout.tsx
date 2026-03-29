import { ClientBlobCursor } from "@/components/organisms/client-blob-cursor";
import { Footer } from "@/components/organisms/footer";
import { Navbar } from "@/components/organisms/navbar";
import { PageTransition } from "@/components/organisms/page-transition";
import { PageShell } from "@/components/templates/page-shell";
import { getSiteConfig } from "@/lib/sanity/fetch";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig();

  return (
    <>
      <ClientBlobCursor />
      <PageTransition />
      <Navbar navItems={config.navItems} />
      <main className="pt-[56px] md:pt-[72px] pb-[64px] md:pb-0 max-w-[1440px] mx-auto">
        <PageShell>{children}</PageShell>
      </main>
      <Footer
        heading={config.footerHeading}
        navItems={config.navItems}
        subtitle={config.footerSubtitle}
      />
    </>
  );
}
