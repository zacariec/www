"use client";

import { lazy, Suspense } from "react";

const BlobCursor = lazy(() =>
  import("@/components/organisms/blob-cursor").then((m) => ({ default: m.BlobCursor })),
);

export const ClientBlobCursor = () => (
  <Suspense fallback={null}>
    <BlobCursor />
  </Suspense>
);
