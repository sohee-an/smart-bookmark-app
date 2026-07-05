# iOS Safari input 자동 줌 대응 방식 결정

- **날짜**: 2026-06-07
- **상태**: 적용 완료
- **태그**: 반응형, 크로스 브라우징, 접근성, iOS Safari

---

## 1. 문제 상황

iPhone Safari 실기기 테스트 중 발견:

- 모바일에서 검색 아이콘(🔍) 탭 → `MobileSearchOverlay`가 열리는 순간 **뷰포트가 강제로 확대(줌인)** 됨
- 키보드를 내려도 확대 상태가 유지 → 사용자가 직접 핀치 줌아웃해야 원복되는 UX

> Chrome DevTools 기기 모드에서는 절대 재현되지 않음 — 화면 크기만 흉내 낼 뿐 엔진은 데스크톱 Chrome이기 때문. **실기기에서만 발견 가능한 버그**였다.

## 2. 원인

iOS Safari(WebKit)의 자동 줌 동작:

> **포커스 순간, 폼 필드의 computed font-size가 16px 미만이면** 가독성을 위해 뷰포트를 자동 확대한다. (단, viewport 설정이 줌을 허용할 때만)

우리 코드가 정확히 이 조건을 밟고 있었다:

```tsx
// MobileSearchOverlay.tsx — 오버레이 열리면 50ms 뒤 자동 포커스
const timer = setTimeout(() => inputRef.current?.focus(), 50);

// 그 인풋이 text-sm = 14px < 16px
className = "flex-1 bg-transparent text-sm ...";
```

자동 포커스 때문에 사용자가 인풋을 탭하지 않아도 **오버레이가 열리자마자 줌이 발생**했다.

영향 범위 조사 결과(모바일에서 도달 가능한 16px 미만 폼 필드):

| 파일                        | 필드                        | 크기              | 비고                                |
| --------------------------- | --------------------------- | ----------------- | ----------------------------------- |
| `MobileSearchOverlay.tsx`   | input                       | 14px              | 자동 포커스 → 가장 치명적           |
| `shared/ui/input/Input.tsx` | 공용 컴포넌트               | sm 12px / md 14px | 로그인 폼, 북마크 추가 등 전부 영향 |
| `CreateCollectionModal.tsx` | input(autoFocus) + textarea | 14px              | 모달 열리자마자 줌                  |
| `InviteMemberModal.tsx`     | input + select              | 14px              | select도 줌 대상                    |
| `BookmarkDetailPanel.tsx`   | 제목 편집 input             | 14px              |                                     |

## 3. 검토한 대안

자동 줌 발동 조건이 「**A.** font-size < 16px」 AND 「**B.** 줌이 허용된 viewport」이므로, 해법도 두 갈래로 나뉜다.

### ① 모바일 폰트 16px 하한 (조건 A 우회) — ✅ 채택

```tsx
const sizeClasses = {
  sm: "py-1.5 text-base md:text-xs", // 모바일 16px → 768px+ 12px
  md: "py-2.5 text-base md:text-sm", // 모바일 16px → 768px+ 14px
  lg: "py-3.5 text-base",
};
```

mobile-first로 기본값을 16px로 깔고, `md:` 이상에서 원래 크기로 복귀.

- 장점: 부작용 없음, 모든 브라우저 안전, 접근성 향상, 코드 단순. 모바일 인풋 16px은 플랫폼 관례에도 부합 (iOS 네이티브 입력 필드 기본 17pt, 주요 서비스 모바일 웹 전부 16px+)
- 단점: 모바일에서 인풋 글자가 14→16px로 커짐 (데스크톱은 변화 0)

### ② iOS 한정 `maximum-scale=1` 동적 주입 (조건 B 우회)

```js
if (/iPhone|iPad/.test(navigator.userAgent)) {
  document.querySelector('meta[name="viewport"]').content += ", maximum-scale=1";
}
```

iOS 10+는 maximum-scale을 **자동 줌에만 적용하고 사용자 핀치 줌은 무시**하므로, iOS에만 주입하면 14px을 유지하면서 줌만 끌 수 있다. **14px 디자인을 그대로 지키는 유일한 방법.**

- 장점: 디자인 무변경
- 단점: UA 스니핑은 취약 (iPadOS는 데스크톱 UA로 위장 → 추가 분기 필요), Lighthouse/접근성 감사 도구가 기계적으로 플래그, 문서화된 스펙이 아닌 Safari 비공식 동작에 의존
- ⚠️ 조건 없이 전역 주입하면 **Android에서 사용자 핀치 줌까지 차단** = WCAG 1.4.4 위반

### ③ 16px + transform scale 눈속임 — 기각

```css
input {
  font-size: 16px;
  transform: scale(0.875);
  width: 114.3%;
  transform-origin: left;
}
```

computed는 16px, 시각적으론 14px. 박스 크기·캐럿·주변 정렬 보정이 지저분하고 텍스트 블러 가능성 → 유지보수 비용이 이득보다 크다.

### ④ `input:focus { font-size: 16px }` 트릭 — 기각

포커스 시점 폰트로 줌 여부가 판정되는 것을 이용. 타이핑 시작 시 글자가 눈에 띄게 점프하고 iOS 버전별 동작이 불안정.

## 4. 결정과 근거

**①(16px 하한)을 채택.**

- 이 프로젝트에는 "모바일 인풋은 반드시 14px"이라는 디자인 제약이 없음 → ②의 비용(UA 스니핑 유지보수, 감사 도구 플래그)을 지불할 이유가 없음
- 모바일 인풋 16px은 디자인 훼손이 아니라 **플랫폼 관례에 맞는 교정**에 가까움
- 개별 화면 수정이 아니라 **공용 Input 컴포넌트(sizeClasses) 레벨**에 하한을 넣어 재발 차단

> 디자인 제약이 강한 프로젝트였다면 ②(iOS 한정 주입)가 합리적 선택일 수 있다. 이 결정은 "유일한 정답"이 아니라 트레이드오프 선택이다.

## 5. 적용 내역

5개 파일 6곳 — `text-sm` → `text-base md:text-sm` 패턴 (모바일 전용 UI인 MobileSearchOverlay만 `text-base` 단독):

- `shared/ui/input/Input.tsx` — sizeClasses sm/md
- `features/bookmark/ui/MobileSearchOverlay.tsx`
- `features/collection/ui/CreateCollectionModal.tsx` — input + textarea
- `features/collection/ui/InviteMemberModal.tsx` — input + select
- `entities/bookmark/ui/BookmarkDetailPanel.tsx` — 제목 편집 input

## 6. 검증 방법

- **재현/확인은 반드시 iOS 실기기** (DevTools 기기 모드·Android에서는 재현 불가)
- 같은 Wi-Fi에서 `pnpm dev` → iPhone Safari로 `http://<PC IP>:3000` 접속
- 수정 전: 🔍 탭 → 오버레이 열리며 즉시 줌인 / 수정 후: 줌 없음
- iPhone이 없으면 BrowserStack 등 원격 실기기 서비스로 대체 가능

## 7. 배운 점

1. **에뮬레이터의 한계**: 브라우저 엔진 동작(WebKit 자동 줌)은 DevTools가 흉내 내지 못한다 — 모바일 품질 검증은 실기기가 기본
2. **조건을 분해하면 해법이 보인다**: "A AND B"로 발동하는 동작은 A를 깨는 계열과 B를 깨는 계열로 해법이 나뉜다
3. **접근성은 배제 근거가 된다**: maximum-scale 전역 적용은 기능적으론 동작하지만 WCAG 1.4.4 위반이라 배제 — 트레이드오프 판단에 접근성이 1급 기준으로 들어와야 한다
4. **수정은 시스템 레벨에서**: 발견된 화면만 고치지 않고 공용 컴포넌트에 하한을 넣어야 다음 인풋에서 재발하지 않는다

## 참고

- [MDN — Viewport meta tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
- [WCAG 2.1 — 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html)
- css-tricks: [16px or Larger Text Prevents iOS Form Zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/)
