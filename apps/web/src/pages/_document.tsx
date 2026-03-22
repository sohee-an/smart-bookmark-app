import { Html, Head, Main, NextScript } from "next/document";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smart-bookmark-app-hdz6.vercel.app";
const OG_IMAGE = `${SITE_URL}/api/og`;
const OG_TITLE = "SmartMark — AI 북마크 관리";
const OG_DESCRIPTION =
  "저장은 했는데, 어디 있는지 모르겠다고요? AI가 내용을 읽고 의미로 찾아드려요.";

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* Primary Meta */}
        <meta name="description" content={OG_DESCRIPTION} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={OG_TITLE} />
        <meta property="og:description" content={OG_DESCRIPTION} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="SmartMark" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={SITE_URL} />
        <meta name="twitter:title" content={OG_TITLE} />
        <meta name="twitter:description" content={OG_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
