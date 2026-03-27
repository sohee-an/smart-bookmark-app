import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 — SmartMark",
  description: "SmartMark 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* 헤더 */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-brand-primary mb-8 inline-block text-sm font-semibold hover:opacity-80"
          >
            ← SmartMark로 돌아가기
          </Link>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">최종 업데이트: 2025년 1월</p>
        </div>

        <div className="space-y-10 text-zinc-700 dark:text-zinc-300">
          {/* 1 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
              1. 수집하는 개인정보
            </h2>
            <p className="mb-3 leading-relaxed">
              SmartMark는 서비스 제공을 위해 아래 정보를 수집합니다.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <strong>이메일 주소</strong> — 회원가입 및 로그인 식별
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <strong>저장한 URL</strong> — 북마크 서비스 제공
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <strong>AI 분석 결과</strong> — URL에서 추출한 요약, 태그 (사용자 확인 가능)
                </span>
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
              2. 개인정보 수집 및 이용 목적
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>회원 인증 및 계정 관리</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>북마크 저장, 조회, 검색 서비스 제공</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>AI 자동 요약·태깅·의미 검색 기능 제공</span>
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
              3. 개인정보 보관 및 파기
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>회원 탈퇴 시 모든 개인정보 및 북마크 데이터를 즉시 삭제합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.</span>
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
              4. 제3자 제공 및 위탁
            </h2>
            <p className="mb-3 text-sm leading-relaxed">
              수집한 개인정보는 아래 서비스에 처리를 위탁합니다.
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">
                      업체
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">
                      위탁 내용
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <tr>
                    <td className="px-4 py-3 font-medium">Supabase</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      회원 인증, 데이터베이스 저장
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Google Gemini</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      AI 요약·태그·임베딩 생성 (URL 본문 텍스트 전달)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Vercel</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">웹 서비스 호스팅</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              수집한 정보는 서비스 제공 외 목적으로 제3자에게 제공하지 않습니다.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
              5. 이용자의 권리
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>저장된 북마크 및 계정 정보는 언제든지 직접 삭제할 수 있습니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>개인정보 열람, 수정, 삭제 요청은 아래 이메일로 문의해 주세요.</span>
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
              6. 크롬 확장 프로그램 관련
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>확장 프로그램은 현재 활성화된 탭의 URL만 수집합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>사용자가 직접 저장 버튼을 누른 경우에만 URL이 서버로 전송됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>방문 기록, 검색 기록 등은 수집하지 않습니다.</span>
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">7. 문의</h2>
            <p className="text-sm leading-relaxed">
              개인정보 관련 문의사항이 있으시면 아래로 연락해 주세요.
              <br />
              <a
                href="mailto:soan32@hanmail.net"
                className="text-brand-primary mt-1 inline-block font-semibold hover:opacity-80"
              >
                soan32@hanmail.net
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
