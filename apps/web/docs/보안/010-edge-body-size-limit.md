# 010 · bodyChunks 크기 제한 없음

## 심각도

Low

## 위치

- `apps/web/src/server/services/crawler.service.ts` — 54번째 줄

## 문제

페이지 본문 전체를 메모리에 올린 후 분할하는 과정에서 크기 상한이 없습니다.

```ts
const bodyText = $("p, article, main").text().replace(/\s+/g, " ").trim();
// bodyText가 수 MB일 수 있음 — 크기 제한 없음

const chunkSize = Math.ceil(bodyText.length / 3);
bodyChunks = [
  bodyText.slice(0, chunkSize),
  bodyText.slice(chunkSize, chunkSize * 2),
  bodyText.slice(chunkSize * 2),
];
```

AI 프롬프트에서는 `bodyText.slice(0, 2000)`으로 잘리지만, `bodyChunks` 자체는 API 응답에 그대로 포함되어 네트워크 전송량과 클라이언트 메모리를 낭비합니다.

## 수정 방향

bodyText를 저장·전송하기 전에 잘라냅니다.

```ts
const MAX_BODY_LENGTH = 10_000; // 10KB 상한
const bodyText = $("p, article, main").text().replace(/\s+/g, " ").trim().slice(0, MAX_BODY_LENGTH);
```

AI 프롬프트의 `slice(0, 2000)`은 그대로 두되, bodyChunks 분할 전에 미리 자르면 불필요한 데이터 전송을 방지합니다.
