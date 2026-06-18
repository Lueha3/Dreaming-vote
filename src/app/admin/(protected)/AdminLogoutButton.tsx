"use client";

import { createClient } from "@/lib/supabase/client";

export function AdminLogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      로그아웃
    </button>
  );
}
