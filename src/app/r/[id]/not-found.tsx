import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold">
            모집 상세
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/" className="hover:text-zinc-900">
              목록
            </Link>
            <Link href="/my" className="hover:text-zinc-900">
              내 신청내역
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-zinc-900">
            모집글을 찾을 수 없습니다
          </h1>
          <p className="mb-6 text-zinc-600">
            삭제되었거나 존재하지 않습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
          >
            모집 목록으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}

