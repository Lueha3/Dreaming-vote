import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

// prisma 클라이언트 또는 트랜잭션 클라이언트 어느 쪽으로도 동작하게.
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 내 활성 짝꿍 매칭 1건(있으면). 신청자·수신자 어느 쪽이든 active면 반환.
 * 한 사람당 활성 짝꿍은 최대 1명이라는 규칙 위에서 findFirst로 충분하다.
 */
export function findActiveMatch(db: Db, userId: string) {
  return db.buddyMatch.findFirst({
    where: {
      status: "active",
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
  });
}

/** 두 사람 사이의 대기중(pending) 신청(방향 무관). */
export function findPendingBetween(db: Db, a: string, b: string) {
  return db.buddyMatch.findFirst({
    where: {
      status: "pending",
      OR: [
        { requesterId: a, recipientId: b },
        { requesterId: b, recipientId: a },
      ],
    },
  });
}

/** 내가 보낸 대기중 신청(1인 1건 제한 판정용). */
export function findMyOutgoingPending(db: Db, userId: string) {
  return db.buddyMatch.findFirst({
    where: { status: "pending", requesterId: userId },
  });
}

export type BuddyRelationState =
  | "self" // 본인
  | "buddies" // 이미 서로 짝꿍(active)
  | "request_sent" // 내가 이 사람에게 신청함(pending)
  | "request_received" // 이 사람이 나에게 신청함(pending) — matchId로 수락 가능
  | "i_have_buddy" // 나는 이미 다른 짝꿍이 있음
  | "target_has_buddy" // 상대는 이미 다른 짝꿍이 있음
  | "i_have_pending" // 나는 이미 다른 사람에게 신청을 보냄
  | "gender_unknown" // 한쪽 성별 정보 없음
  | "gender_mismatch" // 성별 다름
  | "requestable"; // 신청 가능

/**
 * 뷰어(viewer)가 대상(target)에게 취할 수 있는 짝꿍 상태를 계산.
 * 연애 앱화 방지를 위해 같은 성별만 신청 가능(gender_mismatch/unknown이면 차단).
 * 우선순위: 관계 확정(본인·이미짝꿍·상호 신청) > 각자 활성 짝꿍 보유 > 성별 > 신청가능.
 */
export async function computeBuddyRelation(
  viewer: { id: string; gender: string | null },
  target: { id: string; gender: string | null },
  db: Db = prisma,
): Promise<{ state: BuddyRelationState; matchId: string | null }> {
  if (viewer.id === target.id) return { state: "self", matchId: null };

  const [viewerActive, targetActive, pending, myOutgoing] = await Promise.all([
    findActiveMatch(db, viewer.id),
    findActiveMatch(db, target.id),
    findPendingBetween(db, viewer.id, target.id),
    findMyOutgoingPending(db, viewer.id),
  ]);

  // 두 사람이 서로의 활성 짝꿍인지
  const activeTogether =
    viewerActive &&
    (viewerActive.requesterId === target.id || viewerActive.recipientId === target.id);
  if (activeTogether) return { state: "buddies", matchId: viewerActive!.id };

  if (pending) {
    return pending.requesterId === viewer.id
      ? { state: "request_sent", matchId: pending.id }
      : { state: "request_received", matchId: pending.id };
  }

  if (viewerActive) return { state: "i_have_buddy", matchId: null };
  if (targetActive) return { state: "target_has_buddy", matchId: null };
  if (!viewer.gender || !target.gender) return { state: "gender_unknown", matchId: null };
  if (viewer.gender !== target.gender) return { state: "gender_mismatch", matchId: null };
  if (myOutgoing) return { state: "i_have_pending", matchId: null };

  return { state: "requestable", matchId: null };
}
