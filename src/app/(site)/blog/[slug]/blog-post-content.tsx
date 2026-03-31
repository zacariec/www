"use client";

import { PortableText } from "@portabletext/react";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BlobLink } from "@/components/atoms/blob-link";
import { FadeIn, RevealText } from "@/components/molecules/reveal-text";
import { CommentSection } from "@/components/organisms/comment-section";
import { NeuralBlobNet } from "@/components/organisms/neural-blob-net";
import { urlFor } from "@/lib/sanity/client";

import type { SanityBlogPost } from "@/lib/sanity/types";

const ptComponents = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p
        className="text-[15px] md:text-[17px] text-[#1a1c1b] font-[family-name:var(--font-inter)]"
        style={{ lineHeight: 1.9, fontWeight: 400 }}
      >
        {children}
      </p>
    ),
  },
  types: {
    image: ({ value }: { value: { asset: { _ref: string }; alt?: string; caption?: string } }) => {
      const src = urlFor(value).width(1200).url();
      return (
        <figure className="my-8 md:my-12">
          <Image alt={value.alt || ""} className="w-full" height={800} src={src} width={1200} />
          {value.caption ? (
            <figcaption className="text-[9px] tracking-[1.5px] uppercase text-[#777777] mt-3 font-[family-name:var(--font-space-grotesk)]">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
  },
};

interface BlogPostContentProps {
  post: SanityBlogPost;
}

function isStringArray(content: unknown): content is string[] {
  return Array.isArray(content) && content.length > 0 && typeof content[0] === "string";
}

export const BlogPostContent = ({ post }: BlogPostContentProps) => {
  const isPortableText = !isStringArray(post.content);

  const comments = (post.comments || []).map((c, i) => ({
    id: c._id || String(i),
    author: c.author,
    authorImage: c.authorImage,
    date: c.date,
    text: c.text,
    likes: c.likes || 0,
    parentCommentId: c.parentCommentId,
  }));

  return (
    <div className="pb-20 md:pb-32">
      {/* Featured Image or Neural Net */}
      <div className="relative h-[30vh] md:h-[40vh] overflow-hidden mb-8">
        {post.featuredImage?.url ? (
          <Image
            fill
            priority
            alt={post.featuredImage.alt || post.title}
            className="object-cover"
            src={post.featuredImage.url}
          />
        ) : (
          <NeuralBlobNet nodeCount={comments.length + 40} />
        )}
      </div>

      {/* Header */}
      <div className="px-5 md:px-16 pt-4 md:pt-8 pb-12 md:pb-16">
        <FadeIn>
          <Link
            className="text-[10px] tracking-[2px] uppercase text-[#bbb] hover:text-black no-underline transition-colors duration-300 flex items-center gap-2 mb-12 md:mb-16 font-[family-name:var(--font-space-grotesk)]"
            href="/blog"
          >
            <BlobLink color="#c6c6c6" size={14}>
              <ArrowLeft className="w-3 h-3" />
            </BlobLink>
            Writing
          </Link>
        </FadeIn>

        <div className="max-w-[900px]">
          <FadeIn delay={0.1}>
            <p className="text-[10px] tracking-[3px] uppercase text-[#777777] mb-6 md:mb-8 font-[family-name:var(--font-space-grotesk)]">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              &mdash; {post.readingTime} read
            </p>
          </FadeIn>
          <RevealText
            as="h1"
            className="text-[clamp(32px,7vw,72px)] text-[#000000] tracking-[-0.04em] font-[family-name:var(--font-space-grotesk)]"
            style={{ fontWeight: 700, lineHeight: 0.95 }}
          >
            {post.title}
          </RevealText>
          <FadeIn delay={0.3}>
            <p
              className="text-[16px] md:text-[18px] text-[#777777] max-w-[500px] mt-6 md:mt-8 font-[family-name:var(--font-inter)]"
              style={{ lineHeight: 1.6, fontWeight: 300 }}
            >
              {post.subtitle}
            </p>
          </FadeIn>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
          {/* Left gutter */}
          <div className="md:col-span-2 hidden md:block">
            <FadeIn delay={0.4}>
              <div className="sticky top-[100px]">
                <div className="mb-10">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#c6c6c6] mb-2 font-[family-name:var(--font-space-grotesk)]">
                    Author
                  </p>
                  <p
                    className="text-[12px] text-[#000000] tracking-[0.5px] font-[family-name:var(--font-space-grotesk)]"
                    style={{ fontWeight: 500 }}
                  >
                    ZC
                  </p>
                </div>
                <div className="mb-10">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#c6c6c6] mb-2 font-[family-name:var(--font-space-grotesk)]">
                    Time
                  </p>
                  <p
                    className="text-[12px] text-[#000000] tracking-[0.5px] font-[family-name:var(--font-space-grotesk)]"
                    style={{ fontWeight: 500 }}
                  >
                    {post.readingTime?.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[2px] uppercase text-[#c6c6c6] mb-2 font-[family-name:var(--font-space-grotesk)]">
                    Replies
                  </p>
                  <p
                    className="text-[12px] text-[#000000] tracking-[0.5px] font-[family-name:var(--font-space-grotesk)]"
                    style={{ fontWeight: 500 }}
                  >
                    {comments.length}
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Main content */}
          <div className="md:col-span-7">
            <div className="space-y-8">
              {isPortableText ? (
                <div className="space-y-8">
                  <PortableText components={ptComponents} value={post.content} />
                </div>
              ) : (
                isStringArray(post.content) &&
                post.content.map((paragraph: string, i: number) => (
                  <FadeIn key={i} delay={0.1 * i}>
                    <p
                      className={`text-[#1a1c1b] font-[family-name:var(--font-inter)] ${i === 0 ? "text-[18px] md:text-[22px]" : "text-[15px] md:text-[17px]"}`}
                      style={{ lineHeight: 1.9, fontWeight: i === 0 ? 300 : 400 }}
                    >
                      {paragraph}
                    </p>
                  </FadeIn>
                ))
              )}
            </div>
          </div>

          {/* Right gutter */}
          <div className="md:col-span-3 hidden md:block">
            <FadeIn delay={0.5}>
              <div className="border-l border-[rgba(0,0,0,0.04)] pl-8">
                <p className="text-[9px] tracking-[2px] uppercase text-[#c6c6c6] mb-3 font-[family-name:var(--font-space-grotesk)]">
                  Note
                </p>
                <p
                  className="text-[12px] text-[#777777] italic font-[family-name:var(--font-inter)]"
                  style={{ lineHeight: 1.7 }}
                >
                  {post.sideNote ||
                    "\u201CThe best design is the one you don\u2019t notice. It gets out of the way and lets the content speak.\u201D"}
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      <CommentSection initialComments={comments} postSlug={post.slug} />
    </div>
  );
};
