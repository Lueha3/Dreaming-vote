/**
 * Backfill script for contactNormalized field
 * 
 * Usage:
 *   npx ts-node scripts/backfill-contactNormalized.ts
 * 
 * Or with tsx:
 *   npx tsx scripts/backfill-contactNormalized.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Contact 정규화: 이메일은 소문자, 전화번호는 숫자만 추출
 */
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();

  // 이메일 형식인지 확인
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  // 전화번호: 모든 숫자가 아닌 문자 제거 (공백, 하이픈, 괄호 등)
  return trimmed.replace(/\D/g, "");
}

async function main() {
  console.log("Starting contactNormalized backfill...");

  // Find applications with empty contactNormalized
  const applications = await prisma.application.findMany({
    where: {
      contactNormalized: "",
    },
    select: {
      id: true,
      contact: true,
    },
  });

  console.log(`Found ${applications.length} applications to backfill.`);

  if (applications.length === 0) {
    console.log("No applications need backfilling. Done!");
    return;
  }

  // Process in batches of 100
  const BATCH_SIZE = 100;
  let updated = 0;

  for (let i = 0; i < applications.length; i += BATCH_SIZE) {
    const batch = applications.slice(i, i + BATCH_SIZE);

    // Update each application in the batch
    await Promise.all(
      batch.map(async (app) => {
        const contactNormalized = normalizeContact(app.contact);
        
        try {
          await prisma.application.update({
            where: { id: app.id },
            data: { contactNormalized },
          });
          updated++;
        } catch (error: any) {
          // Handle unique constraint violation (duplicate contactNormalized for same recruitment)
          if (error?.code === "P2002") {
            console.warn(`Skipping duplicate: ${app.id} (${app.contact})`);
          } else {
            console.error(`Error updating ${app.id}:`, error?.message);
          }
        }
      })
    );

    console.log(`Processed ${Math.min(i + BATCH_SIZE, applications.length)} / ${applications.length}`);
  }

  console.log(`Backfill complete. Updated ${updated} applications.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

