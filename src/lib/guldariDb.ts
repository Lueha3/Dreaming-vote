import { PrismaClient } from "@/generated/guldari-client";

// 굴다리(Guldari) 콘서트 앱 전용 DB 클라이언트 — 기존 src/lib/db.ts(Blue-Humanity)와는
// 물리적으로 분리된 별도 Supabase 프로젝트에 연결한다. 스키마는
// prototype/guldari/db/schema.prisma, 실제 DDL은 같은 폴더의 001/002 SQL 참고.

declare global {
  // eslint-disable-next-line no-var
  var guldariPrisma: PrismaClient | undefined;
}

export const guldariDb =
  global.guldariPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.guldariPrisma = guldariDb;
