import Link from "next/link";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-center border-b bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="꿈꾸는교회 로고"
            className="h-8 w-auto max-w-[200px] object-contain"
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600">
          <Link href="/my" className="hover:text-zinc-900">
            내 신청내역
          </Link>
          <Link href="/" className="hover:text-zinc-900">
            목록
          </Link>
          <Link href="/admin/login" className="hover:text-zinc-900">
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}

