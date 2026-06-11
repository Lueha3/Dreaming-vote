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
  if (!report) return { title: "성향 카드를 찾을 수 없어요" };

  if (!report.isPublic) {
    const viewer = await getAuthUser();
    if (!viewer || viewer.dbUserId !== report.userId) {
      return { title: "비공개 성향 카드 — BlueHumanity" };
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

  // 비공개 성향 카드는 본인만 열람 가능
  if (!report.isPublic) {
    const viewer = await getAuthUser();
    if (!viewer || viewer.dbUserId !== report.userId) notFound();
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-10">
        <ReportCard report={report} />
      </main>
    </div>
  );
}
