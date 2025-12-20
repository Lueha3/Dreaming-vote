"use client";

import { useRouter } from "next/navigation";

export function AdminLayoutClient() {
  const router = useRouter();

  async function handleLogout() {
    // 쿠키 삭제를 위해 API 호출
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50"
    >
      로그아웃
    </button>
  );
}

