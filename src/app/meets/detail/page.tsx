"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Label, PbTag, PrimaryLink, RefMark, EditButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { isMeetOver, missingRecords } from "@/lib/derived";
import { sortMembers } from "@/lib/grade";
import { ALL_EVENTS, windLabel, showMark } from "@/lib/marks";
import { canEditMenu, canEditRecordsOf, isAthlete } from "@/lib/permissions";
import type { DbState, Meet, Member } from "@/lib/types";

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

const eventOrder = (e: string) => {
  const i = ALL_EVENTS.indexOf(e);
  return i < 0 ? 999 : i;
};

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return (
    <SubShell title="大会" back="/meets">
      {(ctx) => {
        const meet = ctx.db.meets[id];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        return <Body {...ctx} meet={meet} />;
      }}
    </SubShell>
  );
}

function Body({ db, me, today, meet }: { db: DbState; me: Member; today: string; meet: Meet }) {
  const over = isMeetOver(meet, today);
  const entries = db.entries[meet.id] ?? {};
  const records = Object.values(db.records).filter((r) => r.meetId === meet.id);
  // 人ごとに並べる（エントリーした人と、記録がある人）
  const people = sortMembers(
    [...new Set([...Object.keys(entries), ...records.map((r) => r.memberId)])].map((e) => db.members[e]).filter(Boolean),
    today,
  );
  const entrants = people.filter((m) => entries[m.email]);
  const byOrder = (a: string, b: string) => eventOrder(a) - eventOrder(b);
  const mine = entries[me.email];
  const missing = missingRecords(db, meet, me.email, today);
  const editor = canEditMenu(me);

  return (
    <>
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <p className="m-0 min-w-0 grow text-xl font-bold">{meet.name}</p>
          {editor && (
            <EditButton href={`/meets/edit?id=${meet.id}`} ariaLabel="大会情報を編集" />
          )}
        </div>
        <p className="m-0 text-sm text-[#334155]">{rangeLabel(meet.startDate, meet.endDate)}</p>
        {meet.venue && <p className="m-0 text-sm text-[#334155]">{meet.venue}</p>}
        {meet.guidelineUrl && (
          <a href={meet.guidelineUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-accent">
            出場要項を見る ↗
          </a>
        )}
      </Card>

      {!over ? (
        <Card className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <Label>エントリー（{Object.keys(entries).length}人）</Label>
            {mine && <p className="m-0 text-xs font-bold text-ok">あなた：{mine.events.join("、")}</p>}
          </div>
          {entrants.length === 0 && <p className="m-0 text-sm text-muted">まだいません</p>}
          {entrants.map((m) => (
            <div key={m.email} className="flex gap-2.5 text-sm">
              <span className="w-24 shrink-0 font-bold">
                {editor ? (
                  <Link href={`/meets/entry?id=${meet.id}&member=${encodeURIComponent(m.email)}`} className="underline decoration-line">
                    {m.name}
                  </Link>
                ) : (
                  m.name
                )}
              </span>
              <span className="text-[#334155]">{[...entries[m.email].events].sort(byOrder).join("、")}</span>
            </div>
          ))}
          {isAthlete(me) && me.role !== "manager" && (
            <Link href={`/meets/entry?id=${meet.id}`} className="flex h-12 items-center justify-center rounded-xl border-2 border-accent bg-white text-[15px] font-bold text-accent">
              {mine ? "自分のエントリーを直す" : "自分のエントリーを入力"}
            </Link>
          )}
        </Card>
      ) : (
        <Card className="flex flex-col gap-2.5">
          <Label>結果</Label>
          {people.length === 0 && <p className="m-0 text-sm text-muted">記録はまだありません</p>}
          {people.map((m) => {
            const list = records.filter((r) => r.memberId === m.email);
            const evs = [...new Set([...(entries[m.email]?.events ?? []), ...list.map((r) => r.event)])].sort(byOrder);
            return (
              <div key={m.email}>
                <p className="mt-0 mb-1 flex items-center gap-2 text-[13px] font-bold">
                  <span className="grow">{m.email === me.email ? "あなた" : m.name}</span>
                  {/* マネージャーは、ほかの人の記録も直せる */}
                  {canEditRecordsOf(me, m.email) && m.email !== me.email && (
                    <EditButton small href={`/records/edit?meet=${meet.id}&member=${encodeURIComponent(m.email)}`} ariaLabel={`${m.name}の記録を編集`} />
                  )}
                </p>
                {evs.map((ev) => {
                  const r = list.find((x) => x.event === ev);
                  return (
                    <div key={ev} className={`flex justify-between py-1 pl-2 text-sm ${r ? "" : m.email === me.email ? "text-warn-dark" : "text-muted"}`}>
                      <span>{ev}</span>
                      {r ? (
                        <span className="flex items-center gap-1">
                          {r.isWindAssisted && <RefMark small />}
                          {showMark(r.mark)}
                          {r.wind != null && `（${windLabel(r.wind)}）`}
                          {r.isPB && <PbTag />}
                        </span>
                      ) : (
                        <span>未入力</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {mine && <PrimaryLink href={`/records/edit?meet=${meet.id}`}>{missing.length ? "自分の記録を入力する" : "自分の記録を直す"}</PrimaryLink>}
        </Card>
      )}
    </>
  );
}
