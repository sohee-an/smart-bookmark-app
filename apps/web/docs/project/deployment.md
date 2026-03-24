# 배포 전략 — Smart Bookmark

## 현재 배포 구성

```
Vercel (Next.js 호스팅)
  └─ apps/web
       └─ NEXT_PUBLIC_SITE_URL: https://smart-bookmark-app-hdz6.vercel.app

Supabase (DB + Auth)
  └─ PostgreSQL
  └─ Auth (이메일/비밀번호)
```

---

## Vercel 배포 설정

### 환경변수 (Vercel Dashboard > Settings > Environment Variables)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=

# AI
GEMINI_API_KEY=

# 사이트
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**주의**: `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트 번들에 포함됨.
민감한 키(GEMINI*API_KEY 등)는 절대 `NEXT_PUBLIC*` 붙이지 말 것.

### 모노레포 Vercel 설정

```json
// vercel.json (루트)
{
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install"
}
```

---

## 브랜치 전략 (배포 환경 분리)

```
main         → 프로덕션 배포 (자동)
develop      → 스테이징 배포 (자동)
feat/*       → PR Preview 배포 (자동)
```

Vercel은 PR마다 Preview URL을 자동 생성 → 팀원 리뷰 및 테스트에 활용.

---

## 커스텀 도메인 연결

1. Vercel Dashboard > Domains > Add Domain
2. DNS 레코드 설정 (CNAME or A Record)
3. SSL 인증서 자동 발급 (Let's Encrypt)

```
smartmark.io (예시)
  ├── www.smartmark.io  → CNAME: cname.vercel-dns.com
  └── smartmark.io      → A: 76.76.21.21
```

---

## Supabase 프로덕션 설정

### RLS (Row Level Security) 필수

모든 테이블에 RLS를 활성화해야 데이터 격리됨.

```sql
-- bookmarks 테이블 RLS 예시
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 자신의 북마크만 조회
CREATE POLICY "users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- 자신의 북마크만 추가
CREATE POLICY "users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 데이터베이스 백업

Supabase Pro 플랜 이상에서 자동 백업 지원.
무료 플랜은 수동 export 또는 pg_dump 활용.

---

## 모니터링

### Vercel Analytics

```tsx
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics /> {/* 방문자 분석 */}
        <SpeedInsights /> {/* Core Web Vitals 측정 */}
      </body>
    </html>
  );
}
```

### 에러 트래킹 (Sentry)

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```tsx
// 클라이언트 에러 자동 캡처
// API Route 에러 자동 캡처
// 성능 트레이싱
```

---

## CI/CD 파이프라인

### GitHub Actions (예시)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm --filter web build
```

Vercel은 GitHub 연동 시 자동으로 PR Preview 빌드 실행.
위 CI는 lint/test 실패 시 머지 차단 용도.

---

## 비용 관리

### Vercel 무료 플랜 한도

| 항목          | 무료        | Pro ($20/월)  |
| ------------- | ----------- | ------------- |
| 대역폭        | 100GB       | 1TB           |
| 함수 실행시간 | 100GB-hours | 1,000GB-hours |
| 빌드 시간     | 6,000분/월  | 무제한        |
| 팀 멤버       | 1명         | 무제한        |

### Gemini API 비용 최적화

```
현재 호출 흐름:
북마크 저장 1회 = crawl + ai-analyze + embed = API 3회 호출

최적화:
1. 임베딩 결과 Redis 캐싱 (같은 내용 재분석 방지)
2. Rate Limiting으로 과도한 호출 방지
3. 배치 처리 (여러 북마크 동시 처리 시 하나의 요청으로)
```

---

## 프로덕션 체크리스트

```
보안
  □ 모든 API Route에 인증 확인
  □ Supabase RLS 활성화 확인
  □ 환경변수 노출 여부 확인 (NEXT_PUBLIC_ 검토)
  □ Rate Limiting 적용

성능
  □ next/image 사용 확인
  □ 번들 크기 확인 (pnpm build 결과)
  □ Core Web Vitals 측정

SEO
  □ 모든 페이지 metadata 설정
  □ OG 이미지 확인
  □ sitemap.xml 생성 (추후)
  □ robots.txt 설정 (추후)

모니터링
  □ Vercel Analytics 설치
  □ 에러 트래킹 설정
  □ 알림 설정 (빌드 실패 등)
```
