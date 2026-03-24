import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "SmartMark";
  const description =
    searchParams.get("desc") ?? "저장은 했는데, 어디 있는지 모르겠다고요? AI가 의미로 찾아드려요.";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* Brand badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 3a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2H5z" fill="white" />
          </svg>
        </div>
        <span
          style={{
            color: "#a1a1aa",
            fontSize: "18px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          SmartMark
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          color: "#ffffff",
          fontSize: "56px",
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: "24px",
          maxWidth: "900px",
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          color: "#a1a1aa",
          fontSize: "26px",
          lineHeight: 1.5,
          maxWidth: "800px",
        }}
      >
        {description}
      </div>

      {/* Bottom decoration */}
      <div
        style={{
          position: "absolute",
          bottom: "48px",
          right: "80px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#6366f1",
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        AI 북마크 관리
      </div>

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
