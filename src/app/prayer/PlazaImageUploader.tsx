"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

type Slot = {
  localId: string;
  previewUrl: string;
  url: string | null;
  path: string | null;
  uploading: boolean;
  error: string | null;
};

/**
 * 광장 글 첨부 이미지 업로더 — 최대 3장.
 * 클라에서 webp·최대 300KB·1080px로 압축 후 plaza-images 버킷 업로드.
 * 업로드 완료된 공개 URL 배열만 onChange로 부모에 전달.
 */
export function PlazaImageUploader({
  onChange,
  onUploadingChange,
  maxImages = 3,
  disabled = false,
}: {
  onChange: (urls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  maxImages?: number;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Slot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 진행 중 여부를 부모에 알려, 미완료 상태 제출(이미지 누락)을 막게 한다.
  const anyUploading = items.some((i) => i.uploading);
  useEffect(() => {
    onUploadingChange?.(anyUploading);
  }, [anyUploading, onUploadingChange]);

  function notify(updated: Slot[]) {
    onChange(updated.filter((i) => i.url && !i.uploading && !i.error).map((i) => i.url!));
  }

  function markError(localId: string, error: string) {
    setItems((prev) => prev.map((p) => (p.localId === localId ? { ...p, uploading: false, error } : p)));
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
    const newItems: Slot[] = toUpload.map((file) => ({
      localId: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      url: null,
      path: null,
      uploading: true,
      error: null,
    }));
    setItems((prev) => [...prev, ...newItems]);

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const item = newItems[i];

      if (file.size > 20 * 1024 * 1024) {
        markError(item.localId, "20MB 초과");
        continue;
      }

      let blob: Blob;
      try {
        blob = await imageCompression(file, {
          maxSizeMB: 0.3, // 최대 300KB
          maxWidthOrHeight: 1080,
          initialQuality: 0.85,
          useWebWorker: true,
          fileType: "image/webp",
        });
      } catch (e) {
        console.error("이미지 압축 실패:", e);
        markError(item.localId, "압축 실패");
        continue;
      }

      const path = `plaza/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
      const { data, error } = await supabase.storage
        .from("plaza-images")
        .upload(path, blob, { cacheControl: "3600", upsert: false });

      if (error || !data) {
        markError(item.localId, "업로드 실패");
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("plaza-images").getPublicUrl(data.path);

      setItems((prev) => {
        const next = prev.map((p) =>
          p.localId === item.localId ? { ...p, path: data.path, url: publicUrl, uploading: false } : p,
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
      await supabase.storage.from("plaza-images").remove([item.path]);
    }
    if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => {
      const next = prev.filter((i) => i.localId !== localId);
      notify(next);
      return next;
    });
  }

  const activeCount = items.filter((i) => !i.error).length;
  const canAdd = !disabled && activeCount < maxImages;

  if (items.length === 0 && !canAdd) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <div
          key={item.localId}
          className="relative h-20 w-20 overflow-hidden rounded-xl border border-sky-line bg-white/55"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
          {item.uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-skyx/30 border-t-skyx-deep" />
            </div>
          )}
          {item.error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/60 text-center">
              <span className="text-[10px] font-bold text-red-50">{item.error}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleRemove(item.localId)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white transition-colors hover:bg-black/70"
              aria-label="삭제"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {canAdd && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-sky-line text-ink-soft transition-all hover:border-teal/60 hover:bg-white/50 hover:text-teal-ink"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-[10px]">
            {activeCount}/{maxImages}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
