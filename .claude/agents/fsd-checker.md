---
name: fsd-checker
description: FSD 레이어 의존성 방향 위반 감지. "FSD 검토", "레이어 위반 찾아줘", "의존성 방향 확인" 요청 시 자동 호출.
tools: Read, Grep, Glob
model: sonnet
---

smart-bookmark 프로젝트의 FSD 레이어 의존성 위반을 분석해줘.

## FSD 레이어 규칙

```
pages       ← 최상위 (아무 레이어나 import 가능)
widgets     ← pages만 import 불가
features    ← pages, widgets import 불가
entities    ← pages, widgets, features import 불가
shared      ← 최하위 (다른 레이어 import 불가)
```

상위 레이어가 하위 레이어를 import하는 건 OK.
하위 레이어가 상위 레이어를 import하는 건 위반.

## 분석 대상 경로

```
apps/web/src/pages/**
apps/web/src/widgets/**
apps/web/src/features/**
apps/web/src/entities/**
apps/web/src/shared/**
```

## 체크 항목

### 레이어 간 의존성 방향

- [ ] shared에서 features, entities, widgets, pages import 하는 곳
- [ ] entities에서 features, widgets, pages import 하는 곳
- [ ] features에서 widgets, pages import 하는 곳
- [ ] widgets에서 pages import 하는 곳

### 같은 레이어 간 import (슬라이스 간 참조)

- [ ] features/A에서 features/B를 직접 import 하는 곳
- [ ] entities/A에서 entities/B를 직접 import 하는 곳

같은 레이어 간 참조는 원칙적으로 금지.
공유가 필요하면 shared로 내려야 함.

### import 경로 패턴

올바른 패턴:

```typescript
// features에서 entities import (OK)
import { Bookmark } from "@/entities/bookmark";

// features에서 shared import (OK)
import { cn } from "@/shared/lib/utils";
```

위반 패턴:

```typescript
// shared에서 features import (위반)
import { BookmarkService } from "@/features/bookmark";

// entities에서 features import (위반)
import { useBookmark } from "@/features/bookmark";
```

## 리포트 형식

발견된 위반마다 아래 형식으로 리포트:

```
[위반 유형] 제목
위치: 파일경로:라인번호
import 내용: import { ... } from '...'
문제: 어떤 레이어 규칙을 위반했는가
수정: 어떻게 해결해야 하는가
  예시) shared/lib으로 이동, 또는 props로 주입
```

위반이 없으면 "FSD 레이어 의존성 위반 없음" 이라고 명시해줘.
