"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PbDialog } from "@/components/PbDialog";
import { RecordFields, recordInputOf } from "@/components/RecordFields";
import { SubShell } from "@/components/Shell";
import { Card, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { isMeetStarted } from "@/lib/derived";
import { sortMembers } from "@/lib/grade";
import { ALL_EVENTS } from "@/lib/marks";
import { showResultEditOf } from "@/lib/permissions";
import { saveRecords, type PbUpdate, type RecordInput } from "@/lib/store";
import type { DbState, Meet, Member } from "@/lib/types";

// 大会の結果を、みんなの分まとめて直す画面（マネージャー・顧問など）。
// エントリーした人と、記録がある人を並べて、1 回で保存する

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
    <SubShell title="結果をまとめて編集" back={`/meets/detail?id=${id}`}>
      {(ctx) => {
        const meet = ctx.db.meets[id];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        if (!isMeetStarted(meet, ctx.today)) return <p className="text-sm text-sub">記録は大会の日から入力できます。</p>;
        return <Form {...ctx} meet={meet} />;
      }}
    </SubShell>
  );
}

const byEvent = (a: string, b: string) => ALL_EVENTS.indexOf(a) - ALL_EVENTS.indexOf(b);
const key = (email: string, ev: string) => `${email}\n${ev}`;

function Form({ db, me, today, meet }: { db: DbState; me: Member; today: string; meet: Meet }) {
  const router = useRouter();
  const back = `/meets/detail?id=${meet.id}`;
  const entries = db.entries[meet.id] ?? {};
  const records = Object.values(db.records).filter((r) => r.meetId === meet.id);
  // 直せる人だけ（自分の分も入る）
  const people = sortMembers(
    [...new Set([...Object.keys(entries), ...records.map((r) => r.memberId)])].map((e) => db.members[e]).filter((m) => m && showResultEditOf(me, m.email)),
    today,
  );
  const eventsOf = (email: string) => [...new Set([...(entries[email]?.events ?? []), ...records.filter((r) => r.memberId === email).map((r) => r.event)])].sort(byEvent);
  const had = (email: string, ev: string) => records.some((r) => r.memberId === email && r.event === ev);

  const [recs, setRecs] = useState<Record<string, RecordInput>>(() => Object.fromEntries(records.map((r) => [key(r.memberId, r.event), recordInputOf(r)])));
  const [pbs, setPbs] = useState<(PbUpdate & { who: string })[] | null>(null);
  const [saving, setSaving] = useState(false);
  const recOf = (email: string, ev: string): RecordInput => recs[key(email, ev)] ?? { event: ev, digits: "", windDigits: "", minus: false };
  const setRec = (email: string, ev: string, p: Partial<RecordInput>) => setRecs({ ...recs, [key(email, ev)]: { ...recOf(email, ev), ...p } });

  async function save() {
    setSaving(true);
    const got: (PbUpdate & { who: string })[] = [];
    for (const m of people) {
      // 入れた欄と、前に記録があった種目だけ保存する（空にすると消える）
      const inputs = eventsOf(m.email)
        .map((ev) => recOf(m.email, ev))
        .filter((r) => r.short || r.digits || had(m.email, r.event));
      if (!inputs.length) continue;
      const res = await saveRecords(meet, m.email, inputs, me.email);
      got.push(...res.map((p) => ({ ...p, who: m.name })));
    }
    if (got.length) setPbs(got);
    else router.push(back);
  }

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
        <p className="mt-1.5 mb-0 text-[13px] text-sub">わかっている記録だけ入れて、最後にまとめて保存してください。</p>
      </Card>

      {people.length === 0 && (
        <Card>
          <p className="m-0 text-sm text-muted">エントリーした人がいません</p>
        </Card>
      )}

      {people.map((m) => (
        <Card key={m.email} className="flex flex-col gap-4">
          <p className="m-0 text-[17px] font-bold">{m.email === me.email ? "あなた" : m.name}</p>
          {eventsOf(m.email).map((ev) => (
            <div key={ev} className="flex flex-col gap-1">
              <p className="m-0 text-[15px] font-bold">{ev}</p>
              <RecordFields rec={recOf(m.email, ev)} set={(p) => setRec(m.email, ev, p)} hadRecord={had(m.email, ev)} label={`${m.name} ${ev}`} />
            </div>
          ))}
        </Card>
      ))}

      <p className="m-0 text-center text-[11px] text-[#94A3B8]">予選・決勝などで何本か走ったときは、一番良い記録だけ入れてください</p>

      {people.length > 0 && (
        <div className="sticky bottom-3">
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? "保存しています…" : "まとめて保存する"}
          </PrimaryButton>
        </div>
      )}

      {pbs && <PbDialog pbs={pbs} back={back} />}
    </>
  );
}
