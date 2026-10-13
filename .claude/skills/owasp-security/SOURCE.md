# 출처

- 원본: https://github.com/agamm/claude-code-owasp (`.claude/skills/owasp-security/`)
- 고정 커밋: `8ac7965caa212b4a850aff8d3df0081ab3fa9eed` (2026-10-14 받음)
- 라이선스: MIT (같은 폴더의 `LICENSE`)
- 수정: 없음. 원본 그대로 둔다. 이 프로젝트 사정은 `.claude/agents/security-reviewer.md`에 따로 적는다

## 들여온 이유

보안 전문가가 아니어서 직접 만든 체크리스트만으로는 기준이 약했다. OWASP Top 10:2025, ASVS 5.0,
LLM Top 10(2026) 기준과 "보고 전 4가지 확인(입력 출처, 도달 여부, 피해 범위, 공격 단계)" 규칙을 가져온다.

## 업데이트 방법

자동 업데이트하지 않는다. 외부 지시문이 바뀌면 AI 동작이 바뀌므로, 새 커밋을 받을 때는
diff를 읽고 이 파일의 고정 커밋을 갱신한다.
