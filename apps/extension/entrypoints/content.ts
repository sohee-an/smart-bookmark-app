export default defineContentScript({
  matches: ["https://smartmark.wooyou.co.kr/*", "http://localhost:3000/*"],
  runAt: "document_start",
  main() {
    // 웹앱이 익스텐션 설치 여부를 감지할 수 있도록 플래그 심기
    (window as Window & { __smartmark_ext?: boolean }).__smartmark_ext = true;
  },
});
