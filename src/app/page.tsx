import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/organisms/hero-section";
import { PostList } from "@/components/organisms/post-list";
import { Marquee } from "@/components/molecules/marquee";
import { BlobLink } from "@/components/atoms/blob-link";
import { NeuralBlobNet } from "@/components/organisms/neural-blob-net";
import { getLatestPosts, getLatestTimeline, getSiteConfig } from "@/lib/sanity/fetch";
import { HomeThoughts } from "./home-thoughts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latestPosts, latestThoughts, config] = await Promise.all([
    getLatestPosts(),
    getLatestTimeline(),
    getSiteConfig(),
  ]);

  const posts = latestPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    date: p.date,
    readingTime: p.readingTime,
  }));

  const hasHeroImage = !!config.heroImage?.url;
  const heroAlt = config.heroImage?.alt || "Neural pathways";
  const heroCaption = config.heroImage?.caption || "Fig 01 \u2014 Neural pathways";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: config.siteName,
        description: config.siteDescription,
        ...(config.siteUrl && { url: config.siteUrl }),
      },
      {
        "@type": "Person",
        name: config.author,
        ...(config.siteUrl && { url: config.siteUrl }),
        ...(config.linkedIn && { sameAs: [config.linkedIn] }),
        jobTitle: "Design Engineer",
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection
        subtitle={config.heroSubtitle}
        heading={config.heroHeading}
        description={config.heroDescription}
      />

      {/* Featured Image */}
      <section className="md:px-16 pb-16 md:pb-24">
        <div className={`overflow-hidden h-[60vh] md:h-[80vh] relative ${hasHeroImage ? "bg-[#f4f4f2]" : ""}`}>
          {hasHeroImage ? (
            <div className="absolute inset-0">
              <Image
                src={config.heroImage!.url}
                alt={heroAlt}
                fill
                className="object-cover mix-blend-multiply opacity-85"
                priority
              />
              <div className="absolute inset-0 bg-white mix-blend-saturation" />
            </div>
          ) : (
            <NeuralBlobNet nodeCount={latestPosts.length + latestThoughts.length} />
          )}
        </div>
        <p className="text-[9px] tracking-[1.5px] uppercase text-[#777777] mt-4 px-5 md:px-0 font-[family-name:var(--font-space-grotesk)]">
          {heroCaption}
        </p>
      </section>

      {/* Latest Writing + Recent Thoughts */}
      <div className="px-5 md:px-16 pb-20 md:pb-32 flex flex-col md:flex-row gap-16 md:gap-20">
        <section className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-12 md:mb-16">
            <h2
              className="text-[24px] md:text-[28px] tracking-[-1.5px] uppercase text-[#000000] font-[family-name:var(--font-space-grotesk)]"
              style={{ fontWeight: 700 }}
            >
              Latest Writing
            </h2>
            <Link
              href="/blog"
              className="text-[10px] tracking-[2px] uppercase text-[#777777] hover:text-[#000000] no-underline transition-colors duration-300 flex items-center gap-2 font-[family-name:var(--font-space-grotesk)]"
            >
              All
              <BlobLink size={16} color="#c6c6c6">
                <ArrowRight className="w-3 h-3" />
              </BlobLink>
            </Link>
          </div>
          <PostList posts={posts} variant="compact" />
        </section>

        <HomeThoughts entries={latestThoughts} />
      </div>

      <Marquee text={config.marqueeText} />
    </div>
  );
}
