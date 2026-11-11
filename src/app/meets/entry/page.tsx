"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Label, PrimaryButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { EVENT_GROUPS } from "@/lib/marks";
import { canEditMenu } from "@/lib/permissions";
import { saveEntry } from "@/lib/store";
import type { DbState, Meet, Member } from "@/lib/types";
import { familyName } from "@/lib/names";
import { pbEvents } from "@/lib/pb";

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
  const [events, setEvents] = useState<string[]>(db.entries[meet.id]?.[target.email]?.events ?? []);
  const toggle = (e: string) => setEvents(events.includes(e) ? events.filter((x) => x !== e) : [...events, e]);
  // 出たことのある種目を上にまとめて出す
  const done = pbEvents(target);
  const others = EVENT_GROUPS.map((g) => ({ ...g, events: g.events.filter((e) => !done.includes(e)) })).filter((g) => g.events.length);

  return (
    <>
      <Card className="py-3">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{rangeLabel(meet.startDate, meet.endDate)}</p>
      </Card>
      {target.email !== me.email && <p className="m-0 px-1 text-sm font-bold">{familyName(target.name)}のエントリー</p>}
      {done.length > 0 && (
        <Card className="flex flex-col gap-2">
          <Label>出たことのある種目</Label>
          <div className="flex flex-wrap gap-1.5">
            {done.map((e) => (
              <Chip key={e} on={events.includes(e)} onClick={() => toggle(e)} className="h-11 px-4 text-[15px]">
                {e}
              </Chip>
            ))}
          </div>
        </Card>
      )}
      <Card className="flex flex-col gap-3">
        <Label>{done.length ? "ほかの種目" : "種目"}</Label>
        {others.map((g) => (
          <div key={g.name}>
            <p className="mt-0 mb-1.5 text-xs font-bold text-muted">{g.name}</p>
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
      <PrimaryButton
        onClick={async () => {
          await saveEntry(meet.id, target.email, events, me.email);
          router.push(`/meets/detail?id=${meet.id}`);
        }}
      >
        {events.length ? `${events.length} 種目でエントリーする` : "エントリーを取り消す"}
      </PrimaryButton>
    </>
  );
}
