import { NeuralBlobNet } from "@/components/organisms/neural-blob-net";
import { PostList } from "@/components/organisms/post-list";
import { getAllPosts } from "@/lib/sanity/fetch";

import { BlogHeader } from "./blog-header";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Long-form writing on design, code, and the patterns that shape how we build things.",
  openGraph: {
    title: "Writing — zcarr.dev",
    description:
      "Long-form writing on design, code, and the patterns that shape how we build things.",
    type: "website",
  },
  alternates: {
    canonical: "/blog",
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  const mappedPosts = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    date: p.date,
    readingTime: p.readingTime,
    commentCount: p.commentCount,
  }));

  return (
    <div>
      <div className="relative h-[30vh] md:h-[40vh] overflow-hidden">
        <NeuralBlobNet nodeCount={mappedPosts.length} />
      </div>
      <div className="px-5 md:px-16 pt-8 md:pt-16 pb-20 md:pb-32">
        <BlogHeader />
        <div className="mt-16 md:mt-24">
          <PostList posts={mappedPosts} variant="full" />
        </div>
      </div>
    </div>
  );
}
