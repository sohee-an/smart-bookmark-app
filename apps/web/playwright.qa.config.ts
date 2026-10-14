// QATester 재검증용 Playwright 설정 (scripts/qa/qa.mjs recheck --e2e).
// 평소 개발 서버(3000)와 겹치지 않게 3100에서 이 작업 폴더의 서버를 새로 띄운다.
// 이미 떠 있는 서버를 재사용하면 다른 브랜치의 코드를 테스트할 수 있어서 재사용하지 않는다.
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
  },
});
