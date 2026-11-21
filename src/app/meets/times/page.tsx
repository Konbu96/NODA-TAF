"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Label, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { ALL_EVENTS } from "@/lib/marks";
import { canEditMenu } from "@/lib/permissions";
import { saveEventTimes } from "@/lib/store";
import type { DbState, EventTime, Meet, Member } from "@/lib/types";

// 大会の全部の種目の、招集開始・競技開始の時間をまとめて入れる画面。
// 入れた時間は、その種目に出る全員に出る。
// 直せるのは、その種目に出る人と、担当（キャプテン・マネージャーなど）・顧問・開発者

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
    <SubShell title="種目の時間" back={`/meets/detail?id=${id}`}>
      {(ctx) => {
        const meet = ctx.db.meets[id];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        return <Form {...ctx} meet={meet} />;
      }}
    </SubShell>
  );
}

const byEvent = (a: string, b: string) => ALL_EVENTS.indexOf(a) - ALL_EVENTS.indexOf(b);

/** いちばん多く入っている時間（前の形で 1 人ずつ入れていたときの読みかえ） */
function commonTime(values: (string | undefined)[]) {
  const count = new Map<string, number>();
  for (const v of values) if (v) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function Form({ db, me, meet }: { db: DbState; me: Member; today: string; meet: Meet }) {
  const router = useRouter();
  const back = `/meets/detail?id=${meet.id}`;
  const entries = db.entries[meet.id] ?? {};
  // エントリーされている種目と、その種目に出る人
  const people: Record<string, string[]> = {};
  for (const [email, e] of Object.entries(entries)) for (const ev of e.events) (people[ev] ??= []).push(db.members[email]?.name ?? email);
  const events = Object.keys(people).sort(byEvent);
  const mine = entries[me.email]?.events ?? [];
  const editor = canEditMenu(me);
  const canEdit = (ev: string) => editor || mine.includes(ev);

  const [times, setTimes] = useState<Record<string, EventTime>>(() =>
    Object.fromEntries(
      events.map((ev) => {
        const t = meet.eventTimes?.[ev];
        const lanes = Object.values(entries).map((e) => e.lanes?.[ev]);
        return [ev, { callTime: t?.callTime ?? commonTime(lanes.map((l) => l?.callTime)), startTime: t?.startTime ?? commonTime(lanes.map((l) => l?.startTime)) }];
      }),
    ),
  );
  const [saving, setSaving] = useState(false);
  const set = (ev: string, p: EventTime) => setTimes({ ...times, [ev]: { ...times[ev], ...p } });

  const time = "h-11 w-[110px] rounded-[10px] border border-line bg-white px-1.5 text-center text-base font-bold disabled:bg-slate-50 disabled:text-muted";

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
        <p className="mt-1.5 mb-0 text-[13px] text-sub">入れた時間は、その種目に出る全員に出ます。わかっているものだけで大丈夫です。</p>
      </Card>

      {events.length === 0 && (
        <Card>
          <p className="m-0 text-sm text-muted">まだだれもエントリーしていません</p>
        </Card>
      )}

      {events.map((ev) => {
        const ok = canEdit(ev);
        return (
          <Card key={ev} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="m-0 text-lg font-bold">{ev}</p>
              <span className="min-w-0 truncate text-xs text-sub">{people[ev].join("・")}</span>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-16">招集開始</span>
              <input type="time" disabled={!ok} value={times[ev].callTime ?? ""} onChange={(e) => set(ev, { callTime: e.target.value })} aria-label={`${ev} の招集開始時間`} className={time} />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-16">競技開始</span>
              <input type="time" disabled={!ok} value={times[ev].startTime ?? ""} onChange={(e) => set(ev, { startTime: e.target.value })} aria-label={`${ev} の競技開始時間`} className={time} />
            </label>
            {!ok && <Label className="font-normal">この種目に出る人と、担当の人が直せます</Label>}
          </Card>
        );
      })}

      {events.length > 0 && (
        <div className="sticky bottom-3">
          <PrimaryButton
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              // 前に入っていた、エントリーのない種目の時間も残す
              await saveEventTimes(meet.id, { ...meet.eventTimes, ...times });
              router.push(back);
            }}
          >
            {saving ? "保存しています…" : "まとめて保存する"}
          </PrimaryButton>
        </div>
      )}
    </>
  );
}
