import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * CSV 셀 이스케이프.
 * 1) 수식 인젝션 방어: =,+,-,@,탭,CR로 시작하는 값은 엑셀이 수식으로 실행할 수 있어
 *    작은따옴표를 앞에 붙여 텍스트로 강제(닉네임·실명 등 사용자 입력 포함).
 * 2) 따옴표·쉼표·개행 포함 시 따옴표로 감싸고 내부 따옴표는 2개로.
 */
function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/manage/membership/export — 승인 멤버 명단 CSV 다운로드(운영진+).
 * 연락처(phone)는 관리자(admin+)에게만 포함. 엑셀 한글 호환을 위해 BOM + CRLF.
 * 내보내기는 PII 반출이므로 감사 로그(roster_export) 기록.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const isAdmin = hasAtLeast(user!.role, "admin");

  const members = await prisma.user.findMany({
    where: { membershipStatus: "approved", deletedAt: null },
    orderBy: [{ dreamGroup: "asc" }, { nickname: "asc" }],
    select: {
      nickname: true,
      realName: true,
      approvedAge: true,
      age: true,
      gender: true,
      dreamGroup: true,
      phone: true,
      membershipDecidedAt: true,
    },
  });

  const header = ["닉네임", "실명", "나이", "성별", "꿈터", ...(isAdmin ? ["연락처"] : []), "승인일"];
  const lines = members.map((m) => {
    const decided = m.membershipDecidedAt
      ? new Date(m.membershipDecidedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
      : "";
    const cells = [
      m.nickname,
      m.realName,
      m.approvedAge ?? m.age,
      m.gender,
      m.dreamGroup,
      ...(isAdmin ? [m.phone] : []),
      decided,
    ];
    return cells.map(csvCell).join(",");
  });

  const csv = "﻿" + [header.join(","), ...lines].join("\r\n"); // ﻿=BOM(엑셀 한글), CRLF

  // PII 반출 감사 (best-effort)
  try {
    await recordAudit({
      actor: user,
      action: "roster_export",
      targetType: "user",
      targetId: user!.dbUserId,
      summary: `멤버 명단 CSV 내보내기 (${members.length}명${isAdmin ? ", 연락처 포함" : ""})`,
      ip: getClientIp(req),
    });
  } catch {
    /* best-effort */
  }

  const filename = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
