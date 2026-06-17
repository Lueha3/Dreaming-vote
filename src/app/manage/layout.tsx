import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { canManage } from "@/lib/roles";
import { ManageNav } from "@/components/ManageNav";

/**
 * /manage — 역할 기반 운영 영역(운영진 이상). 공유 비밀번호 /admin과 별개로,
 * 로그인한 본인의 role로 게이트한다. getAuthUser가 쿠키를 읽으므로 이 영역은 동적 렌더.
 */
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/manage");
  if (!canManage(user.role)) redirect("/");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">🛠 운영 관리</h1>
          <Link href="/" className="text-xs text-ink-faint transition-colors hover:text-ink">
            ← 홈
          </Link>
        </div>
        <ManageNav />
        {children}
      </main>
    </div>
  );
}
