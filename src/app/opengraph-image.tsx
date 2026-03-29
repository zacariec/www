import { ImageResponse } from "next/og";

export const alt = "zcarr.dev — Design, Code & Unfiltered Thinking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "2px solid #333",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              color: "#f9f9f7",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            ZC
          </span>
        </div>
        <span
          style={{
            color: "#f9f9f7",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          zcarr.dev
        </span>
        <span
          style={{
            color: "#777777",
            fontSize: 20,
            letterSpacing: 4,
            marginTop: 16,
            textTransform: "uppercase",
          }}
        >
          Design · Code · Noise
        </span>
        <span
          style={{
            color: "#555555",
            fontSize: 16,
            marginTop: 32,
            maxWidth: 500,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          A space for long-form thinking on design, engineering, and the details most people skip.
        </span>
      </div>
    ),
    { ...size },
  );
}
