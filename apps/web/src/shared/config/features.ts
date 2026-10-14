// 기능 플래그. 개발 중인 기능을 사용자 화면에서 숨긴다.
// false인 기능은 메뉴, 버튼이 보이지 않고 페이지 주소로 직접 들어가도 404가 된다.
// API 라우트는 막지 않는다(RLS로 본인 데이터만 다룸). 완성되면 true로 바꾼다.
export const FEATURES = {
  // 컬렉션/협업: 권한(owner/editor/viewer) 테스트와 기능 구현이 끝나지 않음 (2026-10)
  collections: false,
} as const;
