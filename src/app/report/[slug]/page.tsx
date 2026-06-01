import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ReportCard } from "./ReportCard";

type Props = { params: Promise<{ slug: string }> | { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params instanceof Promise ? await params : params;
  const report = await prisma.report.findUnique({
    where: { shareSlug: slug },
    select: { catchphrase: true },
  });
  if (!report) return { title: "리포트 없음" };
  return {
    title: `"${report.catchphrase}" — BlueHumanity`,
    openGraph: {
      title: report.catchphrase,
      description: "AI 대화로 발견한 나의 비즈니스 페르소나",
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

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ReportCard report={report} />
      </main>
    </div>
  );
}
