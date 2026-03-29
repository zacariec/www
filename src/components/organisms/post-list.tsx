"use client";

import { HorizontalLine } from "@/components/atoms/horizontal-line";
import { PostCard } from "@/components/molecules/post-card";
import { StaggerChildren, StaggerItem } from "@/components/molecules/stagger-group";

interface Post {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readingTime: string;
  commentCount?: number;
}

interface PostListProps {
  posts: Post[];
  variant?: "compact" | "full";
}

export function PostList({ posts, variant = "compact" }: PostListProps) {
  return (
    <StaggerChildren>
      {posts.map((post) => (
        <StaggerItem key={post.slug}>
          <HorizontalLine />
          <PostCard {...post} variant={variant} />
        </StaggerItem>
      ))}
      <HorizontalLine />
    </StaggerChildren>
  );
}
