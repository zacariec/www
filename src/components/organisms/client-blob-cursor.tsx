"use client";

import dynamic from "next/dynamic";

const BlobCursor = dynamic(
  () => import("@/components/organisms/blob-cursor").then((m) => m.BlobCursor),
  { ssr: false }
);

export function ClientBlobCursor() {
  return <BlobCursor />;
}
