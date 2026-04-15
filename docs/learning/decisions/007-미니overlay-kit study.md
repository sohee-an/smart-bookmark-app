# 🎭 overlay-kit 미니 버전 구현 학습

> toss/overlay-kit 소스 분석 후 미니 버전 직접 구현  
> 선언적 오버레이 관리 패턴 학습 목적

---

## 왜 이걸 공부했나

기존 모달 구현 방식의 문제를 발견했다. `isOpen` 상태 선언, 열기 로직, 모달 JSX 배치가 컴포넌트 전체에 흩어져 있어 관련 코드를 한눈에 파악하기 어려웠다. 토스의 overlay-kit이 이 문제를 어떻게 해결했는지 분석하고, 미니 버전을 직접 구현해보기로 했다.

---

## 1. 기존 방식 vs overlay-kit 방식

### 기존 방식 (명령형)

```tsx
function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);

  return (
    <>
      {items.map((item) => (
        <button
          onClick={() => {
            setTargetId(item.id); // 어떤 아이템인지 따로 저장
            setIsOpen(true); // 열기
          }}
        >
          삭제
        </button>
      ))}

      {/* 모달을 JSX 어딘가에 배치해야 함 */}
      {isOpen && <DeleteModal id={targetId} onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

**문제점**

```
isOpen 선언   → 컴포넌트 상단
열기 로직     → 중간 어딘가
모달 배치     → 컴포넌트 하단
→ 관련 코드가 파편화됨
→ 아이템마다 다른 id를 넘기려면 state가 추가로 필요
```

### overlay-kit 방식 (선언형)

```tsx
function Page() {
  return (
    <>
      {items.map((item) => (
        <button
          onClick={() => {
            overlay.open(({ isOpen, close }) => (
              <DeleteModal
                id={item.id} // 클로저로 바로 캡처
                open={isOpen}
                onClose={close}
              />
            ));
          }}
        >
          삭제
        </button>
      ))}
      {/* 모달 JSX 배치 없음 */}
    </>
  );
}
```

**개선점**

```
버튼과 모달이 같은 위치에 있음
→ 코드 흐름이 한눈에 보임
→ item.id를 클로저로 캡처해서 별도 state 불필요
```

---

## 2. 내부 구조 (알아야 할 핵심 개념)

### 전체 흐름

```
overlay.open() 호출 (React 외부)
      ↓
이벤트 에미터로 이벤트 발행
      ↓
OverlayProvider가 이벤트 수신
      ↓
useReducer로 overlay 목록에 추가
      ↓
Context를 통해 목록 렌더링
```

### 핵심 개념 1 - 이벤트 에미터 패턴

`overlay.open()`이 React 컴포넌트 밖에서 호출될 수 있는 원리다.

```ts
// overlay.event.ts
class OverlayEventEmitter {
  private listeners: Map<string, Function> = new Map();

  on(event: string, callback: Function) {
    this.listeners.set(event, callback);
  }

  emit(event: string, payload: any) {
    this.listeners.get(event)?.(payload);
  }
}

const emitter = new OverlayEventEmitter();

// overlay.open()은 그냥 이벤트를 발행하는 것
export const overlay = {
  open: (component) => {
    const id = crypto.randomUUID();
    emitter.emit("OPEN", { id, component });
  },
  close: (id) => emitter.emit("CLOSE", { id }),
  unmount: (id) => emitter.emit("UNMOUNT", { id }),
};
```

### 핵심 개념 2 - useReducer로 목록 관리

```ts
// overlay 목록 상태
type OverlayState = {
  overlays: Array<{
    id: string;
    isOpen: boolean;
    component: (props: OverlayProps) => ReactNode;
  }>;
};

type OverlayAction =
  | { type: "OPEN"; id: string; component: Function }
  | { type: "CLOSE"; id: string }
  | { type: "UNMOUNT"; id: string };

function overlayReducer(state: OverlayState, action: OverlayAction) {
  switch (action.type) {
    case "OPEN":
      return {
        overlays: [
          ...state.overlays,
          {
            id: action.id,
            isOpen: true,
            component: action.component,
          },
        ],
      };
    case "CLOSE":
      return {
        overlays: state.overlays.map((o) => (o.id === action.id ? { ...o, isOpen: false } : o)),
      };
    case "UNMOUNT":
      return {
        overlays: state.overlays.filter((o) => o.id !== action.id),
      };
  }
}
```

### 핵심 개념 3 - close vs unmount 차이

```
close()
  → isOpen = false
  → 모달이 숨겨짐
  → DOM에는 아직 존재
  → 애니메이션 실행 가능

unmount()
  → overlay 목록에서 완전히 제거
  → DOM에서 사라짐
  → 애니메이션 끝난 후 호출하는 게 맞음
```

```tsx
// 올바른 사용 패턴
<Dialog
  open={isOpen}
  onClose={close} // 닫기 버튼 → close (애니메이션 시작)
  onAnimationEnd={unmount} // 애니메이션 끝 → unmount (DOM 제거)
/>
```

### 핵심 개념 4 - OverlayProvider

```tsx
// 앱 최상단에 딱 한 번 배치
function OverlayProvider({ children }) {
  const [state, dispatch] = useReducer(overlayReducer, { overlays: [] });

  // 이벤트 에미터 구독
  useEffect(() => {
    emitter.on("OPEN", ({ id, component }) => dispatch({ type: "OPEN", id, component }));
    emitter.on("CLOSE", ({ id }) => dispatch({ type: "CLOSE", id }));
    emitter.on("UNMOUNT", ({ id }) => dispatch({ type: "UNMOUNT", id }));
  }, []);

  return (
    <OverlayContext.Provider value={state}>
      {children}
      {/* 모든 overlay가 여기서 렌더링됨 */}
      {state.overlays.map(({ id, isOpen, component }) =>
        component({ isOpen, close: () => overlay.close(id), unmount: () => overlay.unmount(id) })
      )}
    </OverlayContext.Provider>
  );
}
```

---

## 3. 파일 구조 (미니 버전)

```
shared/lib/overlay/
  ├── overlay.context.tsx   ← Context 정의
  ├── overlay.reducer.ts    ← useReducer 액션/리듀서
  ├── overlay.event.ts      ← 이벤트 에미터 + overlay 객체
  ├── OverlayProvider.tsx   ← Provider + 렌더링
  └── index.ts              ← export
```

---

## 4. 좋은 점

**관련 코드 응집**

```
버튼 클릭 로직과 모달 정의가 같은 위치에 있어
코드 흐름을 한눈에 파악할 수 있다
```

**클로저로 변수 캡처**

```tsx
// item.id를 별도 state에 저장할 필요 없음
overlay.open(({ isOpen, close }) => <DeleteModal id={item.id} open={isOpen} onClose={close} />);
```

**Promise 지원**

```tsx
// 모달 결과값을 await로 받을 수 있음
const confirmed = await overlay.openAsync(({ isOpen, close }) => (
  <ConfirmDialog open={isOpen} onConfirm={() => close(true)} onCancel={() => close(false)} />
));
if (confirmed) deleteItem();
```

**모달 컴포넌트 재사용성**

```
특정 페이지 JSX에 종속되지 않음
어디서든 overlay.open()으로 호출 가능
```

---

## 5. 트레이드오프 (나쁜 점)

**러닝커브**

```
이벤트 에미터 + Context + Reducer 조합
내부 구조를 모르면 디버깅이 어렵다
팀원 모두가 패턴을 이해해야 유지보수 가능
```

**React 외부 상태 관리**

```
overlay.open()이 React 밖에서 호출됨
→ React DevTools로 추적하기 어려움
→ 상태 흐름이 명시적이지 않음
```

**남용 가능성**

```
어디서든 overlay.open() 호출 가능
→ 코드베이스가 커지면 어디서 모달을 열었는지 파악 어려움
→ 팀 컨벤션 없으면 스파게티 코드가 될 수 있음
```

**테스트 복잡도**

```tsx
// 일반 컴포넌트 테스트보다 설정 복잡
render(
  <OverlayProvider>
    {" "}
    // wrapper 필수
    <Component />
  </OverlayProvider>
);
```

**작은 프로젝트엔 오버엔지니어링**

```
useState 하나로 해결될 걸
이벤트 에미터 + Reducer + Context로 만드는 건
복잡도 대비 효용이 낮을 수 있음
```

---

## 6. 언제 쓰면 좋은가

```
✅ 적합한 경우
  - 모달 종류가 많고 여러 페이지에서 재사용
  - 목록 아이템마다 다른 id/데이터를 모달에 넘겨야 할 때
  - 모달 결과값을 Promise로 처리해야 할 때
  - 팀 전체가 패턴을 이해하고 있을 때

❌ 과한 경우
  - 모달이 1~2개뿐인 작은 프로젝트
  - 팀원들이 패턴에 익숙하지 않을 때
  - useState로 충분히 해결 가능한 경우
```

---

## 7. 나의 생각

```
"토스 overlay-kit의 내부 구조(이벤트 에미터, Context, Reducer 패턴)를
분석하고 미니 버전을 직접 구현했습니다.

기존 명령형 모달 관리(useState + 조건부 렌더링)의 문제점인
관련 코드 파편화와 상태 추가 관리 문제를 파악하고,

선언적 오버레이 관리 패턴을 도입하여
버튼과 모달 로직을 같은 위치에서 관리할 수 있는 구조를 구현했습니다.

트레이드오프(React 외부 상태 관리로 인한 DevTools 추적 어려움,
팀 러닝커브)를 이해하고 적용 여부를 판단할 수 있습니다."
```

---

## 8. 참고

- [toss/overlay-kit GitHub](https://github.com/toss/overlay-kit)
- [이벤트 에미터 패턴](https://refactoring.guru/design-patterns/observer)
- [React useReducer 공식문서](https://react.dev/reference/react/useReducer)
