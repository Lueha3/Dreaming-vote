import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// /admin 페이지: 인증된 경우 /admin/recruitments로 리다이렉트, 아니면 /admin/login으로
export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  if (adminSession === "1") {
    redirect("/admin/recruitments");
  } else {
    redirect("/admin/login");
  }
}
