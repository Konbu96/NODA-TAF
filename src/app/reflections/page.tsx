"use client";

import { useState } from "react";
import { DownIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { monthLabel } from "@/lib/dates";
import type { DbState, Member } from "@/lib/types";

export default function PastReflectionsPage() {
  return (
    <SubShell title="過去の振り返り" back="/mypage">
      {(ctx) => <Body {...ctx} />}
    </SubShell>
  );
}

function Body({ db, me }: { db: DbState; me: Member }) {
  const list = Object.values(db.reflections)
    .filter((r) => r.memberId === me.email)
    .sort((a, b) => b.month.localeCompare(a.month));
  const [open, setOpen] = useState(list[0]?.month ?? "");
  if (list.length === 0) return <p className="m-0 px-1 text-sm text-muted">まだ提出した振り返りはありません。</p>;

  return (
    <div className="flex flex-col gap-2">
      {list.map((r) => {
        const isOpen = open === r.month;
        const goal = db.goals[`${r.month}_${me.email}`]?.goal ?? "";
        const level = r.achievement ?? 0;
        return (
          <section key={r.month} className="overflow-hidden rounded-xl bg-white">
            <button onClick={() => setOpen(isOpen ? "" : r.month)} aria-expanded={isOpen} className="flex min-h-14 w-full items-center gap-2.5 px-4 text-left">
              <b className="grow text-[15px]">{monthLabel(r.month)}の振り返り</b>
              {r.achievement != null && (
                <span aria-label={`達成度 ${level} / 5`} className="flex gap-[3px]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`h-[9px] w-[9px] rounded-full ${i <= level ? "bg-accent" : "bg-[#E2E8F0]"}`} />
                  ))}
                </span>
              )}
              <DownIcon className={`text-[#94A3B8] transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-hair px-4 pt-3 pb-4">
                {r.lastGoal && <QA q="先月の目標" a={r.lastGoal} />}
                {r.achievement != null && <QA q="達成度" a={`${r.achievement} / 5`} />}
                <QA q="できたこと・できなかったこと・新しい課題" a={r.review} />
                <div>
                  <p className="mt-0 mb-1 text-xs font-bold text-sub">来月の目標</p>
                  <p className="m-0 text-[15px] font-bold text-accent">{goal}</p>
                </div>
                <p className="m-0 text-right text-[11px] text-[#94A3B8]">
                  {new Date(r.submittedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" })} 提出
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="mt-0 mb-1 text-xs font-bold text-sub">{q}</p>
      <p className="m-0 text-[15px] leading-[1.6] whitespace-pre-line">{a}</p>
    </div>
  );
}
