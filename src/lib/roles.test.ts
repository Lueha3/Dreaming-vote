import { describe, it, expect } from "vitest";
import {
  hasAtLeast,
  canManage,
  canAdminister,
  canAssignRole,
  canForceWithdraw,
  displayRoles,
  roleBadge,
  type Role,
} from "@/lib/roles";

describe("hasAtLeast", () => {
  it("null/undefined는 항상 false (fail-closed)", () => {
    expect(hasAtLeast(null, "member")).toBe(false);
    expect(hasAtLeast(undefined, "member")).toBe(false);
  });
  it("위계 비교", () => {
    expect(hasAtLeast("member", "staff")).toBe(false);
    expect(hasAtLeast("staff", "staff")).toBe(true);
    expect(hasAtLeast("admin", "staff")).toBe(true);
    expect(hasAtLeast("superadmin", "admin")).toBe(true);
    expect(hasAtLeast("staff", "admin")).toBe(false);
  });
});

describe("canManage / canAdminister", () => {
  it("canManage = staff 이상", () => {
    expect(canManage("member")).toBe(false);
    expect(canManage("staff")).toBe(true);
    expect(canManage("admin")).toBe(true);
    expect(canManage(null)).toBe(false);
  });
  it("canAdminister = admin 이상", () => {
    expect(canAdminister("staff")).toBe(false);
    expect(canAdminister("admin")).toBe(true);
    expect(canAdminister("superadmin")).toBe(true);
  });
});

describe("canAssignRole — 권한 상승/탈취 방지 게이트", () => {
  it("지정 가능 등급은 member|staff|admin 뿐 — superadmin/club_leader는 절대 불가", () => {
    expect(canAssignRole("superadmin", "member", "superadmin")).toBe(false);
    expect(canAssignRole("superadmin", "member", "club_leader" as Role)).toBe(false);
    expect(canAssignRole("admin", "member", "superadmin")).toBe(false);
  });

  it("superadmin: superadmin 대상만 제외하고 무엇이든 지정(admin 부여/회수 포함)", () => {
    expect(canAssignRole("superadmin", "member", "staff")).toBe(true);
    expect(canAssignRole("superadmin", "member", "admin")).toBe(true);
    expect(canAssignRole("superadmin", "staff", "admin")).toBe(true);
    expect(canAssignRole("superadmin", "admin", "member")).toBe(true);
    // superadmin 대상은 변경 불가
    expect(canAssignRole("superadmin", "superadmin", "member")).toBe(false);
  });

  it("admin: staff/member만 관리. admin 부여/회수·상위 변경 불가", () => {
    expect(canAssignRole("admin", "member", "staff")).toBe(true);
    expect(canAssignRole("admin", "staff", "member")).toBe(true);
    // admin 등급 부여는 superadmin 전용
    expect(canAssignRole("admin", "member", "admin")).toBe(false);
    // 다른 admin/superadmin 대상 변경 불가(상호 강등 방지)
    expect(canAssignRole("admin", "admin", "member")).toBe(false);
    expect(canAssignRole("admin", "superadmin", "member")).toBe(false);
  });

  it("staff 이하: 권한 없음", () => {
    expect(canAssignRole("staff", "member", "staff")).toBe(false);
    expect(canAssignRole("member", "member", "staff")).toBe(false);
    expect(canAssignRole("club_leader", "member", "staff")).toBe(false);
  });
});

describe("canForceWithdraw — 강제 탈퇴 등급 역전 방지 게이트", () => {
  it("staff: member만 탈퇴시킬 수 있다", () => {
    expect(canForceWithdraw("staff", "member")).toBe(true);
    expect(canForceWithdraw("staff", "staff")).toBe(false);
    expect(canForceWithdraw("staff", "admin")).toBe(false);
    expect(canForceWithdraw("staff", "superadmin")).toBe(false);
  });

  it("admin: staff/member까지. 다른 admin·superadmin은 불가(상호 탈퇴 방지)", () => {
    expect(canForceWithdraw("admin", "member")).toBe(true);
    expect(canForceWithdraw("admin", "staff")).toBe(true);
    expect(canForceWithdraw("admin", "admin")).toBe(false);
    expect(canForceWithdraw("admin", "superadmin")).toBe(false);
  });

  it("superadmin: superadmin 대상만 제외하고 모두 가능", () => {
    expect(canForceWithdraw("superadmin", "member")).toBe(true);
    expect(canForceWithdraw("superadmin", "staff")).toBe(true);
    expect(canForceWithdraw("superadmin", "admin")).toBe(true);
    expect(canForceWithdraw("superadmin", "superadmin")).toBe(false);
  });

  it("member 이하: 권한 없음", () => {
    expect(canForceWithdraw("member", "member")).toBe(false);
    expect(canForceWithdraw("club_leader", "member")).toBe(false);
  });
});

describe("displayRoles / roleBadge", () => {
  it("member·비로그인은 배지 없음", () => {
    expect(displayRoles("member")).toEqual([]);
    expect(displayRoles(null)).toEqual([]);
    expect(roleBadge("member")).toBeNull();
    expect(roleBadge(null)).toBeNull();
  });
  it("staff/admin은 배지", () => {
    expect(displayRoles("staff")).toEqual(["staff"]);
    expect(roleBadge("admin")?.label).toBe("관리자");
    expect(roleBadge("superadmin")?.label).toBe("관리자"); // 외부 표기는 admin과 동일
  });
  it("동아리장(파생)은 전역 역할과 함께 노출", () => {
    expect(displayRoles("staff", { isClubLeader: true })).toEqual(["staff", "club_leader"]);
    expect(displayRoles("member", { isClubLeader: true })).toEqual(["club_leader"]);
  });
});
