"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Label, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { ALL_EVENTS, EVENT_GROUPS, onlyDigits } from "@/lib/marks";
import { canEditMenu } from "@/lib/permissions";
import { saveEntry } from "@/lib/store";
import type { DbState, HeatLane, Meet, Member } from "@/lib/types";
import { familyName } from "@/lib/names";

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
    <SubShell title="エントリー" back={`/meets/detail?id=${id}`}>
      {(ctx) => {
        const meet = ctx.db.meets[id];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        const target = ctx.db.members[memberParam ?? ctx.me.email];
        if (!target) return <p className="text-sm text-sub">部員が見つかりません。</p>;
        if (target.email !== ctx.me.email && !canEditMenu(ctx.me)) return <p className="text-sm text-sub">ほかの人のエントリーは直せません。</p>;
        return <Form key={target.email} {...ctx} meet={meet} target={target} />;
      }}
    </SubShell>
  );
}

function Form({ db, me, meet, target }: { db: DbState; me: Member; today: string; meet: Meet; target: Member }) {
  const router = useRouter();
  const saved = db.entries[meet.id]?.[target.email];
  const [events, setEvents] = useState<string[]>(saved?.events ?? []);
  // 種目ごとの組・レーン（入力中は文字のまま持つ）
  const [lanes, setLanes] = useState<Record<string, { heat: string; lane: string }>>(() =>
    Object.fromEntries(Object.entries(saved?.lanes ?? {}).map(([ev, l]) => [ev, { heat: l.heat ? String(l.heat) : "", lane: l.lane ? String(l.lane) : "" }])),
  );
  const setLane = (ev: string, key: "heat" | "lane", v: string) =>
    setLanes({ ...lanes, [ev]: { ...(lanes[ev] ?? { heat: "", lane: "" }), [key]: onlyDigits(v, 2) } });
  const chosen = [...events].sort((a, b) => ALL_EVENTS.indexOf(a) - ALL_EVENTS.indexOf(b));
  const toggle = (e: string) => setEvents(events.includes(e) ? events.filter((x) => x !== e) : [...events, e]);
  // 種目は全部、分類ごとに並べる
  const others = EVENT_GROUPS;

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
      </Card>
      {target.email !== me.email && <p className="m-0 px-1 text-sm font-bold">{familyName(target.name)}のエントリー</p>}
      <Card className="flex flex-col gap-3">
        <Label className="text-[15px] text-ink">種目</Label>
        {others.map((g) => (
          <div key={g.name}>
            <p className="mt-0 mb-1.5 text-[13px] font-bold text-sub">{g.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.events.map((e) => (
                <Chip key={e} small on={events.includes(e)} onClick={() => toggle(e)}>
                  {e}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </Card>
      {chosen.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <Label className="text-[15px] text-ink">組・レーン（わかれば）</Label>
          {chosen.map((ev) => (
            <div key={ev} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm font-bold">{ev}</span>
              <input
                inputMode="numeric"
                value={lanes[ev]?.heat ?? ""}
                onChange={(e) => setLane(ev, "heat", e.target.value)}
                aria-label={`${ev} の組`}
                className="h-10 w-14 rounded-[10px] border border-line px-2 text-center text-base"
              />
              <span className="text-sm">組</span>
              <input
                inputMode="numeric"
                value={lanes[ev]?.lane ?? ""}
                onChange={(e) => setLane(ev, "lane", e.target.value)}
                aria-label={`${ev} のレーン`}
                className="ml-2 h-10 w-14 rounded-[10px] border border-line px-2 text-center text-base"
              />
              <span className="text-sm">レーン</span>
            </div>
          ))}
        </Card>
      )}
      <PrimaryButton
        onClick={async () => {
          const nums: Record<string, HeatLane> = Object.fromEntries(
            Object.entries(lanes).map(([ev, l]) => [ev, { heat: Number(l.heat) || undefined, lane: Number(l.lane) || undefined }]),
          );
          await saveEntry(meet.id, target.email, events, me.email, nums);
          router.push(`/meets/detail?id=${meet.id}`);
        }}
      >
        {events.length ? `${events.length} 種目でエントリーする` : "エントリーを取り消す"}
      </PrimaryButton>
    </>
  );
}
