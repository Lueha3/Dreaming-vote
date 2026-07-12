import { describe, expect, it } from "vitest";
import { computeBuddyRelation } from "./buddy";

type Match = {
  id: string;
  requesterId: string;
  recipientId: string;
  status: string;
};

// computeBuddyRelation이 호출하는 buddyMatch.findFirst만 흉내내는 최소 페이크.
// 실제 Prisma where 절(status + OR requester/recipient)을 그대로 평가한다.
function fakeDb(matches: Match[]) {
  return {
    buddyMatch: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const status = where.status as string;
        const or = where.OR as { requesterId?: string; recipientId?: string }[] | undefined;
        const reqId = where.requesterId as string | undefined;
        return (
          matches.find((m) => {
            if (m.status !== status) return false;
            if (reqId) return m.requesterId === reqId;
            if (or) {
              return or.some(
                (c) =>
                  (c.requesterId === undefined || m.requesterId === c.requesterId) &&
                  (c.recipientId === undefined || m.recipientId === c.recipientId),
              );
            }
            return true;
          }) ?? null
        );
      },
    },
  } as never;
}

const male = (id: string) => ({ id, gender: "남" });
const female = (id: string) => ({ id, gender: "여" });

describe("computeBuddyRelation", () => {
  it("본인이면 self", async () => {
    const r = await computeBuddyRelation(male("A"), male("A"), fakeDb([]));
    expect(r.state).toBe("self");
  });

  it("아무 관계 없고 같은 성별이면 requestable", async () => {
    const r = await computeBuddyRelation(male("A"), male("B"), fakeDb([]));
    expect(r.state).toBe("requestable");
  });

  it("성별이 다르면 gender_mismatch (신청 차단)", async () => {
    const r = await computeBuddyRelation(male("A"), female("B"), fakeDb([]));
    expect(r.state).toBe("gender_mismatch");
  });

  it("한쪽 성별 정보 없으면 gender_unknown", async () => {
    const r = await computeBuddyRelation({ id: "A", gender: null }, male("B"), fakeDb([]));
    expect(r.state).toBe("gender_unknown");
  });

  it("서로 active면 buddies (matchId 포함)", async () => {
    const db = fakeDb([{ id: "m1", requesterId: "A", recipientId: "B", status: "active" }]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("buddies");
    expect(r.matchId).toBe("m1");
  });

  it("내가 상대에게 보낸 pending이면 request_sent", async () => {
    const db = fakeDb([{ id: "m2", requesterId: "A", recipientId: "B", status: "pending" }]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("request_sent");
    expect(r.matchId).toBe("m2");
  });

  it("상대가 나에게 보낸 pending이면 request_received", async () => {
    const db = fakeDb([{ id: "m3", requesterId: "B", recipientId: "A", status: "pending" }]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("request_received");
    expect(r.matchId).toBe("m3");
  });

  it("내가 제3자와 이미 active면 i_have_buddy", async () => {
    const db = fakeDb([{ id: "m4", requesterId: "A", recipientId: "C", status: "active" }]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("i_have_buddy");
  });

  it("상대가 제3자와 이미 active면 target_has_buddy", async () => {
    const db = fakeDb([{ id: "m5", requesterId: "B", recipientId: "C", status: "active" }]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("target_has_buddy");
  });

  it("내가 제3자에게 보낸 pending이 있으면 i_have_pending", async () => {
    const db = fakeDb([{ id: "m6", requesterId: "A", recipientId: "C", status: "pending" }]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("i_have_pending");
  });

  it("우선순위: 두 사람이 active면 각자 다른 관계보다 buddies가 먼저", async () => {
    // A-B active + A가 C에게 pending도 있는 상황 → A/B 관계는 buddies로 표시
    const db = fakeDb([
      { id: "m7", requesterId: "A", recipientId: "B", status: "active" },
      { id: "m8", requesterId: "A", recipientId: "C", status: "pending" },
    ]);
    const r = await computeBuddyRelation(male("A"), male("B"), db);
    expect(r.state).toBe("buddies");
  });
});
