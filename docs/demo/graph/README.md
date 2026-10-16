# smart-bookmark 코드 그래프 (발표용)

## 파일

| 파일 | 내용 |
| --- | --- |
| `qa-overlay.html` | **QA 검증 지도.** 파일 단위 코드 그래프 위에 QATester 장부를 겹친 것. 초록은 검증됨, 노랑은 부분 검증 또는 재검증 필요, 빨강은 실패 또는 검사 오류, 회색은 어느 시나리오에도 연결되지 않은 파일. 마우스를 올리면 파일, 상태, 시나리오가 보인다 |
| `flow-map.html` | **import 노선도 (웹 + 익스텐션, 묶음 단위).** 파일을 폴더 묶음(features/bookmark, shared/lib, extension/components 같은 것)으로 합쳐 입구부터 왼쪽→오른쪽으로 그린 것. 전체를 한 화면에 보려면 이걸 연다. 위에서 웹만 / 익스텐션만 / 둘 다로 바꿀 수 있다. 익스텐션 → 웹 API는 import가 아니라 fetch라 점선으로 손으로 넣었다. 점을 누르면 안에 든 파일과 파일 단위 import가 옆에 뜬다. 만드는 법: 레포 루트에서 `node docs/demo/graph/flow-map.mjs` |
| `flow-all.html` | **import 흐름 (apps/web 전체).** 같은 graph.json을 파일 단위로 합쳐 FSD 층을 열로 두고 입구(page, route)부터 왼쪽→오른쪽으로 그린 것. 역방향 import가 0개라 전체가 한 방향으로 흐른다. 많이 쓰이는 파일(types.ts 같은 것)로 가는 선은 기본으로 접는다. 점을 누르면 그 파일의 앞뒤만 남는다. 만드는 법: 레포 루트에서 `node docs/demo/graph/flow-all.mjs` |
| `flow-view.html` | **URL 저장 경로.** 입구(+ 버튼)부터 Gemini, Supabase까지 요청 하나가 지나가는 파일만 왼쪽→오른쪽으로 그린 것. 실선은 graph.json에 있는 import, 점선은 화면에서 API 라우트로 가는 fetch(손으로 추가). 테두리 색은 QA 장부 상태. 점을 누르면 그 파일을 지나는 길만 남는다. 만드는 법: 레포 루트에서 `node docs/demo/graph/flow-view.mjs` |
| `graphify-out/graph.html` | Graphify 원본 그래프 (심볼 단위, 모듈 묶음 80개에 이름 붙음) |
| `graphify-out/GRAPH_REPORT.md` | Graphify 요약 (묶음 이름, 연결이 많은 노드) |
| `graphify-out/graph.json` | 전체 그래프 데이터. `graphify query`, `graphify path`로 묻는다 |

브라우저로 html 파일을 열면 된다. `qa-overlay.html`은 d3를, `flow-map.html`, `flow-all.html`, `flow-view.html`, `graph.html`은 vis-network를 CDN에서 받으므로 인터넷이 필요하다.

## 만든 방법

대상은 dev 브랜치 `fcd6cee` (sb-qa 작업 폴더). Graphify 0.9.90은 홈 폴더의 전용 가상환경(`~/.graphify-venv`)에만 설치했고, Claude 설정에 스킬로 등록하지 않았다.

```bash
V=~/.graphify-venv
# 1. 코드만 분석 (tree-sitter, 이 컴퓨터 안에서만, AI 호출 없음)
$V/Scripts/graphify extract . --code-only --out ~/Desktop/smart-bookmark-graph
# 2. 모듈 묶음 이름 붙이기 (로컬 claude CLI로 AI 호출)
$V/Scripts/graphify label ~/Desktop/smart-bookmark-graph --backend=claude-cli
# 3. QA 장부 겹치기 (sb-qa 폴더에서 실행, QATester의 lib.mjs로 시나리오 상태를 계산)
node qa-overlay.mjs graphify-out/graph.json qa-overlay.html
```

## 코드가 밖으로 나갔나

- 1단계(분석)와 3단계(겹치기)는 이 컴퓨터 안에서만 돌았다. 코드 내용은 어디에도 보내지 않았다
- 2단계(이름 붙이기)만 AI를 불렀다. 함수 이름, 파일 경로 같은 그래프 정보가 로컬 claude CLI를 거쳐 Anthropic으로 갔다. 코드 본문은 보내지 않는다

## 다시 만들기

코드가 바뀌면 `graphify update .`(AI 없음)로 그래프를 갱신하고, 이름이 비면 `graphify label <폴더> --missing-only --backend=claude-cli`, 그다음 3단계를 다시 돌린다.

## 알고 볼 것

- 회색이 많은 건 정상이다. 익스텐션, 공용 UI 패키지, 설정, 스크립트는 아직 시나리오가 없다. 공용 UI 패키지는 장부의 연결이 따라가지 못하는 곳이기도 하다
- 심볼이 하나도 없는 파일(설정 파일 등 35개)은 Graphify 그래프에 노드가 없어서 이 지도에도 안 보인다
- 장부 상태는 sb-qa 폴더의 로컬 장부 기준이다 (커밋 안 된 근거 포함)
