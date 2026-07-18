// FSD 레이어 경계 전용 lint 게이트.
// 실제 규칙은 공유 config 패키지에 있다(typescript-eslint 파서 의존성 위치 때문).
// 실행: pnpm --filter @smart-bookmark/web lint:fsd
import { fsdConfig } from "@smart-bookmark/eslint-config/fsd";

export default fsdConfig;
