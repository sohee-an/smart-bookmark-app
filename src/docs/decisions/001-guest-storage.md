1. 설계 결정들
   guest_id 설계
   문제: 비회원 식별을 위한 ID 관리
   결론: get/set 합치기
   tsconst getGuestId = (): string => {
   const existingId = localStorage.getItem(GUEST_ID_KEY)
   if (existingId) return existingId

const newId = crypto.randomUUID()
localStorage.setItem(GUEST_ID_KEY, newId)
return newId
}
판단 기준

get/set 분리: 읽기/쓰기가 독립적일 때 (테마, 언어 설정)
하나로 합치기: 항상 유효한 값이 필요할 때 (guest_id)
핵심: "없는 경우를 밖에서 알 필요가 있느냐"

비회원 데이터 저장 위치 결정
최종 결론: localStorage에 저장 + 로그인 시 이전
이유

DB 부담 없음
구현이 단순
비회원은 어차피 임시 사용자

단, UX로 명시해야 함
"비회원 북마크는 이 브라우저에만 저장됩니다.
다른 기기에서 보려면 로그인하세요."
이걸 명시하면 데이터 유실이 "버그"가 아니라 **"의도된 동작"**이 된다.
안내 메시지 UX 전략

처음 북마크 저장하는 순간 토스트로 한 번만 보여줌
localStorage에 guest_notice_shown 플래그 저장해서 반복 노출 방지
북마크 3개 넘어가면 자연스럽게 한 번 더 상기

"5개 중 3개 사용 중 · 로그인하면 무제한으로 저장할 수 있어요"
