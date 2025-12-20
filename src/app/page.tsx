import { RecruitmentList } from "./components/RecruitmentList";

export default async function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">모집 목록</h1>
        <RecruitmentList />
      </main>
    </div>
  );
}
