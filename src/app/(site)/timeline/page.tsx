import { NeuralBlobNet } from "@/components/organisms/neural-blob-net";
import { TimelineFeed } from "@/components/organisms/timeline-feed";
import { getAllTimelineEntries } from "@/lib/sanity/fetch";

import { TimelineHeader } from "./timeline-header";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Short-form noise. Thoughts, observations, and the things that don't need a whole essay.",
  openGraph: {
    title: "Timeline — zcarr.dev",
    description:
      "Short-form noise. Thoughts, observations, and the things that don't need a whole essay.",
    type: "website",
  },
  alternates: {
    canonical: "/timeline",
  },
};

export default async function TimelinePage() {
  const entries = await getAllTimelineEntries();

  const mappedEntries = entries.map((e, i) => ({
    id: e._id || String(i),
    date: e.date,
    text: e.text,
    type: e.type,
    likes: e.likes,
    comments: e.comments,
    url: e.url,
  }));

  return (
    <div>
      <div className="relative h-[30vh] md:h-[40vh] overflow-hidden">
        <NeuralBlobNet nodeCount={mappedEntries.length} />
      </div>
      <div className="px-5 md:px-16 pt-8 md:pt-16 pb-20 md:pb-32">
        <TimelineHeader />
        <TimelineFeed entries={mappedEntries} />
      </div>
    </div>
  );
}
