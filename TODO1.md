# 🚀 스마트 북마크 기능 구현 로드맵 (Smart Bookmark Implementation)

## 🏗️ Phase 1: Shared UI - 공통 모달 시스템 구축

- [ ] `src/shared/ui/Modal.tsx` 제작 (애니메이션, 포털, 접근성 지원)
- [ ] 모바일 대응을 위한 Bottom-Sheet 스타일 UI 적용
- [ ] 모달 전역 상태 관리 (Zustand) 또는 Context API 설정

## 🏗️ Phase 2: Entity & API - 북마크 데이터 레이어

- [ ] `src/entities/bookmark/model/types.ts`: 북마크 인터페이스 정의 (id, url, title, summary, tags, created_at 등)
- [ ] `src/entities/bookmark/api/create-bookmark.ts`: 북마크 생성 API 연동 함수 작성
- [ ] 서버 사이드 `process-url` API 고도화 (AI 요약 및 메타데이터 추출 로직 연결)

## 🏗️ Phase 3: Feature - 북마크 추가 기능 (`add-bookmark`)

- [ ] `src/features/add-bookmark/ui/AddBookmarkModal.tsx` 개발
  - [ ] URL 입력 필드 및 실시간 유효성 검사
  - [ ] URL 입력 시 AI 자동 분석 트리거 (로딩 스켈레톤 표시)
  - [ ] AI 분석 결과(제목, 요약, 태그) 미리보기 및 수정 기능
- [ ] `src/features/add-bookmark/model/use-add-bookmark.ts`: 추가 로직용 커스텀 훅 구현

## 🏗️ Phase 4: Integration - 헤더 연동 및 UX 연결

- [ ] `src/components/layout/Header.tsx`의 '북마크 추가' 버튼과 모달 연결
- [ ] 북마크 추가 성공 시 목록 실시간 업데이트(Optimistic Update 또는 Refetch) 구현
- [ ] 추가 성공 시 Toast 메시지 알림 처리

## 🏗️ Phase 5: Business Logic - 비회원 가드 (Guest Guard)

- [ ] 비회원(Guest) 여부 판별 로직 강화
- [ ] 북마크 저장 전 현재 개수 체크 (최대 5개 제한)
- [ ] 5개 초과 시 '로그인 유도' 모달 또는 팝업 표시 로직 구현
- [ ] 게스트 데이터를 정식 계정으로 이전하는 마이그레이션 로직 준비

## 🏗️ Phase 6: UX Polish & AI 안정화

- [ ] AI 분석 중 화려한 로딩 애니메이션 추가
- [ ] 분석 실패 시(크롤링 차단 등) 수동 입력 모드 전환 지원
- [ ] 다크 모드에서의 모달 스타일 정밀 조정
      1단계 - 이미 아는 것 (확인용)
      useState, useReducer 차이
      → useState : 단순한 값 하나
      → useReducer: 여러 액션으로 복잡한 상태 관리

Context
→ createContext, Provider, useContext

2단계 - 새로 알아야 할 것
이벤트 에미터 패턴
ts// React 밖에서 React 안으로 신호를 보내는 방법
// 옵저버 패턴이라고도 함

class EventEmitter {
private listeners = new Map<string, Function>()

// 구독
on(event: string, callback: Function) {
this.listeners.set(event, callback)
}

// 발행
emit(event: string, payload?: any) {
this.listeners.get(event)?.(payload)
}
}

```

```

overlay.open() 호출
↓ emit('OPEN', ...)
OverlayProvider가 on('OPEN')으로 수신
↓ dispatch({ type: 'OPEN' })
useReducer가 상태 업데이트
↓
모달 렌더링
useReducer
tstype Action =
| { type: 'OPEN'; id: string; component: Function }
| { type: 'CLOSE'; id: string }
| { type: 'UNMOUNT'; id: string }

function reducer(state, action) {
switch (action.type) {
case 'OPEN': // 목록에 추가
case 'CLOSE': // isOpen = false
case 'UNMOUNT': // 목록에서 제거
}
}
crypto.randomUUID()
ts// overlay마다 고유한 id를 만드는 방법
const id = crypto.randomUUID()
// → "550e8400-e29b-41d4-a716-446655440000"

```

---

### 3단계 - 핵심 연결 고리
```

React 밖 React 안

---

overlay.open()
→ emitter.emit('OPEN')
→ OverlayProvider가 수신
→ dispatch({ type: 'OPEN' })
→ state.overlays에 추가
→ 렌더링

```

이 흐름을 이해하는 게 핵심이에요.

---

## 추천 공부 순서
```

1. useReducer 먼저 이해
   → 간단한 counter를 useReducer로 만들어보기

2. 이벤트 에미터 개념 이해
   → 위 코드 직접 콘솔에서 돌려보기

3. 둘을 연결하는 OverlayProvider 이해
   → useEffect 안에서 emitter.on()으로 구독

4. 실제 코드 작성

useReducer가 익숙해요? 거기서 막히면 거기부터 같이 볼게요.
