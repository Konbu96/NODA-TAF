"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MoodFace, MOODS } from "@/components/MoodFace";
import { PlainHeader, useGate } from "@/components/Shell";
import { dayLabel } from "@/lib/dates";
import { setMood } from "@/lib/store";
import type { MoodKind } from "@/lib/types";

export default function MoodPage() {
  const gate = useGate(false);
  const router = useRouter();
  const [picked, setPicked] = useState<MoodKind | null>(null);
  const already = gate ? !!gate.db.moods[`${gate.today}_${gate.me.email}`] : false;

  useEffect(() => {
    if (already && !picked) router.replace("/");
  }, [already, picked, router]);

  if (!gate || (already && !picked)) return null;

  const pick = (kind: MoodKind) => {
    if (picked) return;
    setPicked(kind);
    setTimeout(async () => {
      await setMood(gate.me.email, kind);
      router.replace("/");
    }, 700);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <PlainHeader />
      <main className="flex grow flex-col items-center justify-center gap-10 px-5 pt-6 pb-16">
        <div className="text-center">
          <p className="m-0 text-sm text-sub">{dayLabel(gate.today)}</p>
          <h1 className="mt-1.5 mb-0 text-[28px] font-bold tracking-[0.04em]">今日の気分は？</h1>
        </div>
        <div className="flex w-full flex-wrap justify-center gap-2.5">
          {MOODS.map((m) => (
            <button
              key={m.kind}
              onClick={() => pick(m.kind)}
              aria-label={m.label}
              className="flex w-[78px] flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-[transform,opacity] duration-300"
              style={{
                transform: picked === m.kind ? "scale(1.3)" : "none",
                opacity: picked && picked !== m.kind ? 0.25 : 1,
              }}
            >
              <MoodFace kind={m.kind} size={54} />
              {m.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
