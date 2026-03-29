import type { Metadata } from "next";

import { Partytown } from "@builder.io/partytown/react";

import { ClientBlobCursor } from "@/components/organisms/client-blob-cursor";
import { Footer } from "@/components/organisms/footer";
import { Navbar } from "@/components/organisms/navbar";
import { PageTransition } from "@/components/organisms/page-transition";
import { PageShell } from "@/components/templates/page-shell";
import { inter, spaceGrotesk } from "@/lib/fonts";
import { getSiteConfig } from "@/lib/sanity/fetch";

import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();

  return {
    title: {
      default: `zcarr.dev — Design, Code & Unfiltered Thinking`,
      template: `%s | zcarr.dev`,
    },
    description:
      "A space for long-form thinking on design, engineering, and the details most people skip.",
    authors: [{ name: config.author, url: config.linkedIn }],
    creator: config.author,
    publisher: config.author,
    metadataBase: config.siteUrl ? new URL(config.siteUrl) : undefined,
    keywords: [
      "design",
      "engineering",
      "systems thinking",
      "web development",
      "Zacarie Carr",
      "code",
      "writing",
    ],
    category: "technology",
    openGraph: {
      type: "website",
      locale: "en_AU",
      siteName: "zcarr.dev",
      title: "zcarr.dev — Design, Code & Unfiltered Thinking",
      description:
        "Thoughts on design systems, software engineering, and the quiet spaces in between.",
      ...(config.ogImage?.url && {
        images: [
          {
            url: config.ogImage.url,
            width: 1200,
            height: 630,
            alt: config.ogImage.alt || config.siteName,
          },
        ],
      }),
      ...(config.siteUrl && { url: config.siteUrl }),
    },
    twitter: {
      card: "summary_large_image",
      title: "zcarr.dev — Design, Code & Unfiltered Thinking",
      description:
        "A space for long-form thinking on design, engineering, and the details most people skip.",
      ...(config.ogImage?.url && {
        images: [config.ogImage.url],
      }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: config.siteUrl || undefined,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig();

  return (
    <html className={`${spaceGrotesk.variable} ${inter.variable}`} lang="en">
      <head>
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style" />
        <meta content="ZC" name="apple-mobile-web-app-title" />
        <Partytown forward={["dataLayer.push", "gtag"]} />
      </head>
      <body className="min-h-screen bg-[#f9f9f7] font-[family-name:var(--font-space-grotesk)]">
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
      </body>
    </html>
  );
}
