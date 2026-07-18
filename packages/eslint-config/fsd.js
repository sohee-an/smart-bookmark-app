// FSD 레이어 경계 전용 lint 게이트 (공유 config)
// ---------------------------------------------------------------
// 일반 config(base/next)는 eslint-plugin-only-warn로 전부 warn이라 CI를 막지 못한다.
// 아키텍처 위반은 "빠르고 객관적이고 결정론적"이라 강제(error)에 적합하므로,
// only-warn이 걸리지 않은 이 독립 config로 error 판정 + --max-warnings 0 게이트를 건다.
//
// 레이어 순서: app > widgets > features > entities > shared
// 하위 레이어가 상위 레이어를 import 하면 위반 (역방향 금지).
// 같은 레이어 간 슬라이스 참조 등 판단이 필요한 부분은 온디맨드 fsd-checker 에이전트가 본다.
//
// 한계(의도적):
//  - `@/` alias import만 검사한다. 상대경로 cross-layer(`../../features/...`)는 이 규칙이
//    못 잡는다. 현재 코드베이스엔 그런 import가 없어 게이트가 유효하지만, 완전 차단이
//    필요하면 eslint-plugin-boundaries / import/no-restricted-paths로 이전한다.
//  - `src/server/`(크롤러·AI 서비스)는 표준 FSD 레이어가 아니라 규칙에서 제외했다.
//    server↔feature 경계를 강제하려면 별도 정의가 필요하다(현재는 위반 0건이라 미도입).
//
// typescript-eslint 파서가 이 패키지 의존성에 있어 여기 둔다. 앱은 이 config를 재노출만.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const higher = {
  app: ["@/app", "@/app/**"],
  widgets: ["@/widgets", "@/widgets/**"],
  features: ["@/features", "@/features/**"],
  entities: ["@/entities", "@/entities/**"],
};

const ban = (message, groups) => ({
  languageOptions: { parser: tseslint.parser },
  rules: {
    "no-restricted-imports": ["error", { patterns: [{ group: groups, message }] }],
  },
});

/** @type {import("eslint").Linter.Config[]} */
export const fsdConfig = [
  { ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**"] },
  // 소스의 `// eslint-disable react-hooks/exhaustive-deps` 주석이 유효하도록 플러그인만
  // 등록한다(규칙은 켜지 않음). 없으면 "rule not found" 오탐이 게이트를 잘못 막는다.
  // 규칙을 끈 상태라 그 주석이 "미사용"으로 잡히는 것도 이 게이트 관심사가 아니므로 끈다.
  {
    plugins: { "react-hooks": reactHooks },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    ...ban("FSD 위반: shared는 entities/features/widgets/app을 import할 수 없습니다.", [
      ...higher.entities,
      ...higher.features,
      ...higher.widgets,
      ...higher.app,
    ]),
  },
  {
    files: ["src/entities/**/*.{ts,tsx}"],
    ...ban("FSD 위반: entities는 features/widgets/app을 import할 수 없습니다.", [
      ...higher.features,
      ...higher.widgets,
      ...higher.app,
    ]),
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    ...ban("FSD 위반: features는 widgets/app을 import할 수 없습니다.", [
      ...higher.widgets,
      ...higher.app,
    ]),
  },
  {
    files: ["src/widgets/**/*.{ts,tsx}"],
    ...ban("FSD 위반: widgets는 app을 import할 수 없습니다.", [...higher.app]),
  },
];
