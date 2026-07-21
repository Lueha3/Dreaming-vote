"use client";

import { CLUB_CATEGORIES } from "@/lib/clubCategories";
import { ClubCategoryIcon } from "@/components/icons";
import { ClubImageUploader, type ClubImageItem } from "@/components/ClubImageUploader";

type Props = {
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  tags: string;
  setTags: (v: string) => void;
  maxMembers: string;
  setMaxMembers: (v: string) => void;
  onImagesChange: (imgs: ClubImageItem[]) => void;
  initialImages?: ClubImageItem[];
};

/**
 * 동아리 개설/수정 공용 입력 필드(이름·카테고리·소개·키워드·정원·카드뉴스 이미지).
 * 상태는 상위 페이지가 소유(controlled). /clubs/new 와 /clubs/[id]/edit 가 공유한다.
 */
export function ClubFormFields({
  name,
  setName,
  category,
  setCategory,
  description,
  setDescription,
  tags,
  setTags,
  maxMembers,
  setMaxMembers,
  onImagesChange,
  initialImages,
}: Props) {
  return (
    <>
      <div className="glass-card p-6 space-y-5">
        {/* 이름 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">동아리 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            placeholder="예: 새벽 알고리즘 스터디"
            required
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-ink-soft">카테고리</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {CLUB_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all ${
                    active
                      ? "border-teal/50 bg-teal/15 text-teal-ink"
                      : "border-white/90 bg-white/60 text-ink-soft hover:bg-white/90 hover:text-ink"
                  }`}
                >
                  <ClubCategoryIcon category={cat} tone="inherit" className="h-4 w-4 shrink-0" />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 소개 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">소개</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={2000}
            className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            placeholder="어떤 활동을 하는 동아리인가요? 어떤 사람과 함께하고 싶나요?"
            required
          />
          <p className="mt-1.5 text-right text-xs text-ink-faint">{description.length}/2000</p>
        </div>

        {/* 키워드 (동아리 추천 매칭용) */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">
            키워드{" "}
            <span className="font-normal text-ink-faint">(쉼표로 구분 · 동아리 추천에 활용)</span>
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            placeholder="예: 코딩, 알고리즘, 성장, 몰입, 협업"
            required
          />
        </div>

        {/* 최대 인원 (선택) */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">
            최대 인원{" "}
            <span className="font-normal text-ink-faint">(선택 · 비우면 제한 없음)</span>
          </label>
          <input
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
            placeholder="예: 20"
          />
        </div>
      </div>

      {/* 카드뉴스 이미지 — 첫 장이 동아리 목록·홈 대문 캐러셀의 대표 사진(커버)이 되므로 필수. */}
      <div className="glass-card p-6">
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          대표 사진{" "}
          <span className="font-normal text-red-500">*필수</span>{" "}
          <span className="font-normal text-ink-faint">(최대 10장 · 첫 장이 대표 사진 · 승인 화면에서 검토됩니다)</span>
        </label>
        <p className="mb-4 text-xs text-ink-faint">
          동아리를 소개하는 대표 사진을 1장 이상 올려주세요. 첫 장이 동아리 목록·홈 화면 대문에 노출되는
          커버 사진이 됩니다. Canva 등으로 만든 카드뉴스 이미지를 추천합니다.
        </p>
        <ClubImageUploader onChange={onImagesChange} maxImages={10} initialImages={initialImages} />
      </div>
    </>
  );
}
