import { useEffect, useRef, useState } from "react";
import { set, unset } from "sanity";
import type { ObjectInputProps } from "sanity";
import type { WrittenTo } from "../lib/sanity/types";
import { SPOTIFY_TRACK_URL } from "../lib/session";

type WrittenToValue = Partial<WrittenTo> & { _type?: string };

export function WrittenToInput(props: ObjectInputProps<WrittenToValue>) {
  const { value, onChange, readOnly } = props;
  const [url, setUrl] = useState(value?.spotifyUrl ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const inputId = `${props.id}-spotify-url`;
  const statusId = `${props.id}-spotify-status`;

  useEffect(() => {
    request.current?.abort();
    setPending(false);
    setUrl(value?.spotifyUrl ?? "");
    return () => request.current?.abort();
  }, [value?.spotifyUrl]);

  async function resolveTrack() {
    const spotifyUrl = url.trim();
    if (!SPOTIFY_TRACK_URL.test(spotifyUrl)) {
      setStatus("Paste an HTTPS Spotify track URL, not an album, playlist or episode.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setStatus("Resolving Spotify track…");
    try {
      const response = await fetch(`/api/spotify-track?url=${encodeURIComponent(spotifyUrl)}`, {
        signal: controller.signal,
      });
      const result: Partial<WrittenTo> & { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Spotify could not resolve this track.");
      if (
        !result.track?.trim() ||
        !result.artist?.trim() ||
        !result.spotifyUrl ||
        !SPOTIFY_TRACK_URL.test(result.spotifyUrl)
      )
        throw new Error("Spotify returned incomplete track details. Nothing was changed.");
      if (controller.signal.aborted) return;
      onChange(
        set({
          _type: props.schemaType.name,
          track: result.track,
          artist: result.artist,
          spotifyUrl: result.spotifyUrl,
        }),
      );
      setUrl(result.spotifyUrl);
      setStatus("Track resolved. Publish the session to show it on the site.");
    } catch (cause) {
      if (!controller.signal.aborted)
        setStatus(cause instanceof Error ? cause.message : "Spotify is unavailable. Try again.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <div className="zc-studio-pane">
      <label className="zc-studio-field" htmlFor={inputId}>
        Spotify track URL
      </label>
      <input
        id={inputId}
        type="url"
        value={url}
        readOnly={readOnly}
        aria-describedby={statusId}
        placeholder="https://open.spotify.com/track/…"
        onChange={(event) => {
          request.current?.abort();
          setPending(false);
          setStatus("");
          setUrl(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (!readOnly && !pending) void resolveTrack();
        }}
      />
      <button
        type="button"
        disabled={readOnly || pending || !url.trim()}
        onClick={() => void resolveTrack()}
      >
        {pending ? "Resolving…" : "Resolve track"}
      </button>
      {value && (
        <>
          <p>
            {value.track} — {value.artist}
          </p>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              request.current?.abort();
              setPending(false);
              setUrl("");
              setStatus("Written to removed from this draft.");
              onChange(unset());
            }}
          >
            Remove track
          </button>
        </>
      )}
      <p id={statusId} className="zc-studio-meta" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
