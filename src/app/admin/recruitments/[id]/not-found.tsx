import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h2 className="mb-4 text-xl font-bold">모집글을 찾을 수 없습니다</h2>
      <p className="mb-6 text-zinc-600">
        해당 모집글이 삭제되었거나 존재하지 않습니다.
      </p>
      <Link
        href="/admin/recruitments"
        className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        모집글 목록으로 돌아가기
      </Link>
    </>
  );
}

