"use client";

import { useState } from "react";
import { LineChart } from "@/components/LineChart";
import { SubShell } from "@/components/Shell";
import { chipOff, chipOn, Label } from "@/components/ui";
import { dayLabel, shortDate } from "@/lib/dates";
import type { DbState, Member, StabroDistance } from "@/lib/types";

export default function StabroGraphPage() {
  return (
    <SubShell title="スタブロ" back="/mypage">
      {(ctx) => <Body {...ctx} />}
    </SubShell>
  );
}

function Body({ db, me }: { db: DbState; me: Member }) {
  const [dist, setDist] = useState<StabroDistance>("30m");
  const [all, setAll] = useState(false);
  const sessions = Object.values(db.stabro)
    .filter((s) => s.memberId === me.email && s.bests[dist] != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const best = me.stabroBests[dist];
  const bestSession = sessions.find((s) => s.bests[dist] === best);
  const rows = [...sessions].reverse();
  const shown = all ? rows : rows.slice(0, 5);

  return (
    <>
      <div role="tablist" className="grid grid-cols-3 gap-1.5">
        {(["30m", "60m", "80m"] as const).map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={dist === d}
            onClick={() => {
              setDist(d);
              setAll(false);
            }}
            className={`h-10 rounded-full text-sm ${dist === d ? chipOn : chipOff}`}
          >
            {d}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-2.5 rounded-xl bg-white px-4 py-3.5">
        <div className="flex items-baseline gap-2">
          <p className="m-0 text-[22px] font-bold text-accent">ベスト {best != null ? best.toFixed(2) : "―"}</p>
          {bestSession && <span className="text-xs text-muted">{dayLabel(bestSession.date)}</span>}
        </div>
        <LineChart
          points={sessions.map((s) => ({ date: s.date, value: s.bests[dist] as number, label: shortDate(s.date) }))}
          lowerIsBetter
          ariaLabel={`${dist} の日ごとのベストのグラフ`}
          format={(v) => v.toFixed(2)}
        />
      </section>

      <section className="flex flex-col rounded-xl bg-white px-4 py-3.5">
        <Label className="mb-1.5">日ごとの記録</Label>
        {rows.length === 0 && <p className="m-0 text-sm text-muted">まだ記録がありません</p>}
        {shown.map((s) => (
          <div key={s.id} className="flex min-h-11 items-center gap-2.5 border-t border-hair">
            <span className="w-12 shrink-0 text-[13px] text-sub">{shortDate(s.date)}</span>
            <span className="grow text-[15px]">{(s.runs[dist] ?? []).map((t) => t.toFixed(2)).join("　")}</span>
            {s.bests[dist] === best && <span className="rounded-full bg-warn px-2 py-0.5 text-[11px] font-bold text-white">ベスト</span>}
          </div>
        ))}
        {!all && rows.length > 5 && (
          <button onClick={() => setAll(true)} className="h-10 border-t border-hair text-[13px] text-accent underline">
            もっと見る
          </button>
        )}
      </section>
    </>
  );
}
