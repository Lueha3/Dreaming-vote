import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  if (adminSession !== "1") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Admin
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-sm font-semibold text-white">BlueHumanity</span>
          </div>

          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/admin/stats"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              통계
            </Link>
            <Link
              href="/admin/prompts"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              프롬프트 관리
            </Link>
            <Link
              href="/admin/clubs"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              동아리 승인
            </Link>
            <span className="text-zinc-700">|</span>
            <AdminLogoutButton />
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs">
              ← 홈
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
    </div>
  );
}
