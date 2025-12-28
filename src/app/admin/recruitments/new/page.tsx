"use client";

import { RecruitmentForm } from "../components/RecruitmentForm";

export default function NewRecruitmentPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-bold">새 모집글 생성</h2>
      <RecruitmentForm mode="create" />
    </>
  );
}
