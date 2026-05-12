# 📋 테스트 전략 (Testing Strategy)

북마크 앱의 테스트 계획 및 체크리스트.

---

## 1️⃣ 단위 테스트 (Unit Tests)

### 순수 함수 (Pure Functions)

| 파일 | 테스트 수 | 상태 | 가치 | 예상 시간 |
|------|----------|------|------|---------|
| `validateUrl.ts` | 32 | ✅ 완료 | 높음 | 30분 |
| `bookmark.mapper.ts` | 6 | ✅ 완료 | 높음 | 20분 |
| `error.ts` | ~10 | ⏳ 미작성 | 중간 | 20분 |
| `guest.ts` | ~8 | ⏳ 미작성 | 중간 | 20분 |
| `storage.ts` | ~12 | ⏳ 미작성 | 중간 | 30분 |

### 상태 관리 (State Management)

| 파일 | 타입 | 테스트 수 | 상태 | 가치 | 예상 시간 |
|------|------|----------|------|------|---------|
| `useBookmarkStore.ts` | Zustand | 20 | ✅ 완료 | 높음 | 45분 |
| `queries.ts` (useBookmarks) | TanStack Query | ~15 | ⏳ 미작성 | 높음 | 1시간 |
| `queries.ts` (useUpdateBookmark) | TanStack Query | ~12 | ⏳ 미작성 | 높음 | 1시간 |
| `queries.ts` (useDeleteBookmark) | TanStack Query | ~10 | ⏳ 미작성 | 높음 | 45분 |
| `queries.ts` (useBookmarkCount) | TanStack Query | ~8 | ⏳ 미작성 | 중간 | 30분 |

### 저장소 계층 (Repository Layer)

| 파일 | 저장소 | 테스트 수 | 상태 | 가치 | 예상 시간 | 주의사항 |
|------|--------|----------|------|------|---------|---------|
| `local.repository.ts` | LocalStorage | ~35 | ⏳ 미작성 | 매우높음 | 1.5시간 | Side effect 격리됨 |
| `supabase.repository.ts` | Supabase | ~30 | ⏳ 미작성 | 매우높음 | 1.5시간 | API 모킹 필요 |

**작성 가이드**:
```typescript
// LocalRepository: 주입된 providers 사용
const repo = new LocalRepository(
  mockStorage,
  () => fixedDate,
  () => fixedUUID
);

// SupabaseBookmarkRepository: MSW로 API 모킹
server.use(
  http.get("/rest/v1/bookmarks", () => HttpResponse.json(...))
);
```

### 서비스 계층 (Service Layer)

| 파일 | 패턴 | 테스트 수 | 상태 | 가치 | 예상 시간 |
|------|------|----------|------|------|---------|
| `bookmark.service.ts` | Factory | ~20 | ⏳ 미작성 | 매우높음 | 1시간 |
| `crawler.service.ts` | 크롤링 | ~15 | ⏳ 미작성 | 높음 | 1시간 |
| `ai.service.ts` | API | ~15 | ⏳ 미작성 | 높음 | 1시간 |

---

## 2️⃣ 통합 테스트 (Integration Tests)

### API 라우트

| 엔드포인트 | 메서드 | 시나리오 | 상태 | 가치 | 예상 시간 |
|-----------|--------|--------|------|------|---------|
| `/api/bookmarks` | POST | 비회원 5개 제한 | ⏳ 미작성 | 매우높음 | 1시간 |
| `/api/bookmarks` | POST | 회원 저장 | ⏳ 미작성 | 매우높음 | 1시간 |
| `/api/bookmarks` | GET | 필터링 (태그, 상태) | ⏳ 미작성 | 높음 | 1시간 |
| `/api/bookmarks` | GET | 검색 (키워드, 시맨틱) | ⏳ 미작성 | 높음 | 1시간 |
| `/api/bookmarks/:id` | PATCH | 수정 검증 | ⏳ 미작성 | 높음 | 45분 |
| `/api/bookmarks/:id` | DELETE | 삭제 검증 | ⏳ 미작성 | 높음 | 45분 |

### 서비스 조합

| 조합 | 시나리오 | 상태 | 가치 | 예상 시간 |
|------|--------|------|------|---------|
| BookmarkService + LocalRepository | 비회원 CRUD | ⏳ 미작성 | 매우높음 | 1시간 |
| BookmarkService + SupabaseBookmarkRepository | 회원 CRUD | ⏳ 미작성 | 매우높음 | 1.5시간 |
| CrawlerService + AIService + BookmarkService | URL→저장 전체 워크플로우 | ⏳ 미작성 | 높음 | 1.5시간 |

### 데이터 흐름 시나리오

| 시나리오 | 테스트 내용 | 상태 | 가치 |
|--------|-----------|------|------|
| 북마크 저장 | 저장 → 조회 → 검증 | ⏳ 미작성 | 매우높음 |
| 북마크 업데이트 | 수정 → 조회 → 변경 검증 | ⏳ 미작성 | 높음 |
| 필터링 조합 | 다중 북마크 → 필터 → 검증 | ⏳ 미작성 | 높음 |
| 검색 정확도 | 저장 → 검색 → 결과 검증 | ⏳ 미작성 | 중간 |
| 5개 제한 | 5개 저장 → 6번째 시도 → 에러 | ⏳ 미작성 | 높음 |

---

## 3️⃣ E2E 테스트 (End-to-End Tests)

> Playwright를 사용한 실제 브라우저 테스트

| 기능 | 상태 | 우선순위 |
|------|------|---------|
| 북마크 저장 → 카드 표시 | ⏳ 미작성 | 🔴 높음 |
| URL 입력 → AI 처리 완료 | ⏳ 미작성 | 🔴 높음 |
| 태그 필터링 동작 | ⏳ 미작성 | 🟡 중간 |
| 검색 기능 동작 | ⏳ 미작성 | 🟡 중간 |
| 북마크 삭제 | ⏳ 미작성 | 🟡 중간 |
| 북마크 상세 패널 | ⏳ 미작성 | 🟢 낮음 |

---

## 📊 커버리지 목표

| 레이어 | 목표 | 우선순위 | 이유 |
|--------|------|---------|------|
| `entities/` | 90%+ | 🔴 높음 | 도메인 로직, 재사용성 높음 |
| `features/` | 80%+ | 🔴 높음 | 비즈니스 로직 중요 |
| `shared/` | 85%+ | 🟡 중간 | 재사용 유틸 |
| `pages/` | 60%+ | 🟢 낮음 | E2E로 주로 테스트 |

**전체 목표**: 80% 이상

---

## 🚀 실행 명령어

```bash
# 모든 테스트 실행
pnpm test

# 단위 테스트만
pnpm test:unit

# 통합 테스트만
pnpm test:integration

# E2E 테스트만
pnpm test:e2e

# 특정 파일만
pnpm test validateUrl.test.ts

# 커버리지 리포트
pnpm test --coverage

# Watch 모드
pnpm test --watch
```

---

## 🛠️ 파일별 작성 가이드

### LocalRepository 테스트

**특징**:
- Side effect 격리됨 (DateProvider, UUIDProvider, StorageProvider 주입)
- 5개 제한 로직 검증 필수
- 모든 CRUD 메서드 테스트

**예시**:
```typescript
const repo = new LocalRepository(
  mockStorage,
  () => new Date("2024-03-08"),
  () => "fixed-uuid"
);

const result = await repo.save({url: "..."});
expect(result.id).toBe("fixed-uuid");
expect(result.createdAt).toBe("2024-03-08T00:00:00.000Z");
```

### useBookmarks 테스트

**특징**:
- MSW로 API 모킹
- TanStack Query 캐싱 고려
- 로딩/에러 상태 검증

**예시**:
```typescript
server.use(
  http.get("/api/bookmarks", () =>
    HttpResponse.json([{id: "1", ...}])
  )
);

const { result } = renderHook(() => useBookmarks());
await waitFor(() => {
  expect(result.current.data).toEqual([...]);
});
```

### API 라우트 테스트

**특징**:
- node-mocks-http 사용
- 전체 요청/응답 검증
- 에러 케이스 포함

**예시**:
```typescript
const { req, res } = createMocks({
  method: "POST",
  body: {url: "https://example.com"}
});

await POST(req, res);

expect(res._getStatusCode()).toBe(200);
expect(JSON.parse(res._getData())).toHaveProperty("id");
```

---

## 📅 작성 로드맵

### Phase 1: 기초 (3일)
- ✅ validateUrl.test.ts (32개)
- ✅ bookmark.mapper.test.ts (6개)
- ✅ useBookmarkStore.test.ts (20개)

### Phase 2: 저장소 (2주)
- ⏳ LocalRepository (~35개)
- ⏳ SupabaseBookmarkRepository (~30개)
- ⏳ BookmarkService (~20개)

### Phase 3: 상태관리 (1.5주)
- ⏳ useBookmarks
- ⏳ useUpdateBookmark
- ⏳ useDeleteBookmark

### Phase 4: 통합 (우선순위 완료) ✅
- ✅ 비회원 저장 → 5개 제한 → 에러 (bookmark-guest-workflow.test.ts)
- ✅ 회원 저장 → 조회 → 반영 (bookmark-user-workflow.test.ts)
- ✅ POST /api/bookmarks (guest/user) (bookmark-api-save.test.ts)
- ✅ URL → AI 파이프라인 상태 변화 (bookmark-ai-pipeline.test.ts)

**추가 통합 테스트 (선택사항)**
- ⏳ GET /api/bookmarks (필터)
- ⏳ GET /api/bookmarks (검색)
- ⏳ PATCH /api/bookmarks/:id
- ⏳ DELETE /api/bookmarks/:id

### Phase 5: E2E (1주)
- ⏳ 주요 사용자 시나리오

**총 예상**: 약 7-8주

---

## ✅ 체크리스트

```
기초 (완료)
- [x] validateUrl.test.ts (32개)
- [x] bookmark.mapper.test.ts (6개)
- [x] useBookmarkStore.test.ts (20개)

저장소
- [ ] LocalRepository (~35개)
- [ ] SupabaseBookmarkRepository (~30개)
- [ ] BookmarkService (~20개)

상태관리
- [ ] useBookmarks (~15개)
- [ ] useUpdateBookmark (~12개)
- [ ] useDeleteBookmark (~10개)

통합 (우선순위 완료)
- [x] 비회원 저장 → 5개 제한 → 에러
- [x] 회원 저장 → 조회 → 반영
- [x] POST /api/bookmarks (비회원/회원)
- [x] URL → AI 파이프라인 상태 변화

통합 (추가)
- [ ] GET /api/bookmarks (필터)
- [ ] GET /api/bookmarks (검색)
- [ ] PATCH /api/bookmarks/:id
- [ ] DELETE /api/bookmarks/:id

E2E
- [ ] 북마크 저장
- [ ] AI 처리 완료
- [ ] 필터링
- [ ] 검색
```

---

## 📚 참고

- **테스트 파일 위치**: `파일.test.ts` (co-location)
- **테스트 도구**: vitest, @testing-library/react, MSW
- **에러 검증**: `BookmarkError` 클래스 사용
- **모킹 패턴**: Side effect 격리, providers 주입

