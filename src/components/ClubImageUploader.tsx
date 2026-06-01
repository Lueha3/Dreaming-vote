"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
}

export function ClubImageUploader({ onChange, maxImages = 10 }: Props) {
  const [items, setItems] = useState<UploadState[]>([]);
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

      if (file.size > 5 * 1024 * 1024) {
        setItems((prev) =>
          prev.map((p) =>
            p.localId === item.localId ? { ...p, uploading: false, error: "5MB 초과" } : p,
          ),
        );
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `clubs/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("club-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

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
          className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/30 p-3"
        >
          {/* 순서 번호 */}
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-zinc-400">
            {idx + 1}
          </div>

          {/* 썸네일 */}
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
            {item.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}
            {item.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/60">
                <span className="text-xs text-red-300">!</span>
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
              className="w-full rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none disabled:opacity-50"
            />
            {item.error && <p className="text-xs text-red-400">{item.error}</p>}
            {item.uploading && <p className="text-xs text-zinc-500">업로드 중...</p>}
          </div>

          {/* 순서 이동 + 삭제 */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-20"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-20"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => handleRemove(item.localId)}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 transition-colors hover:text-red-400"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-4 text-sm text-zinc-500 transition-all hover:border-violet-500/40 hover:text-violet-300"
        >
          <span className="text-xl leading-none">+</span>
          <span>
            이미지 추가 ({activeCount}/{maxImages} · JPG·PNG·WebP · 최대 5MB)
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleAdd(e.target.files)}
      />
    </div>
  );
}
