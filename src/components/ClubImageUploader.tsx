"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

export type ClubImageItem = {
  url: string;
  caption: string;
  order: number;
};

type UploadState = {
  localId: string;
  path: string | null;
  previewUrl: string;
  url: string | null;
  caption: string;
  uploading: boolean;
  error: string | null;
};

interface Props {
  onChange: (images: ClubImageItem[]) => void;
  maxImages?: number;
  /** 수정 모드 prefill — 기존에 업로드된 이미지(이미 공개 URL 보유). */
  initialImages?: ClubImageItem[];
}

export function ClubImageUploader({ onChange, maxImages = 5, initialImages }: Props) {
  const [items, setItems] = useState<UploadState[]>(() =>
    (initialImages ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((img) => ({
        localId: crypto.randomUUID(),
        // 기존 업로드본은 스토리지 경로를 모름 → 제거해도 객체는 best-effort 미정리(고아 허용).
        path: null,
        previewUrl: img.url,
        url: img.url,
        caption: img.caption,
        uploading: false,
        error: null,
      })),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function notify(updated: UploadState[]) {
    onChange(
      updated
        .filter((i) => i.url && !i.uploading && !i.error)
        .map((item, idx) => ({ url: item.url!, caption: item.caption, order: idx })),
    );
  }

  async function handleAdd(files: FileList) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const active = items.filter((i) => !i.error);
    const slots = maxImages - active.length;
    if (slots <= 0) return;

    const toUpload = Array.from(files).slice(0, slots);

    const newItems: UploadState[] = toUpload.map((file) => ({
      localId: crypto.randomUUID(),
      path: null,
      previewUrl: URL.createObjectURL(file),
      url: null,
      caption: "",
      uploading: true,
      error: null,
    }));

    setItems((prev) => [...prev, ...newItems]);

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const item = newItems[i];

      if (file.size > 20 * 1024 * 1024) {
        setItems((prev) =>
          prev.map((p) =>
            p.localId === item.localId ? { ...p, uploading: false, error: "20MB 초과" } : p,
          ),
        );
        continue;
      }

      let fileToUpload: File | Blob = file;
      let ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";

      try {
        const options = {
          maxSizeMB: 1,             // 최대 1MB — 홈 대문 캐러셀 풀블리드 히어로로 쓰여 화질이 중요
          maxWidthOrHeight: 1440,   // 캐러셀 카드 실 표시폭보다 여유 있게(레티나 대응)
          initialQuality: 0.92,     // 목표 용량 안에서 화질 우선(필요시 라이브러리가 자동으로 더 낮춤)
          useWebWorker: true,
          fileType: "image/webp" as const,
        };
        fileToUpload = await imageCompression(file, options);
        ext = "webp";
      } catch (e) {
        console.error("이미지 압축 실패:", e);
        setItems((prev) =>
          prev.map((p) =>
            p.localId === item.localId ? { ...p, uploading: false, error: "압축 실패" } : p,
          ),
        );
        continue;
      }

      const path = `clubs/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("club-images")
        .upload(path, fileToUpload, { cacheControl: "3600", upsert: false });

      if (error || !data) {
        setItems((prev) =>
          prev.map((p) =>
            p.localId === item.localId ? { ...p, uploading: false, error: "업로드 실패" } : p,
          ),
        );
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("club-images").getPublicUrl(data.path);

      setItems((prev) => {
        const next = prev.map((p) =>
          p.localId === item.localId
            ? { ...p, path: data.path, url: publicUrl, uploading: false }
            : p,
        );
        notify(next);
        return next;
      });
    }
  }

  async function handleRemove(localId: string) {
    const item = items.find((i) => i.localId === localId);
    if (!item) return;
    if (item.path) {
      const supabase = createClient();
      await supabase.storage.from("club-images").remove([item.path]);
    }
    if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => {
      const next = prev.filter((i) => i.localId !== localId);
      notify(next);
      return next;
    });
  }

  function handleCaption(localId: string, caption: string) {
    setItems((prev) => {
      const next = prev.map((i) => (i.localId === localId ? { ...i, caption } : i));
      notify(next);
      return next;
    });
  }

  function move(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      notify(next);
      return next;
    });
  }

  const activeCount = items.filter((i) => !i.error).length;
  const canAdd = activeCount < maxImages;

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={item.localId}
          className="glass-soft flex items-start gap-3 rounded-xl p-3"
        >
          {/* 순서 번호 */}
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-skyx/25 text-[10px] font-semibold text-skyx-ink">
            {idx + 1}
          </div>

          {/* 썸네일 */}
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-white/55">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
            {item.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-skyx/30 border-t-skyx-deep" />
              </div>
            )}
            {item.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/55">
                <span className="text-xs font-bold text-red-50">!</span>
              </div>
            )}
          </div>

          {/* 캡션 */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              value={item.caption}
              onChange={(e) => handleCaption(item.localId, e.target.value)}
              placeholder="카드 설명 (선택 · 최대 100자)"
              maxLength={100}
              disabled={item.uploading}
              className="w-full rounded-lg border border-white/95 bg-white/70 px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none disabled:opacity-50"
            />
            {item.error && <p className="text-xs text-red-500">{item.error}</p>}
            {item.uploading && <p className="text-xs text-ink-soft">업로드 중...</p>}
          </div>

          {/* 순서 이동 + 삭제 */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink disabled:opacity-20"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              className="flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink disabled:opacity-20"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => handleRemove(item.localId)}
              className="flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:text-red-500"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      {canAdd && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-line py-4 text-sm text-ink-soft transition-all hover:border-teal/60 hover:bg-white/50 hover:text-teal-ink"
        >
          <span className="text-xl leading-none">+</span>
          <span>
            이미지 추가 ({activeCount}/{maxImages} · 고화질 사진도 자동 압축됩니다)
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleAdd(e.target.files)}
      />
    </div>
  );
}
