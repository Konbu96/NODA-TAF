"use client";

import Link from "next/link";
import { MainShell } from "@/components/Shell";
import { Badge } from "@/components/ui";
import { dayOf, monthOf, shortDate } from "@/lib/dates";
import { isMeetOver, missingRecords } from "@/lib/derived";
import { canEditMenu, isAthlete } from "@/lib/permissions";
import type { DbState, Member } from "@/lib/types";

export default function MeetsPage() {
  return <MainShell title="大会" tab="meets">{(ctx) => <Body {...ctx} />}</MainShell>;
}

function Body({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const meets = Object.values(db.meets);
  const upcoming = meets.filter((m) => !isMeetOver(m, today)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = meets.filter((m) => isMeetOver(m, today)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const waiting = isAthlete(me) ? past.filter((m) => missingRecords(db, m, me.email, today).length > 0) : [];
  const entryCount = (id: string) => Object.keys(db.entries[id] ?? {}).length;
  const resultCount = (id: string) => new Set(Object.values(db.records).filter((r) => r.meetId === id).map((r) => r.memberId)).size;

  return (
    <>
      <section className="overflow-hidden rounded-xl bg-white">
        <p className="m-0 px-4 pt-3 pb-1.5 text-[13px] font-bold text-sub">これからの大会</p>
        {upcoming.length === 0 && <p className="m-0 px-4 pb-4 text-sm text-muted">登録された大会はありません</p>}
        {upcoming.map((m) => {
          const mine = db.entries[m.id]?.[me.email];
          return (
            <Link key={m.id} href={`/meets/detail?id=${m.id}`} className="flex items-center gap-3 border-b border-hair px-4 py-3 last:border-b-0 hover:bg-[#F8FAFC]">
              <div className="w-12 shrink-0 text-center">
                <p className="m-0 text-[11px] text-sub">{monthOf(m.startDate)}月</p>
                <p className="m-0 text-[22px] leading-[1.1] font-bold text-accent">{dayOf(m.startDate)}</p>
              </div>
              <div className="grow">
                <p className="m-0 text-[15px] font-bold">{m.name}</p>
                <p className="mt-0.5 mb-0 text-xs text-sub">
                  {m.venue}・エントリー {entryCount(m.id)}人
                </p>
              </div>
              {isAthlete(me) &&
                (mine ? (
                  <span className="text-xs font-bold whitespace-nowrap text-ok">出場</span>
                ) : (
                  <span className="text-xs whitespace-nowrap text-sub">未エントリー</span>
                ))}
            </Link>
          );
        })}
      </section>

      {waiting.map((m) => {
        const miss = missingRecords(db, m, me.email, today);
        return (
          <Link key={m.id} href={`/records/edit?meet=${m.id}`} className="flex items-center gap-3 rounded-xl border-2 border-warn bg-warn-soft px-4 py-3">
            <div className="w-12 shrink-0 text-center">
              <p className="m-0 text-[11px] text-warn-dark">{monthOf(m.startDate)}月</p>
              <p className="m-0 text-[22px] leading-[1.1] font-bold text-warn-dark">{dayOf(m.startDate)}</p>
            </div>
            <div className="grow">
              <p className="m-0 text-[15px] font-bold">{m.name}</p>
              <p className="mt-0.5 mb-0 text-xs font-bold text-warn-dark">記録を入力しよう（{miss.join("、")}）</p>
            </div>
            <Badge n={miss.length} />
          </Link>
        );
      })}

      {canEditMenu(me) && (
        <Link href="/meets/edit" className="flex h-11 items-center justify-center rounded-xl border border-dashed border-[#93C5FD] bg-[#F8FAFC] text-sm font-bold text-accent">
          ＋ 大会を登録する
        </Link>
      )}

      {past.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-[#E2E8F0]">
          <p className="m-0 px-4 pt-2.5 pb-1 text-xs font-bold text-muted">終わった大会</p>
          {past.map((m) => {
            const miss = isAthlete(me) && missingRecords(db, m, me.email, today).length > 0;
            return (
              <Link key={m.id} href={`/meets/detail?id=${m.id}`} className="flex items-center gap-3 border-t border-[#E2E8F0] px-4 py-2 text-sub">
                <span className="w-12 shrink-0 text-center text-[13px]">{shortDate(m.startDate)}</span>
                <span className="grow text-sm">{m.name}</span>
                {miss ? <span className="text-xs text-warn-dark">入力待ち</span> : <span className="text-xs text-muted">結果 {resultCount(m.id)}人</span>}
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
