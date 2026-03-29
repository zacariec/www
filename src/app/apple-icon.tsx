import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#000000",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#f9f9f7",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          ZC
        </span>
      </div>
    ),
    { ...size },
  );
}
