"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PencilIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Card, Label, PbTag, PrimaryLink, RefMark } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { isMeetOver, missingRecords } from "@/lib/derived";
import { ALL_EVENTS, windLabel } from "@/lib/marks";
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
    <SubShell
      title="大会"
      back="/meets"
      right={({ me }) =>
        canEditMenu(me) ? (
          <Link href={`/meets/edit?id=${id}`} aria-label="大会情報を直す" className="flex h-11 w-11 items-center justify-center text-white">
            <PencilIcon />
          </Link>
        ) : null
      }
    >
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
  const byEvent: Record<string, Member[]> = {};
  for (const [email, e] of Object.entries(entries)) {
    const m = db.members[email];
    if (!m) continue;
    for (const ev of e.events) (byEvent[ev] ??= []).push(m);
  }
  const events = Object.keys(byEvent).sort((a, b) => eventOrder(a) - eventOrder(b));
  const mine = entries[me.email];
  const records = Object.values(db.records).filter((r) => r.meetId === meet.id);
  const missing = missingRecords(db, meet, me.email, today);
  const editor = canEditMenu(me);

  return (
    <>
      <Card className="flex flex-col gap-2 p-4">
        <p className="m-0 text-xl font-bold">{meet.name}</p>
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
          {events.length === 0 && <p className="m-0 text-sm text-muted">まだいません</p>}
          {events.map((ev) => (
            <div key={ev} className="flex gap-2.5 text-sm">
              <span className="w-14 shrink-0 font-bold">{ev}</span>
              <span className="text-[#334155]">
                {byEvent[ev].map((m, i) => (
                  <span key={m.email}>
                    {i > 0 && "、"}
                    {editor ? (
                      <Link href={`/meets/entry?id=${meet.id}&member=${encodeURIComponent(m.email)}`} className="underline decoration-line">
                        {m.name}
                      </Link>
                    ) : (
                      m.name
                    )}
                  </span>
                ))}
              </span>
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
          {events.length === 0 && records.length === 0 && <p className="m-0 text-sm text-muted">記録はまだありません</p>}
          {[...new Set([...events, ...records.map((r) => r.event)])]
            .sort((a, b) => eventOrder(a) - eventOrder(b))
            .map((ev) => {
              const list = records.filter((r) => r.event === ev);
              const people = byEvent[ev] ?? [];
              const notYet = people.filter((p) => !list.some((r) => r.memberId === p.email));
              return (
                <div key={ev}>
                  <p className="mt-0 mb-1 text-[13px] font-bold">{ev}</p>
                  {list.map((r) => (
                    <div key={r.id} className="flex justify-between py-1 text-sm">
                      <span>{db.members[r.memberId]?.name}</span>
                      <span className="flex items-center gap-1">
                        {r.isWindAssisted && <RefMark small />}
                        {r.mark}
                        {r.wind != null && `（${windLabel(r.wind)}）`}
                        {r.isPB && <PbTag />}
                        {canEditRecordsOf(me, r.memberId) && r.memberId !== me.email && (
                          <Link href={`/records/edit?meet=${meet.id}&member=${encodeURIComponent(r.memberId)}`} className="ml-1 text-xs text-accent underline">
                            直す
                          </Link>
                        )}
                      </span>
                    </div>
                  ))}
                  {notYet.map((p) => (
                    <div key={p.email} className={`flex justify-between py-1 text-sm ${p.email === me.email ? "text-warn-dark" : "text-muted"}`}>
                      <span>{p.email === me.email ? "あなた" : p.name}</span>
                      <span>未入力</span>
                    </div>
                  ))}
                </div>
              );
            })}
          {mine && <PrimaryLink href={`/records/edit?meet=${meet.id}`}>{missing.length ? "自分の記録を入力する" : "自分の記録を直す"}</PrimaryLink>}
        </Card>
      )}
    </>
  );
}
