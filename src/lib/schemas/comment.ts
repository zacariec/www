import { z } from "zod";

export const commentDocumentIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/, "Invalid document ID")
  .refine(
    (id) => !id.startsWith("drafts.") && !id.startsWith("versions."),
    "Use a published document",
  );

export const commentRequestSchema = z
  .object({
    session: commentDocumentIdSchema,
    body: z
      .string()
      .max(5000, "Keep comments under 5,000 characters")
      .transform((value) => value.replace(/\r\n?/g, "\n").trim())
      .pipe(
        z
          .string()
          .min(1, "Write a comment first")
          .refine(
            // eslint-disable-next-line no-control-regex -- Reject control characters while permitting tabs and normalized newlines.
            (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
            "Unsupported control character",
          ),
      ),
    anchorIndex: z.number().int().positive().nullable(),
    parent: commentDocumentIdSchema.nullable(),
  })
  .strict();

export type CommentRequest = z.infer<typeof commentRequestSchema>;

export const commentAuthorSchema = z.object({
  provider: z.string(),
  providerId: z.string(),
  handle: z.string(),
  avatarSeed: z.number(),
  isAuthor: z.boolean(),
});

export const publicCommentSchema = z.object({
  _id: z.string(),
  session: z.string(),
  anchorIndex: z.number().int().positive().nullable(),
  parent: z.string().nullable(),
  body: z.string(),
  author: commentAuthorSchema,
  status: z.enum(["approved", "pending", "hidden"]),
  likes: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const threadResponseSchema = z.object({
  comments: z.array(publicCommentSchema),
  viewer: z.object({ author: commentAuthorSchema }).nullable(),
  providers: z.array(z.enum(["github", "twitter", "linkedin", "google"])),
  likedIds: z.array(z.string()),
});
