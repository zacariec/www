"use client";

import dynamic from "next/dynamic";

const BlobCursor = dynamic(
  async () => import("@/components/organisms/blob-cursor").then((m) => m.BlobCursor),
  { ssr: false },
);

export const ClientBlobCursor = () => <BlobCursor />;
