/**
 * 개발 환경에서 손상된 모집글을 정리하는 스크립트
 * 
 * 사용법: npm run cleanup:corrupt
 * 또는: node scripts/cleanup-corrupt.js
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function cleanupCorrupt() {
  if (!API_URL) {
    console.error("Error: NEXT_PUBLIC_API_URL environment variable is not set");
    console.error("Please set NEXT_PUBLIC_API_URL in .env.local");
    process.exit(1);
  }

  try {
    const res = await fetch(`${API_URL}/api/dev/cleanup-corrupt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      console.error("Error:", data.error || "Unknown error");
      process.exit(1);
    }

    console.log("✅ Cleanup completed:");
    console.log(`   - Deleted recruitments: ${data.deletedRecruitments || 0}`);
    console.log(`   - Deleted applications: ${data.deletedApplications || 0}`);
    
    if (data.corruptedIds && data.corruptedIds.length > 0) {
      console.log(`   - Corrupted IDs: ${data.corruptedIds.join(", ")}`);
    }
  } catch (error) {
    console.error("Failed to cleanup:", error);
    process.exit(1);
  }
}

cleanupCorrupt();

