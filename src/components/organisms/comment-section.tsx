"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { RevealText, FadeIn } from "@/components/molecules/reveal-text";
import { HorizontalLine } from "@/components/atoms/horizontal-line";
import { CommentCard } from "@/components/molecules/comment-card";
import { CommentForm } from "@/components/molecules/comment-form";

interface Comment {
  id: string;
  author: string;
  authorImage?: string;
  date: string;
  text: string;
  likes: number;
}

interface CommentSectionProps {
  initialComments: Comment[];
  postSlug: string;
}

export function CommentSection({ initialComments, postSlug }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const handleSubmit = async (author: string, text: string, authorImage?: string) => {
    const comment: Comment = {
      id: Date.now().toString(),
      author,
      authorImage,
      date: new Date().toISOString().split("T")[0],
      text,
      likes: 0,
    };
    setComments([...comments, comment]);

    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, postSlug }),
      });
    } catch {
      // Comment already added optimistically
    }
  };

  return (
    <SessionProvider>
      <div className="px-5 md:px-16 mt-20 md:mt-32">
        <div className="max-w-[720px] md:ml-[calc(16.666%+32px)]">
          <HorizontalLine />
          <div className="pt-12 md:pt-16">
            <RevealText>
              <h3
                className="text-[18px] md:text-[20px] tracking-[-1px] uppercase text-[#000000] mb-10 md:mb-12 font-[family-name:var(--font-space-grotesk)]"
                style={{ fontWeight: 700 }}
              >
                Discussion ({comments.length})
              </h3>
            </RevealText>

            <FadeIn>
              <CommentForm onSubmit={handleSubmit} />
            </FadeIn>

            <div>
              {comments.map((comment, i) => (
                <FadeIn key={comment.id} delay={i * 0.05}>
                  <CommentCard
                    {...comment}
                    isLast={i === comments.length - 1}
                  />
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
