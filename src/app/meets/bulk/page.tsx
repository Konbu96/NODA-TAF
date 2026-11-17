"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Label, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { sortMembers } from "@/lib/grade";
import { ALL_EVENTS, FIELD_EVENTS, ORDER_ONLY_EVENTS, PIT_EVENTS, PITS, onlyDigits } from "@/lib/marks";
import { hasEvents } from "@/lib/permissions";
import { saveEntries } from "@/lib/store";
import type { DbState, HeatLane, Meet, Member } from "@/lib/types";

// 開発者用：全員のエントリーを、種目ごとにまとめて入れる画面
// - 種目ごとに、出る人を選んで、組・レーン（ピット・試技順）を入れる
// - 招集開始・競技開始の時間は種目ごとに 1 回入れれば、その種目に出る全員に入る

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return (
    <SubShell title="エントリーをまとめて編集" back={`/meets/detail?id=${id}`}>
      {(ctx) => {
        const meet = ctx.db.meets[id];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        if (!ctx.me.isAdmin) return <p className="text-sm text-sub">開発者だけが使えます。</p>;
        return <Form {...ctx} meet={meet} />;
      }}
    </SubShell>
  );
}

/** 1 人分の組・レーン（入力中は文字のまま） */
type Spot = { heat: string; lane: string; pit: string; order: string };
/** 1 種目分。people に入っている人がエントリーしている */
type EventDraft = { callTime: string; startTime: string; people: Record<string, Spot> };

const byEvent = (a: string, b: string) => ALL_EVENTS.indexOf(a) - ALL_EVENTS.indexOf(b);
const str = (n?: number) => (n ? String(n) : "");
const emptySpot: Spot = { heat: "", lane: "", pit: "", order: "" };

/** いちばん多く入っている時間（だれも入れていなければ空） */
function commonTime(values: (string | undefined)[]) {
  const count = new Map<string, number>();
  for (const v of values) if (v) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function Form({ db, me, today, meet }: { db: DbState; me: Member; today: string; meet: Meet }) {
  const router = useRouter();
  const entries = db.entries[meet.id] ?? {};
  const athletes = sortMembers(
    Object.values(db.members).filter((m) => m.status === "approved" && hasEvents(m)),
    today,
  );

  const [draft, setDraft] = useState<Record<string, EventDraft>>(() => {
    const d: Record<string, EventDraft> = {};
    // 部員の専門種目と、もうエントリーされている種目を出しておく
    const shown = new Set([...athletes.flatMap((m) => m.events), ...Object.values(entries).flatMap((e) => e.events)]);
    for (const ev of [...shown].filter((e) => ALL_EVENTS.includes(e)).sort(byEvent)) {
      const people: Record<string, Spot> = {};
      const lanes: (HeatLane | undefined)[] = [];
      for (const [email, e] of Object.entries(entries)) {
        if (!e.events.includes(ev)) continue;
        const l = e.lanes?.[ev];
        lanes.push(l);
        people[email] = { heat: str(l?.heat), lane: str(l?.lane), pit: l?.pit ?? "", order: str(l?.order) };
      }
      d[ev] = { callTime: commonTime(lanes.map((l) => l?.callTime)), startTime: commonTime(lanes.map((l) => l?.startTime)), people };
    }
    return d;
  });
  const [saving, setSaving] = useState(false);

  const setEvent = (ev: string, next: Partial<EventDraft>) => setDraft((d) => ({ ...d, [ev]: { ...d[ev], ...next } }));
  const togglePerson = (ev: string, email: string) =>
    setDraft((d) => {
      const people = { ...d[ev].people };
      if (people[email]) delete people[email];
      else people[email] = { ...emptySpot };
      return { ...d, [ev]: { ...d[ev], people } };
    });
  const setSpot = (ev: string, email: string, key: keyof Spot, v: string) =>
    setDraft((d) => ({ ...d, [ev]: { ...d[ev], people: { ...d[ev].people, [email]: { ...d[ev].people[email], [key]: v } } } }));

  const hidden = ALL_EVENTS.filter((e) => !draft[e]);
  const total = new Set(Object.values(draft).flatMap((d) => Object.keys(d.people))).size;

  async function save() {
    setSaving(true);
    // 種目ごとの下書きを、人ごとのエントリーに組みなおす
    const all: Record<string, { events: string[]; lanes: Record<string, HeatLane> }> = {};
    for (const email of new Set([...Object.keys(entries), ...athletes.map((m) => m.email)])) all[email] = { events: [], lanes: {} };
    for (const [ev, d] of Object.entries(draft)) {
      for (const [email, s] of Object.entries(d.people)) {
        all[email] ??= { events: [], lanes: {} };
        all[email].events.push(ev);
        all[email].lanes[ev] = {
          heat: Number(s.heat) || undefined,
          lane: Number(s.lane) || undefined,
          pit: s.pit || undefined,
          order: Number(s.order) || undefined,
          callTime: d.callTime || undefined,
          startTime: d.startTime || undefined,
        };
      }
    }
    for (const a of Object.values(all)) a.events.sort(byEvent);
    await saveEntries(meet.id, all, me.email);
    router.push(`/meets/detail?id=${meet.id}`);
  }

  const num = "h-10 w-12 rounded-[10px] border border-line px-1 text-center text-base";
  const time = "h-10 w-[110px] rounded-[10px] border border-line bg-white px-1.5 text-center text-base";

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
        <p className="m-0 mt-1.5 text-[13px] text-sub">
          種目ごとに、出る人の名前を押して選びます。時間はその種目に出る全員に入ります。わかっているものだけで大丈夫です。
        </p>
      </Card>

      {Object.keys(draft)
        .sort(byEvent)
        .map((ev) => {
          const d = draft[ev];
          const isPit = PIT_EVENTS.includes(ev);
          const orderOnly = ORDER_ONLY_EVENTS.includes(ev);
          const isField = FIELD_EVENTS.includes(ev);
          const picked = athletes.filter((m) => d.people[m.email]);
          return (
            <Card key={ev} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <p className="m-0 text-[17px] font-bold">{ev}</p>
                <span className="text-xs text-sub">{picked.length}人</span>
              </div>

              <div className="flex flex-col gap-2">
                <Label>出る人</Label>
                <div className="flex flex-wrap gap-1.5">
                  {athletes.map((m) => (
                    <Chip key={m.email} small on={!!d.people[m.email]} onClick={() => togglePerson(ev, m.email)}>
                      {m.name}
                    </Chip>
                  ))}
                </div>
              </div>

              {picked.length > 0 && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>時間（全員同じ）</Label>
                    <label className="flex items-center gap-3">
                      <span className="w-16 text-sm">招集開始</span>
                      <input type="time" value={d.callTime} onChange={(e) => setEvent(ev, { callTime: e.target.value })} aria-label={`${ev} の招集開始時間`} className={time} />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className="w-16 text-sm">競技開始</span>
                      <input type="time" value={d.startTime} onChange={(e) => setEvent(ev, { startTime: e.target.value })} aria-label={`${ev} の競技開始時間`} className={time} />
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>{isPit ? "ピット・試技順" : orderOnly ? "試技順" : "組・レーン"}</Label>
                    {picked.map((m) => {
                      const s = d.people[m.email];
                      return (
                        <div key={m.email} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-divider pt-2 first-of-type:border-0">
                          <span className="w-24 shrink-0 text-sm font-bold">{m.name}</span>
                          {isPit && (
                            <span className="flex gap-1.5">
                              {PITS.map((p) => (
                                <Chip key={p} small on={s.pit === p} onClick={() => setSpot(ev, m.email, "pit", s.pit === p ? "" : p)}>
                                  {p}
                                </Chip>
                              ))}
                            </span>
                          )}
                          {!isPit && !orderOnly && (
                            <span className="flex items-center gap-1.5">
                              <input inputMode="numeric" value={s.heat} onChange={(e) => setSpot(ev, m.email, "heat", onlyDigits(e.target.value, 2))} aria-label={`${m.name} ${ev} の組`} className={num} />
                              <span className="text-sm">組</span>
                            </span>
                          )}
                          {isField ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">試技順</span>
                              <input inputMode="numeric" value={s.order} onChange={(e) => setSpot(ev, m.email, "order", onlyDigits(e.target.value, 2))} aria-label={`${m.name} ${ev} の試技順`} className={num} />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <input inputMode="numeric" value={s.lane} onChange={(e) => setSpot(ev, m.email, "lane", onlyDigits(e.target.value, 2))} aria-label={`${m.name} ${ev} のレーン`} className={num} />
                              <span className="text-sm">レーン</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          );
        })}

      {hidden.length > 0 && (
        <Card className="flex flex-col gap-2">
          <Label>ほかの種目を出す</Label>
          <div className="flex flex-wrap gap-1.5">
            {hidden.map((ev) => (
              <Chip key={ev} small on={false} onClick={() => setEvent(ev, { callTime: "", startTime: "", people: {} })}>
                ＋ {ev}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <div className="sticky bottom-3">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "保存しています…" : `まとめて保存する（${total}人）`}
        </PrimaryButton>
      </div>
    </>
  );
}
