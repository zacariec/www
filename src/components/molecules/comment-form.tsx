"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { AuthButton } from "@/components/molecules/auth-button";

interface CommentFormProps {
  onSubmit: (author: string, text: string, authorImage?: string) => void;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState("");

  if (!session?.user) {
    return (
      <div className="mb-16 py-6">
        <AuthButton />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onSubmit(
      session.user?.name || "Anonymous",
      newComment,
      session.user?.image || undefined
    );
    setNewComment("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-16">
      <div className="flex items-center gap-3 mb-4">
        <AuthButton />
      </div>
      <textarea
        placeholder="Share your thoughts..."
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        rows={3}
        className="w-full border-b border-[rgba(0,0,0,0.08)] bg-transparent py-3 text-[13px] text-[#000000] placeholder-[#c6c6c6] focus:outline-none focus:border-[#000000] transition-colors duration-500 resize-none font-[family-name:var(--font-inter)]"
      />
      <motion.button
        type="submit"
        className="mt-6 bg-[#000000] text-[#e2e2e2] text-[10px] tracking-[2px] uppercase px-8 py-4 cursor-pointer border-none font-[family-name:var(--font-space-grotesk)]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        Post Comment
      </motion.button>
    </form>
  );
}
