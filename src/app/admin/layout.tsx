import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AdminLayoutClient } from "./AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 서버 사이드 게이트: 쿠키 확인
  // /admin/login은 이 레이아웃을 사용하지 않으므로 (별도 route group),
  // 여기서는 항상 인증이 필요함
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  if (adminSession !== "1") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold">관리자</h1>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/admin/recruitments" className="hover:text-zinc-900">
              모집글 관리
            </Link>
            <Link
              href="/admin/recruitments/new"
              className="hover:text-zinc-900"
            >
              새 모집글
            </Link>
            <AdminLayoutClient />
            <Link href="/" className="hover:text-zinc-900">
              홈
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

