"use client";

import { useState } from "react";

import { SessionProvider } from "next-auth/react";

import { HorizontalLine } from "@/components/atoms/horizontal-line";
import { CommentCard } from "@/components/molecules/comment-card";
import { CommentForm } from "@/components/molecules/comment-form";
import { FadeIn, RevealText } from "@/components/molecules/reveal-text";

interface Comment {
  id: string;
  author: string;
  authorImage?: string;
  date: string;
  text: string;
  likes: number;
  parentCommentId?: string;
}

interface CommentSectionProps {
  initialComments: Comment[];
  postSlug: string;
}

export const CommentSection = ({ initialComments, postSlug }: CommentSectionProps) => {
  const [comments, setComments] = useState(initialComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmit = async (
    author: string,
    text: string,
    authorImage?: string,
    parentCommentId?: string,
  ) => {
    const comment: Comment = {
      id: Date.now().toString(),
      author,
      authorImage,
      date: new Date().toISOString().split("T")[0],
      text,
      likes: 0,
      parentCommentId,
    };
    setComments([...comments, comment]);
    setReplyingTo(null);

    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, postSlug, parentCommentId }),
      });
    } catch {
      // Comment already added optimistically
    }
  };

  const topLevel = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId);

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
              {topLevel.map((comment, i) => (
                <FadeIn key={comment.id} delay={i * 0.05}>
                  <CommentCard
                    author={comment.author}
                    authorImage={comment.authorImage}
                    date={comment.date}
                    id={comment.id}
                    isLast={i === topLevel.length - 1 && getReplies(comment.id).length === 0}
                    likes={comment.likes}
                    onReply={setReplyingTo}
                    text={comment.text}
                  />
                  {/* Replies */}
                  {getReplies(comment.id).map((reply, j) => (
                    <CommentCard
                      key={reply.id}
                      author={reply.author}
                      authorImage={reply.authorImage}
                      date={reply.date}
                      id={reply.id}
                      isLast={j === getReplies(comment.id).length - 1}
                      isReply
                      likes={reply.likes}
                      text={reply.text}
                    />
                  ))}
                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="ml-8 border-l-2 border-[rgba(0,0,0,0.04)] pl-6 pb-4">
                      <CommentForm
                        onSubmit={(author, text, authorImage) =>
                          handleSubmit(author, text, authorImage, comment.id)
                        }
                        placeholder="Write a reply..."
                      />
                      <button
                        className="text-[10px] text-[#c6c6c6] hover:text-[#777777] transition-colors bg-transparent border-none cursor-pointer p-0 mt-2 font-[family-name:var(--font-space-grotesk)]"
                        onClick={() => setReplyingTo(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
};
