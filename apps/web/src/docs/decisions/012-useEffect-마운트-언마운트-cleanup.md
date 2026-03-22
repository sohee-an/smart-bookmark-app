# 012 — useEffect, 마운트/언마운트, 그리고 cleanup

## 1. 마운트 / 언마운트가 뭔가요?

React에서 컴포넌트는 **생명 주기(Lifecycle)** 를 가집니다.

```
컴포넌트 생명 주기

  [마운트]          [업데이트]         [언마운트]
  DOM에 추가됨  →  props/state 변경  →  DOM에서 제거됨
  (화면에 나타남)   (리렌더링)           (화면에서 사라짐)
```

쉽게 말하면:

- **마운트** = 컴포넌트가 처음 화면에 나타나는 순간
- **업데이트** = state나 props가 바뀌어서 다시 그려지는 순간
- **언마운트** = 컴포넌트가 화면에서 사라지는 순간

---

## 2. useEffect 기본 구조

```typescript
useEffect(() => {
  // 실행할 코드 (side effect)

  return () => {
    // cleanup 코드 (선택)
  };
}, [의존성 배열]);
```

`useEffect`는 **렌더링이 끝난 후** 실행됩니다.
브라우저가 화면을 그린 다음에 실행된다고 이해하면 됩니다.

---

## 3. 의존성 배열에 따른 동작 차이

```typescript
// 1. 매 렌더링마다 실행
useEffect(() => {
  console.log("렌더링될 때마다 실행");
});

// 2. 마운트 시 딱 한 번만 실행
useEffect(() => {
  console.log("처음 한 번만 실행");
}, []);

// 3. isOpen이 바뀔 때마다 실행
useEffect(() => {
  console.log("isOpen이 바뀔 때마다 실행");
}, [isOpen]);
```

---

## 4. cleanup 함수가 하는 일

`return () => { ... }` 부분이 **cleanup**입니다.

cleanup은 두 가지 시점에 실행됩니다:

1. **다음 effect가 실행되기 직전** (의존성이 바뀔 때)
2. **컴포넌트가 언마운트될 때**

```typescript
useEffect(() => {
  console.log("effect 실행");

  return () => {
    console.log("cleanup 실행"); // 다음 effect 전 or 언마운트 시
  };
}, [isOpen]);
```

실행 순서를 타임라인으로 보면:

```
isOpen: false → true → false → 컴포넌트 제거

1. isOpen=false  →  effect 실행
2. isOpen=true   →  [cleanup 실행] → effect 실행
3. isOpen=false  →  [cleanup 실행] → effect 실행
4. 컴포넌트 제거  →  [cleanup 실행]
```

---

## 5. 이번 코드에 적용하기

```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden"; // 배경 스크롤 막기
  } else {
    document.body.style.overflow = ""; // 스크롤 복구
  }

  return () => {
    document.body.style.overflow = ""; // 언마운트 시 반드시 복구
  };
}, [isOpen]);
```

**왜 이렇게 작성했나?**

패널이 열릴 때(`isOpen=true`):

- `document.body.style.overflow = "hidden"` → body 스크롤 차단
- 사용자가 뒤에 있는 메인 화면을 스크롤할 수 없게 됨

패널이 닫힐 때(`isOpen=false`):

- `document.body.style.overflow = ""` → 스타일 초기화, 스크롤 복구

컴포넌트가 언마운트될 때 (예: 페이지 이동):

- cleanup의 `document.body.style.overflow = ""` 가 실행됨
- 만약 cleanup이 없으면? 패널이 열린 채 페이지 이동 시 body에 `overflow: hidden` 이 남아서
  **다른 페이지에서도 스크롤이 안 되는 버그** 발생

---

## 6. cleanup이 없으면 생기는 문제들 (실제 사례)

### 스크롤 잠금 버그

```typescript
// ❌ cleanup 없음
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  }
}, [isOpen]);

// 패널 열린 채로 페이지 이동하면?
// → body overflow: hidden 이 그대로 남음
// → 새 페이지에서 스크롤 불가능
```

### 이벤트 리스너 누수

```typescript
// ❌ cleanup 없음
useEffect(() => {
  window.addEventListener("resize", handleResize);
}, []);

// 컴포넌트가 사라져도 리스너는 계속 살아있음
// → 메모리 누수, 사라진 컴포넌트의 state를 건드려서 에러

// ✅ cleanup 있음
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

### 타이머 누수

```typescript
// ❌ cleanup 없음
useEffect(() => {
  const timer = setInterval(() => {
    fetchData();
  }, 1000);
}, []);

// 컴포넌트가 사라져도 타이머는 계속 돌아감

// ✅ cleanup 있음
useEffect(() => {
  const timer = setInterval(() => {
    fetchData();
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

---

## 7. 정리

| 상황        | 언제 실행                            |
| ----------- | ------------------------------------ |
| effect 본문 | 렌더링 후, 의존성이 바뀔 때마다      |
| cleanup     | 다음 effect 실행 직전 OR 언마운트 시 |

**cleanup의 역할**: effect에서 설정한 것들을 원래대로 되돌리기

규칙: **effect에서 뭔가를 "켰다면"**, cleanup에서 반드시 "꺼야" 합니다.

- 스크롤 막았으면 → 스크롤 복구
- 리스너 달았으면 → 리스너 제거
- 타이머 켰으면 → 타이머 해제
- 연결 열었으면 → 연결 닫기
