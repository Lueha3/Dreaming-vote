import { notFound } from "next/navigation";
import { SurveyRunner } from "./SurveyRunner";

// 검사 2종은 정적 경로 — 게스트 우선이라 서버 데이터가 전혀 필요 없다.
export function generateStaticParams() {
  return [{ subject: "parent" }, { subject: "child" }];
}

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  if (subject !== "parent" && subject !== "child") notFound();
  return <SurveyRunner subject={subject} />;
}
