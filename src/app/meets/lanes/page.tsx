"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Label, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { ALL_EVENTS, FIELD_EVENTS, ORDER_ONLY_EVENTS, PIT_EVENTS, PITS, onlyDigits } from "@/lib/marks";
import { familyName } from "@/lib/names";
import { canEditMenu } from "@/lib/permissions";
import { saveLanes } from "@/lib/store";
import type { DbState, HeatLane, Meet, Member } from "@/lib/types";

// 組み分けや時間が出たあとに、エントリーした種目ごとの組・レーンと、招集・競技開始の時間を入れる画面
// - トラック：組・レーン
// - 跳躍：ピット（A・B）・試技順
// - 投てき：試技順

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const memberParam = params.get("member");
  return (
    <SubShell title="組・レーン・時間" back={`/meets/detail?id=${id}`}>
      {(ctx) => {
        const meet = ctx.db.meets[id];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        const target = ctx.db.members[memberParam ?? ctx.me.email];
        if (!target) return <p className="text-sm text-sub">部員が見つかりません。</p>;
        if (target.email !== ctx.me.email && !canEditMenu(ctx.me)) return <p className="text-sm text-sub">ほかの人の組・レーンは直せません。</p>;
        if (!ctx.db.entries[meet.id]?.[target.email]) return <p className="text-sm text-sub">まだエントリーしていません。</p>;
        return <Form key={target.email} {...ctx} meet={meet} target={target} />;
      }}
    </SubShell>
  );
}

type Draft = { heat: string; lane: string; pit: string; order: string; callTime: string; startTime: string };

function Form({ db, me, meet, target }: { db: DbState; me: Member; today: string; meet: Meet; target: Member }) {
  const router = useRouter();
  const entry = db.entries[meet.id][target.email];
  const events = [...entry.events].sort((a, b) => ALL_EVENTS.indexOf(a) - ALL_EVENTS.indexOf(b));
  // 入力中は文字のまま持つ
  const [lanes, setLanes] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      events.map((ev) => {
        const l = entry.lanes?.[ev];
        return [ev, { heat: l?.heat ? String(l.heat) : "", lane: l?.lane ? String(l.lane) : "", pit: l?.pit ?? "", order: l?.order ? String(l.order) : "", callTime: l?.callTime ?? "", startTime: l?.startTime ?? "" }];
      }),
    ),
  );
  const set = (ev: string, key: keyof Draft, v: string) => setLanes({ ...lanes, [ev]: { ...lanes[ev], [key]: v } });
  const input = "h-10 w-14 rounded-[10px] border border-line px-2 text-center text-base";
  const time = "h-10 w-[110px] rounded-[10px] border border-line bg-white px-1.5 text-center text-base";

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
      </Card>
      {target.email !== me.email && <p className="m-0 px-1 text-sm font-bold">{familyName(target.name)}の組・レーン・時間</p>}
      <Card className="flex flex-col gap-3">
        <Label className="text-[15px] text-ink">わかっているものだけ入れてください</Label>
        {events.map((ev) => (
          <div key={ev} className="flex items-start gap-2 border-b border-line pb-3 last:border-0 last:pb-0">
            <span className="w-20 shrink-0 pt-2.5 text-sm font-bold">{ev}</span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {PIT_EVENTS.includes(ev) ? (
                <div className="flex gap-1.5">
                  {PITS.map((p) => (
                    <Chip key={p} small on={lanes[ev].pit === p} onClick={() => set(ev, "pit", lanes[ev].pit === p ? "" : p)}>
                      {p}ピット
                    </Chip>
                  ))}
                </div>
              ) : ORDER_ONLY_EVENTS.includes(ev) ? null : (
                <span className="flex items-center gap-2">
                  <input inputMode="numeric" value={lanes[ev].heat} onChange={(e) => set(ev, "heat", onlyDigits(e.target.value, 2))} aria-label={`${ev} の組`} className={input} />
                  <span className="text-sm">組</span>
                </span>
              )}
              {FIELD_EVENTS.includes(ev) ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm">試技順</span>
                  <input inputMode="numeric" value={lanes[ev].order} onChange={(e) => set(ev, "order", onlyDigits(e.target.value, 2))} aria-label={`${ev} の試技順`} className={input} />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <input inputMode="numeric" value={lanes[ev].lane} onChange={(e) => set(ev, "lane", onlyDigits(e.target.value, 2))} aria-label={`${ev} のレーン`} className={input} />
                  <span className="text-sm">レーン</span>
                </span>
              )}
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-16 text-sm">招集開始</span>
                <input type="time" value={lanes[ev].callTime} onChange={(e) => set(ev, "callTime", e.target.value)} aria-label={`${ev} の招集開始時間`} className={time} />
              </span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-16 text-sm">競技開始</span>
                <input type="time" value={lanes[ev].startTime} onChange={(e) => set(ev, "startTime", e.target.value)} aria-label={`${ev} の競技開始時間`} className={time} />
              </span>
            </div>
          </div>
        ))}
      </Card>
      <PrimaryButton
        onClick={async () => {
          const nums: Record<string, HeatLane> = Object.fromEntries(
            Object.entries(lanes).map(([ev, l]) => [ev, { heat: Number(l.heat) || undefined, lane: Number(l.lane) || undefined, pit: l.pit || undefined, order: Number(l.order) || undefined, callTime: l.callTime || undefined, startTime: l.startTime || undefined }]),
          );
          await saveLanes(meet.id, target.email, nums, me.email);
          router.push(`/meets/detail?id=${meet.id}`);
        }}
      >
        保存する
      </PrimaryButton>
    </>
  );
}
