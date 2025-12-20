import Link from "next/link";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export default async function MePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userWithApplications:
    | (Awaited<ReturnType<typeof prisma.user.findUnique>> & {
        applications: {
          id: string;
          createdAt: Date;
          recruitment: {
            id: string;
            title: string;
            status: string;
          };
        }[];
      })
    | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          include: {
            recruitment: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (user) {
      userWithApplications = user as typeof userWithApplications;
    }
  }

  const hasUser = !!userWithApplications;

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

        {!hasUser && (
          <div className="rounded-lg border bg-white px-4 py-4 text-sm text-zinc-700">
            <p>로그인된 세션이 없습니다.</p>
            <p className="mt-1">
              모집 상세 페이지에서 신청을 진행하면서 교회코드/이름/휴대폰 뒤 4자리를
              입력하면 내역이 여기 표시됩니다.
            </p>
          </div>
        )}

        {hasUser && userWithApplications && (
          <div className="space-y-4">
            <section className="rounded-lg border bg-white px-4 py-4 text-sm">
              <h2 className="mb-2 text-base font-semibold">내 정보</h2>
              <div className="space-y-1 text-sm text-zinc-700">
                <div>이름: {userWithApplications.name ?? "-"}</div>
                <div>교회 코드: {userWithApplications.churchCode}</div>
                <div>휴대폰 뒤 4자리: {userWithApplications.phoneLast4}</div>
              </div>
            </section>

            <section className="rounded-lg border bg-white px-4 py-4 text-sm">
              <h2 className="mb-2 text-base font-semibold">신청한 모집</h2>
              {userWithApplications.applications.length === 0 ? (
                <p className="text-zinc-600">신청한 모집이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {userWithApplications.applications.map((app) => (
                    <li
                      key={app.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <Link
                          href={`/r/${app.recruitment.id}`}
                          className="text-sm font-medium text-zinc-900 hover:underline"
                        >
                          {app.recruitment.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          신청일:{" "}
                          {app.createdAt.toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          app.recruitment.status === "open"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {app.recruitment.status === "open" ? "모집중" : "마감"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}


