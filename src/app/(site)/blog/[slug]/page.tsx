import { notFound } from "next/navigation";

import { getPostBySlug, getSiteConfig } from "@/lib/sanity/fetch";

import { BlogPostContent } from "./blog-post-content";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, config] = await Promise.all([getPostBySlug(slug), getSiteConfig()]);
  if (!post) return { title: "Post Not Found" };

  const description =
    post.subtitle || post.excerpt || `${post.title} — a piece of writing by ${config.author}`;
  const url = config.siteUrl ? `${config.siteUrl}/blog/${slug}` : undefined;

  return {
    title: post.title,
    description,
    authors: [{ name: config.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.date,
      authors: [config.author],
      section: "Writing",
      ...(url && { url }),
      ...(post.featuredImage?.url && {
        images: [{ url: post.featuredImage.url, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      ...(post.featuredImage?.url && {
        images: [post.featuredImage.url],
      }),
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, config] = await Promise.all([getPostBySlug(slug), getSiteConfig()]);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.subtitle || post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: config.author,
      ...(config.linkedIn && { url: config.linkedIn }),
    },
    publisher: {
      "@type": "Person",
      name: config.author,
    },
    ...(config.siteUrl && { url: `${config.siteUrl}/blog/${post.slug}` }),
    ...(config.siteUrl && { mainEntityOfPage: `${config.siteUrl}/blog/${post.slug}` }),
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <BlogPostContent post={post} />
    </>
  );
}
