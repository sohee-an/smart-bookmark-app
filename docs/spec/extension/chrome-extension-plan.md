# Chrome Extension 배포 계획

## 개요

SmartMark 웹앱과 연동되는 크롬 익스텐션.
현재 페이지에서 아이콘 클릭 한 번으로 북마크를 저장할 수 있게 한다.

---

## 동작 플로우

```
[아이콘 클릭]
     ↓
로그인 상태 체크
     ├── 비로그인 → "SmartMark에 로그인하세요" + 링크
     └── 로그인 → 팝업 열림
              URL: 현재 탭 URL 자동 입력
              메모: 선택 입력
              [저장] 클릭
                ↓
           즉시 "저장됨 ✓" 표시 후 팝업 닫힘
                ↓
           백그라운드: 크롤링 → AI 분석 → 임베딩
                ↓
           완료 시 Chrome 데스크탑 알림
```

---

## 디렉토리 구조

모노레포에 `packages/extension` 패키지로 추가.

```
packages/extension/
├── manifest.json          # Manifest V3
├── popup/
│   ├── popup.html
│   └── popup.tsx          # React + Vite 빌드
├── background/
│   └── service-worker.ts  # 백그라운드 AI 파이프라인 처리
└── content/
    └── content-script.ts  # 현재 탭 URL/메타 추출
```

---

## 핵심 해결 과제

| 과제            | 방법                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| **인증**        | Supabase 토큰을 `chrome.storage.local`에 저장, OAuth 리디렉션을 익스텐션 내부에서 처리 |
| **API 호출**    | 기존 `/api/crawl`, `/api/ai-analyze`, `/api/embed` 그대로 호출                         |
| **CORS**        | `next.config.js`에 익스텐션 origin 허용 설정                                           |
| **비동기 처리** | 팝업 닫힌 후 service worker가 백그라운드에서 AI 파이프라인 실행                        |
| **완료 알림**   | `chrome.notifications` API로 데스크탑 알림                                             |

---

## 모노레포 통합

```json
// turbo.json pipeline에 추가
"build": {
  "dependsOn": ["^build"]
}
```

- `packages/types` 공유 타입 재사용 가능
- `packages/ui`는 Tailwind 설정 분리 필요 → 팝업 UI는 별도 스타일로 구성

---

## 배포 단계

1. `packages/extension` 패키지 구현
2. `chrome://extensions` 개발자 모드로 로컬 테스트
3. 빌드 후 `.zip` 패키징
4. Chrome Web Store 제출 (심사 2~3일 소요)
5. 스토어 등록 후 웹앱 랜딩에 설치 링크 추가

---

## 현재 연결 포인트

기존 API 파이프라인이 이미 구축되어 있어 **익스텐션은 UI와 인증만 추가하면 된다.**

- 백엔드 변경 최소화
- 주요 추가 작업: Supabase 세션을 익스텐션에서 공유하는 방식 구현
