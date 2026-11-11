"use client";

import { useState } from "react";
import { LineChart } from "@/components/LineChart";
import { SubShell } from "@/components/Shell";
import { chipOff, chipOn } from "@/components/ui";
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
  const sessions = Object.values(db.stabro)
    .filter((s) => s.memberId === me.email && s.bests[dist] != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const best = me.stabroBests[dist];
  const bestSession = sessions.find((s) => s.bests[dist] === best);

  return (
    <>
      <div role="tablist" className="grid grid-cols-3 gap-1.5">
        {(["30m", "60m", "80m"] as const).map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={dist === d}
            onClick={() => setDist(d)}
            className={`h-10 rounded-full text-sm ${dist === d ? chipOn : chipOff}`}
          >
            {d}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-2.5 rounded-xl bg-white px-4 py-3.5">
        <div className="flex items-baseline gap-2">
          <p className="m-0 text-[22px] font-bold text-accent">ベスト：{best != null ? best.toFixed(2) : "―"}</p>
          {bestSession && <span className="text-xs text-muted">{dayLabel(bestSession.date)}</span>}
        </div>
        <LineChart
          points={sessions.map((s) => ({ date: s.date, value: s.bests[dist] as number, label: shortDate(s.date) }))}
          lowerIsBetter
          ariaLabel={`${dist} の日ごとのベストのグラフ`}
          format={(v) => v.toFixed(2)}
        />
        {sessions.length === 0 && <p className="m-0 text-sm text-muted">まだ記録がありません</p>}
      </section>
    </>
  );
}
