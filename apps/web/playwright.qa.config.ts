// QATester 재검증용 Playwright 설정 (scripts/qa/qa.mjs recheck --e2e).
// 평소 개발 서버(3000)와 겹치지 않게 3100에서 이 작업 폴더의 서버를 새로 띄운다.
// 이미 떠 있는 서버를 재사용하면 다른 브랜치의 코드를 테스트할 수 있어서 재사용하지 않는다.
// Supabase 값은 자리표시로 고정한다. 이 폴더에 .env.local이 있어도 E2E는 같은 조건에서 돈다
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const PORT = Number(process.env.QA_E2E_PORT ?? 3100);

export default defineConfig({
  ...base,
  reporter: "json",
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // E2E는 API를 모두 가짜 응답으로 바꾸므로 Supabase 값은 자리표시로 충분하다 (CI 나이틀리와 같은 값).
    // 비밀값 파일(.env.local)이 없는 작업 폴더에서도 서버가 뜨고, 실제 DB를 가리킬 일도 없다
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "placeholder-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-role-key",
      RESEND_API_KEY: "re_placeholder",
    },
  },
});
