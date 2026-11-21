"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PbDialog } from "@/components/PbDialog";
import { RecordFields, recordInputOf } from "@/components/RecordFields";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Label, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { isMeetStarted } from "@/lib/derived";
import { ALL_EVENTS, EVENT_GROUPS, FIELD_EVENTS, heatLaneParts, onlyDigits, ORDER_ONLY_EVENTS, PIT_EVENTS, PITS } from "@/lib/marks";
import { familyName } from "@/lib/names";
import { canEditMenu, canEditRecordsOf } from "@/lib/permissions";
import { saveEntry, saveRecords, type PbUpdate, type RecordInput } from "@/lib/store";
import type { DbState, HeatLane, Meet, Member } from "@/lib/types";

// 1 人分の大会の画面。出る種目・組とレーン（ピット・試技順）・記録を、ここでまとめて入れる。
// - 招集・競技開始の時間は種目ごとに「種目の時間」の画面で入れる（ここでは見るだけ）
// - 記録の欄は大会の当日から出る

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
        if (target.email !== ctx.me.email && !canEditMenu(ctx.me) && !canEditRecordsOf(ctx.me, target.email))
          return <p className="text-sm text-sub">ほかの人のエントリーは直せません。</p>;
        return <Form key={target.email} {...ctx} meet={meet} target={target} />;
      }}
    </SubShell>
  );
}

/** 組・レーン（入力中は文字のまま） */
type Spot = { heat: string; lane: string; pit: string; order: string };

const byEvent = (a: string, b: string) => ALL_EVENTS.indexOf(a) - ALL_EVENTS.indexOf(b);
const str = (n?: number) => (n ? String(n) : "");

function Form({ db, me, today, meet, target }: { db: DbState; me: Member; today: string; meet: Meet; target: Member }) {
  const router = useRouter();
  const back = `/meets/detail?id=${meet.id}`;
  const saved = db.entries[meet.id]?.[target.email];
  const existing = Object.values(db.records).filter((r) => r.memberId === target.email && r.meetId === meet.id);
  const self = target.email === me.email;
  // エントリー（種目・組）を直せるか。記録だけ直せる人もいる
  const canEntry = self || canEditMenu(me);
  const showRecords = isMeetStarted(meet, today) && canEditRecordsOf(me, target.email);

  // 記録だけある種目（エントリーなしで記録を入れた）も出す
  const [events, setEvents] = useState<string[]>(() => [...new Set([...(saved?.events ?? []), ...existing.map((r) => r.event)])].sort(byEvent));
  const [spots, setSpots] = useState<Record<string, Spot>>(() =>
    Object.fromEntries(
      (saved?.events ?? []).map((ev) => {
        const l = saved?.lanes?.[ev];
        return [ev, { heat: str(l?.heat), lane: str(l?.lane), pit: l?.pit ?? "", order: str(l?.order) }];
      }),
    ),
  );
  const [recs, setRecs] = useState<Record<string, RecordInput>>(() => Object.fromEntries(existing.map((r) => [r.event, recordInputOf(r)])));
  const [pbs, setPbs] = useState<PbUpdate[] | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (ev: string) => setEvents(events.includes(ev) ? events.filter((x) => x !== ev) : [...events, ev].sort(byEvent));
  const spotOf = (ev: string): Spot => spots[ev] ?? { heat: "", lane: "", pit: "", order: "" };
  const setSpot = (ev: string, key: keyof Spot, v: string) => setSpots({ ...spots, [ev]: { ...spotOf(ev), [key]: v } });
  const recOf = (ev: string): RecordInput => recs[ev] ?? { event: ev, digits: "", windDigits: "", minus: false };
  const setRec = (ev: string, p: Partial<RecordInput>) => setRecs({ ...recs, [ev]: { ...recOf(ev), ...p } });

  async function save() {
    setSaving(true);
    if (canEntry) {
      const lanes: Record<string, HeatLane> = Object.fromEntries(
        events.map((ev) => {
          const s = spotOf(ev);
          const old = saved?.lanes?.[ev];
          return [
            ev,
            {
              heat: Number(s.heat) || undefined,
              lane: Number(s.lane) || undefined,
              pit: s.pit || undefined,
              order: Number(s.order) || undefined,
              // 前の形で 1 人ずつ入れていた時間は残す
              callTime: old?.callTime,
              startTime: old?.startTime,
            },
          ];
        }),
      );
      await saveEntry(meet.id, target.email, events, me.email, lanes);
    }
    if (showRecords) {
      // 入れた欄と、前に記録があった種目だけ保存する（空にすると消える）
      const inputs = events.map(recOf).filter((r) => r.short || r.digits || existing.some((x) => x.event === r.event));
      const res = inputs.length ? await saveRecords(meet, target.email, inputs, me.email) : [];
      if (res.length) {
        setPbs(res);
        return;
      }
    }
    router.push(back);
  }

  const num = "h-10 w-12 rounded-[10px] border border-line px-1 text-center text-base";

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
        {!self && <p className="mt-1 mb-0 text-sm font-bold">{familyName(target.name)}のエントリー</p>}
      </Card>

      {canEntry && (
        <Card className="flex flex-col gap-3">
          <Label className="text-[15px] text-ink">出る種目</Label>
          {EVENT_GROUPS.map((g) => (
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
      )}

      {events.map((ev) => {
        const s = spotOf(ev);
        const isPit = PIT_EVENTS.includes(ev);
        const orderOnly = ORDER_ONLY_EVENTS.includes(ev);
        const isField = FIELD_EVENTS.includes(ev);
        const { call, start } = heatLaneParts(saved?.lanes?.[ev], meet.eventTimes?.[ev]);
        return (
          <Card key={ev} className="flex flex-col gap-3.5">
            <div className="flex items-baseline justify-between">
              <p className="m-0 text-lg font-bold">{ev}</p>
              <Link href={`/meets/times?id=${meet.id}`} className="text-[13px] font-bold text-accent">
                {call || start ? "時間を直す ›" : "時間を入れる ›"}
              </Link>
            </div>
            {call || start ? (
              <div className="flex gap-5 text-[13px]">
                {call && (
                  <span>
                    <span className="text-muted">招集</span>　<b className="text-[15px] tabular-nums">{call}</b>
                  </span>
                )}
                {start && (
                  <span>
                    <span className="text-muted">競技開始</span>　<b className="text-[15px] tabular-nums">{start}</b>
                  </span>
                )}
              </div>
            ) : (
              <p className="m-0 text-[13px] text-muted">時間はまだ入っていません</p>
            )}

            {canEntry && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {isPit && (
                  <span className="flex gap-1.5">
                    {PITS.map((p) => (
                      <Chip key={p} small on={s.pit === p} onClick={() => setSpot(ev, "pit", s.pit === p ? "" : p)}>
                        {p}ピット
                      </Chip>
                    ))}
                  </span>
                )}
                {!isPit && !orderOnly && (
                  <label className="flex items-center gap-1.5">
                    <input inputMode="numeric" value={s.heat} onChange={(e) => setSpot(ev, "heat", onlyDigits(e.target.value, 2))} aria-label={`${ev} の組`} className={num} />組
                  </label>
                )}
                {isField ? (
                  <label className="flex items-center gap-1.5">
                    試技順
                    <input inputMode="numeric" value={s.order} onChange={(e) => setSpot(ev, "order", onlyDigits(e.target.value, 2))} aria-label={`${ev} の試技順`} className={num} />
                  </label>
                ) : (
                  <label className="flex items-center gap-1.5">
                    <input inputMode="numeric" value={s.lane} onChange={(e) => setSpot(ev, "lane", onlyDigits(e.target.value, 2))} aria-label={`${ev} のレーン`} className={num} />
                    レーン
                  </label>
                )}
              </div>
            )}

            {showRecords && <RecordFields rec={recOf(ev)} set={(p) => setRec(ev, p)} hadRecord={existing.some((r) => r.event === ev)} />}
          </Card>
        );
      })}

      {showRecords ? (
        <p className="m-0 text-center text-[11px] text-[#94A3B8]">予選・決勝などで何本か走ったときは、一番良い記録だけ入れてください</p>
      ) : (
        events.length > 0 && <p className="m-0 px-1 text-xs text-muted">記録の欄は、大会の当日から出ます。</p>
      )}

      <PrimaryButton onClick={save} disabled={saving || (!events.length && !saved)}>
        {saving ? "保存しています…" : canEntry && !events.length ? (saved ? "エントリーを取り消す" : "種目を選んでください") : "保存する"}
      </PrimaryButton>

      {pbs && <PbDialog pbs={pbs} back={back} />}
    </>
  );
}
