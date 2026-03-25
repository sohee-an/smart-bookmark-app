# SSRF (Server-Side Request Forgery) 복습 노트

> OWASP Top 10 2021 — A09

---

## 한 줄 정의

공격자가 서버를 대리인으로 이용해서, 서버가 내부 네트워크에 대신 요청하게 만드는 취약점

---

## 왜 가능한가

```
외부(공격자) → 내부 서버          ← 방화벽 차단 ❌
외부(공격자) → 웹서버 → 내부 서버 ← 내부망이라 허용 ✅
```

웹서버는 내부망에 있어서 방화벽 없이 내부 서비스에 자유롭게 접근 가능하다.

---

## 발생 조건

> **"사용자가 URL을 주면, 서버가 그 URL로 직접 요청하는 기능"**

이 구조가 있는 모든 곳이 대상이다.

| 기능                   | 예시                               |
| ---------------------- | ---------------------------------- |
| 링크 미리보기 / 크롤링 | smart-bookmark URL 파싱            |
| 이미지 URL 업로드      | 외부 이미지 URL → 서버 저장        |
| 웹훅                   | 사용자 등록 URL로 서버가 알림 전송 |
| 외부 API 프록시        | CORS 우회용 서버 대리 호출         |
| PDF / 스크린샷 생성    | URL 입력 → 서버가 접속 후 캡처     |

---

## 공격 시나리오

```
// 정상 요청
GET /crawl?url=https://github.com/user/repo

// 공격 요청 — 서버는 구분 못함
GET /crawl?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

### 169.254.169.254 가 뭔가

AWS EC2 인스턴스 내부에서만 접근 가능한 메타데이터 서버.
IAM 임시 자격증명(Access Key, Secret Key, Token)을 여기서 뽑을 수 있음.
→ AWS 계정 전체 장악 가능

**실제 사례: Capital One 2019 해킹 (피해자 약 1억 명)**

---

## 공격으로 할 수 있는 것들

### 1. 클라우드 메타데이터 탈취

```
http://169.254.169.254/latest/meta-data/  (AWS)
http://metadata.google.internal/          (GCP)
```

### 2. 내부 서비스 접근

```
http://localhost:8080/admin
http://192.168.1.1/
http://internal-db:5432/
http://elasticsearch:9200/_cat/indices
```

### 3. 내부망 포트 스캐닝

```
응답 빠름  → 포트 열려있음
타임아웃   → 포트 닫혀있음
```

### 4. 프로토콜 확장

| 프로토콜    | 악용                                       |
| ----------- | ------------------------------------------ |
| `file://`   | 서버 내부 파일 읽기 (`file:///etc/passwd`) |
| `dict://`   | Redis 명령 실행                            |
| `gopher://` | SMTP, Redis raw TCP 요청                   |

---

## 방어 방법

### 핵심: 블랙리스트 ❌ → 화이트리스트 ✅

```
❌ 블랙리스트: 공격자가 우회 방법을 찾아냄
✅ 화이트리스트: 목록에 없으면 전부 차단
```

### 1단계 — 허용 호스트 목록 검증

```java
private static final Set<String> ALLOWED_HOSTS = Set.of(
    "api.example.com",
    "cdn.example.com"
);

URI uri = new URI(url);
if (!ALLOWED_HOSTS.contains(uri.getHost())) {
    throw new SecurityException("허용되지 않은 호스트");
}
```

### 2단계 — 사설 IP 대역 차단

```java
private boolean isPrivateIp(InetAddress addr) {
    return addr.isLoopbackAddress()    // 127.x.x.x
        || addr.isSiteLocalAddress()   // 10.x / 172.16.x / 192.168.x
        || addr.isLinkLocalAddress();  // 169.254.x ← 클라우드 메타데이터!
}
```

### 3단계 — DNS Rebinding 방어

검증 시점 DNS와 실제 요청 시점 DNS가 달라지는 공격 방어.
→ DNS 조회 결과 IP로 직접 요청해야 함 (hostname으로 재요청 ❌)

---

## 체크리스트 (코드 리뷰 시)

- [ ] 사용자 입력 URL을 서버가 직접 요청하는 부분이 있나?
- [ ] 화이트리스트로 허용 호스트를 제한하고 있나?
- [ ] 사설 IP 대역을 차단하고 있나? (`169.254.x.x` 포함)
- [ ] DNS 조회 후 실제 IP도 검증하고 있나?
- [ ] `file://`, `gopher://` 등 HTTP 외 프로토콜을 차단하고 있나?

---

## 관련 개념

- **OWASP Top 10 2021 A09** — SSRF가 처음으로 등재된 버전
- **DNS Rebinding** — 검증 우회 공격 기법
- **IMDSv2** — AWS가 메타데이터 탈취 방어를 위해 도입한 토큰 기반 인증 방식

---

## 참고

- [OWASP SSRF](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)
- [PortSwigger SSRF Labs](https://portswigger.net/web-security/ssrf) — 실습 환경 제공
