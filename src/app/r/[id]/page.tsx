import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

import { RecruitmentDetailClient } from "./RecruitmentDetailClient";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function RecruitmentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) {
    notFound();
  }

  // Recruitment 조회
  const recruitment = await prisma.recruitment.findUnique({
    where: { id },
  });

  if (!recruitment) {
    notFound();
  }

  // MVP: 로그인 불필요 - 누구나 신청 가능
  // 기존 신청 여부는 클라이언트에서 localStorage contact로 확인

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <RecruitmentDetailClient initialRecruitment={recruitment} />
      </main>
    </div>
  );
}


