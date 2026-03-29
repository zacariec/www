import { z } from "zod";

export const commentRequestSchema = z.object({
  text: z.string().min(1, "Comment text is required"),
  postSlug: z.string().min(1, "Post slug is required"),
});

export type CommentRequest = z.infer<typeof commentRequestSchema>;

export const sanityPostRefSchema = z.object({
  _id: z.string(),
});

export type SanityPostRef = z.infer<typeof sanityPostRefSchema>;
