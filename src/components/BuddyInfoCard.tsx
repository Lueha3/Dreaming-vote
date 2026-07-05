"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type Person = { nickname: string | null; avatarUrl: string | null };
type BuddyInfo = { ok: true; myBuddy: Person | null; newcomersIMentor: Person[] };

function PersonRow({ person, tone, label }: { person: Person; tone: "teal" | "gold"; label: string }) {
  const cls = tone === "teal" ? "border-teal/25 bg-teal/[0.06]" : "border-gold/25 bg-gold/[0.06]";
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${cls}`}>
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-xs text-skyx-ink">
          {person.nickname?.[0] ?? "?"}
        </div>
      )}
      <p className="text-sm text-ink">
        <span className="font-semibold">{person.nickname ?? "멤버"}</span>
        {label}
      </p>
    </div>
  );
}

/** 환영 짝꿍 표시 — 새가족이면 배정받은 짝꿍을, 짝꿍으로 지정됐다면 그 새가족을 보여준다. */
export function BuddyInfoCard() {
  const [info, setInfo] = useState<BuddyInfo | null>(null);

  useEffect(() => {
    fetchJson<BuddyInfo>("/api/my/buddy")
      .then(setInfo)
      .catch(() => {});
  }, []);

  if (!info || (!info.myBuddy && info.newcomersIMentor.length === 0)) return null;

  return (
    <div className="glass-card space-y-2 p-5">
      <p className="mb-1 text-xs font-semibold text-ink">🤝 환영 짝꿍</p>
      {info.myBuddy && (
        <PersonRow person={info.myBuddy} tone="teal" label="님이 나의 환영 짝꿍이에요" />
      )}
      {info.newcomersIMentor.map((n, i) => (
        <PersonRow key={i} person={n} tone="gold" label="님의 환영 짝꿍이에요" />
      ))}
    </div>
  );
}
