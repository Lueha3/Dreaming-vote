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

  const recruitment = await prisma.recruitment.findUnique({
    where: { id },
  });

  if (!recruitment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <RecruitmentDetailClient initialRecruitment={recruitment} />
      </main>
    </div>
  );
}


