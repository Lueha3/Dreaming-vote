import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";

  const where =
    status === "all"
      ? { membershipStatus: { not: "none" } }
      : { membershipStatus: "pending" };

  const raw = await prisma.user.findMany({
    where,
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      role: true,
      membershipStatus: true,
      realName: true,
      age: true,
      gender: true,
      dreamGroup: true,
      phone: true,
      membershipAppliedAt: true,
      membershipDecidedAt: true,
      membershipNote: true,
      buddyAsNewcomer: {
        where: { status: "active" },
        select: { buddy: { select: { id: true, nickname: true } } },
        take: 1,
      },
    },
    orderBy: { membershipAppliedAt: "asc" },
  });

  const isAdmin = hasAtLeast(user!.role, "admin");
  const items = raw.map(({ phone, buddyAsNewcomer, ...rest }) => ({
    ...rest,
    membershipAppliedAt: rest.membershipAppliedAt?.toISOString() ?? null,
    membershipDecidedAt: rest.membershipDecidedAt?.toISOString() ?? null,
    buddyId: buddyAsNewcomer[0]?.buddy.id ?? null,
    buddyNickname: buddyAsNewcomer[0]?.buddy.nickname ?? null,
    ...(isAdmin ? { phone } : {}),
  }));

  return NextResponse.json({ ok: true, items });
}
