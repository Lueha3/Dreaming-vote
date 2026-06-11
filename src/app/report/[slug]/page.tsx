import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ReportCard } from "./ReportCard";

type Props = { params: Promise<{ slug: string }> | { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params instanceof Promise ? await params : params;
  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    select: { catchphrase: true, isPublic: true, userId: true },
  });
  if (!report) return { title: "리포트 없음" };

  if (!report.isPublic) {
    const viewer = await getAuthUser();
    if (!viewer || viewer.dbUserId !== report.userId) {
      return { title: "비공개 리포트 — BlueHumanity" };
    }
  }

  return {
    title: `"${report.catchphrase}" — BlueHumanity`,
    openGraph: {
      title: report.catchphrase,
      description: "AI가 찾아준 나의 성향 카드",
      images: [`/api/og/${slug}`],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ReportPage({ params }: Props) {
  const { slug } = params instanceof Promise ? await params : params;

  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    include: { user: { select: { nickname: true } } },
  });

  if (!report) notFound();

  // 비공개 리포트는 본인만 열람 가능
  if (!report.isPublic) {
    const viewer = await getAuthUser();
    if (!viewer || viewer.dbUserId !== report.userId) notFound();
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>
      <main className="relative mx-auto max-w-2xl px-4 py-10">
        <ReportCard report={report} />
      </main>
    </div>
  );
}
