# smart-bookmark 코드 그래프 (발표용)

## 파일

| 파일 | 내용 |
| --- | --- |
| `qa-overlay.html` | **QA 검증 지도.** 파일 단위 코드 그래프 위에 QATester 장부를 겹친 것. 초록은 검증됨, 노랑은 부분 검증 또는 재검증 필요, 빨강은 실패 또는 검사 오류, 회색은 어느 시나리오에도 연결되지 않은 파일. 마우스를 올리면 파일, 상태, 시나리오가 보인다 |
| `graphify-out/graph.html` | Graphify 원본 그래프 (심볼 단위, 모듈 묶음 80개에 이름 붙음) |
| `graphify-out/GRAPH_REPORT.md` | Graphify 요약 (묶음 이름, 연결이 많은 노드) |
| `graphify-out/graph.json` | 전체 그래프 데이터. `graphify query`, `graphify path`로 묻는다 |

브라우저로 html 파일을 열면 된다. `qa-overlay.html`은 d3를 CDN(jsdelivr)에서 받으므로 인터넷이 필요하다.

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
