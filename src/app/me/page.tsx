import Link from "next/link";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export default async function MePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let user = null;

  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        churchCode: true,
        name: true,
        phoneLast4: true,
        createdAt: true,
      },
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold">
            내 신청내역
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/" className="hover:text-zinc-900">
              모집 목록
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">내 신청내역</h1>

        {!userId ? (
          <div className="rounded-lg border bg-white px-4 py-4 text-sm text-zinc-700">
            <p>로그인이 필요합니다.</p>
          </div>
        ) : !user ? (
          <div className="rounded-lg border bg-white px-4 py-4 text-sm text-zinc-700">
            <p>사용자 정보를 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border bg-white px-4 py-4 text-sm">
              <h2 className="mb-2 text-base font-semibold">내 정보</h2>
              <div className="space-y-1 text-sm text-zinc-700">
                <div>이름: {user.name ?? "-"}</div>
                <div>교회 코드: {user.churchCode}</div>
                <div>휴대폰 뒤 4자리: {user.phoneLast4}</div>
              </div>
            </section>

            <section className="rounded-lg border bg-white px-4 py-4 text-sm">
              <h2 className="mb-2 text-base font-semibold">신청내역</h2>
              <p className="mt-2 text-sm text-zinc-600">
                신청내역은 연락처 기반으로 조회합니다.
              </p>
              <Link
                href="/my"
                className="mt-3 inline-block text-sm text-emerald-600 underline hover:text-emerald-700"
              >
                내 신청내역으로 이동
              </Link>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}


