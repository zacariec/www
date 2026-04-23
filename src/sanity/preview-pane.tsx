import { useEffect, useState } from "react";
import { useClient } from "sanity";
import { createPreviewSecret } from "@sanity/preview-url-secret/create-secret";
import { definePreviewUrl } from "@sanity/preview-url-secret/define-preview-url";

import type { SanityClient, SanityDocument } from "@sanity/client";

type PreviewPaneProps = {
  document: {
    displayed: Partial<SanityDocument>;
  };
};

const panelStyle: React.CSSProperties = {
  padding: 24,
  fontFamily: "inherit",
  color: "var(--card-muted-fg-color, #777)",
};

export function SessionPreviewPane(props: PreviewPaneProps) {
  const slug = (props.document.displayed?.slug as { current?: string } | undefined)?.current;
  const client = useClient({ apiVersion: "2026-03-26" }) as SanityClient;
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { secret } = await createPreviewSecret(
          client,
          "preview-pane",
          `${location.origin}/studio`,
        );
        const resolve = definePreviewUrl({
          origin: location.origin,
          preview: `/preview/sessions/${slug}`,
          previewMode: { enable: "/api/preview/enable" },
        });
        const resolved = await resolve({
          client,
          previewUrlSecret: secret,
          studioPreviewPerspective: "drafts",
        });
        if (!cancelled) setUrl(resolved);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, client]);

  if (!slug) return <div style={panelStyle}>Set a slug and save to enable preview.</div>;
  if (error) return <div style={panelStyle}>Preview failed: {error}</div>;
  if (!url) return <div style={panelStyle}>Generating preview URL…</div>;
  return (
    <iframe
      src={url}
      style={{ width: "100%", height: "100%", border: 0 }}
      title="Session preview"
    />
  );
}
