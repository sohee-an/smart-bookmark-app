import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smart-bookmark-app-hdz6.vercel.app";

/**
 * 공개(비인증) 페이지만 색인 대상으로 노출.
 * /bookmarks·/collections 등은 인증 게이트 + 동적이라 제외한다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = ["", "/landing", "/login", "/privacy"];

  return publicRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
