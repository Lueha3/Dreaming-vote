import Link from "next/link";

/**
 * 관리자 영역 안내 — 레거시 비밀번호 인증 폐기 후 역할 기반 진입만 지원.
 * /admin 레이아웃이 미인가 접근을 이 페이지로 리다이렉트한다.
 * 운영진·관리자 권한을 가진 구글 계정으로 로그인되어 있으면 '바로 입장'으로 들어간다.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-white">관리자 영역</h1>

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#111111] p-6 text-sm leading-relaxed text-zinc-400">
          <p>
            운영진·관리자 권한이 있는 계정으로 로그인되어 있어야 입장할 수 있어요.
          </p>
          <p className="mt-2 text-zinc-500">
            권한은 슈퍼관리자가 부여합니다. 권한이 있는데도 입장되지 않으면 다시 로그인해 주세요.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login?next=/admin"
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 btn-glow"
            >
              로그인하기
            </Link>
            <Link
              href="/admin"
              className="text-xs text-violet-400 underline-offset-2 hover:underline"
            >
              바로 입장하기 →
            </Link>
          </div>
        </div>

        <Link href="/" className="mt-5 inline-block text-xs text-zinc-600 hover:text-zinc-400">
          ← 홈으로
        </Link>
      </div>
    </div>
  );
}
