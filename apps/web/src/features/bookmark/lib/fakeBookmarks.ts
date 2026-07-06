import type { Bookmark } from "@/entities/bookmark/model/types";

/**
 * 성능 데모/측정 전용 가짜 북마크 생성기.
 * DB나 localStorage에 저장하지 않고 오직 렌더 성능 측정용으로 메모리에서만 생성한다.
 * (실제 유저 데이터가 아니며, /demo 라우트에서만 사용)
 */
const TITLES = [
  "React 렌더링 최적화 — 불필요한 리렌더 잡기",
  "TypeScript 유틸리티 타입 완전 정복",
  "Next.js App Router 렌더링 전략 비교",
  "가상 스크롤로 대용량 리스트 부드럽게",
  "pgvector로 시맨틱 검색 구현하기",
  "SSE 스트리밍으로 AI 챗 UI 만들기",
  "FSD 아키텍처로 레이어 결합도 낮추기",
  "웹폰트 동적 서브셋으로 전송량 78% 절감",
  "SSRF 방어 — IPv6/mapped까지 판정하기",
  "TanStack Query 낙관적 업데이트와 롤백",
];

const TAG_POOL = [
  "React",
  "TypeScript",
  "Next.js",
  "성능",
  "CSS",
  "테스트",
  "아키텍처",
  "AI",
  "보안",
  "접근성",
];

export function makeFakeBookmarks(count: number): Bookmark[] {
  return Array.from({ length: count }, (_, i) => {
    const base = TITLES[i % TITLES.length];
    const tagStart = i % (TAG_POOL.length - 2);
    return {
      id: `demo-${i}`,
      url: `https://example.com/article/${i}`,
      title: `${base} #${i + 1}`,
      summary:
        "성능 측정을 위해 생성된 데모 북마크입니다. 실제 데이터가 아니며, 대용량 리스트에서 가상 스크롤이 얼마나 부드러운지 확인하기 위한 것입니다.",
      thumbnailUrl: undefined, // 네트워크 이미지 없이 순수 렌더 성능만 측정
      aiStatus: "completed",
      status: i % 3 === 0 ? "read" : "unread",
      tags: TAG_POOL.slice(tagStart, tagStart + 3),
      userId: "demo",
      createdAt: `2026-01-01T00:00:00.000Z`,
      updatedAt: `2026-01-01T00:00:00.000Z`,
    } satisfies Bookmark;
  });
}
