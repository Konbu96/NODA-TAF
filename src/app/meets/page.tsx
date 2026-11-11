"use client";

import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { MainShell } from "@/components/Shell";
import { Badge } from "@/components/ui";
import { dayOf, monthOf, shortDate } from "@/lib/dates";
import { isMeetOver, missingRecords } from "@/lib/derived";
import { canEditMenu, isAthlete } from "@/lib/permissions";
import type { DbState, Member } from "@/lib/types";

export default function MeetsPage() {
  return <MainShell title="大会" tab="meets">{(ctx) => <Body {...ctx} />}</MainShell>;
}

const RESULTS_URL = "http://www.yjptf.jp/mob/nans21v/shtml/TimeTable.html";

function Body({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const meets = Object.values(db.meets);
  const upcoming = meets.filter((m) => !isMeetOver(m, today)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = meets.filter((m) => isMeetOver(m, today)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const waiting = isAthlete(me) ? past.filter((m) => missingRecords(db, m, me.email, today).length > 0) : [];
  const entryCount = (id: string) => Object.keys(db.entries[id] ?? {}).length;
  const resultCount = (id: string) => new Set(Object.values(db.records).filter((r) => r.meetId === id).map((r) => r.memberId)).size;

  const editor = canEditMenu(me);
  return (
    <>
      {/* 山口陸協の速報ページ（いつも同じアドレス） */}
      <a href={RESULTS_URL} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-[15px] font-bold text-accent">
        <span className="grow">速報を見る</span>
        <span aria-hidden>↗</span>
      </a>

      <section className="overflow-hidden rounded-xl bg-white">
        <p className="m-0 px-4 pt-3 pb-1.5 text-[13px] font-bold text-sub">これからの大会</p>
        {upcoming.length === 0 && <p className="m-0 px-4 pb-4 text-sm text-muted">登録された大会はありません</p>}
        {upcoming.map((m) => {
          const mine = db.entries[m.id]?.[me.email];
          return (
            <Link key={m.id} href={`/meets/detail?id=${m.id}`} className={`flex items-center gap-3 border-b border-hair px-4 py-3 hover:bg-[#F8FAFC] ${editor ? "" : "last:border-b-0"}`}>
              <div className="w-12 shrink-0 text-center">
                <p className="m-0 text-[11px] text-sub">{monthOf(m.startDate)}月</p>
                <p className="m-0 text-[22px] leading-[1.1] font-bold text-accent">{dayOf(m.startDate)}</p>
              </div>
              <div className="grow">
                <p className="m-0 text-[15px] font-bold">{m.name}</p>
                <p className="mt-0.5 mb-0 text-xs text-sub">
                  {m.venue}・エントリー {entryCount(m.id)}人
                </p>
                {/* 自分のエントリーの状態は、横ではなく下に出す */}
                {isAthlete(me) &&
                  (mine ? (
                    <p className="mt-0.5 mb-0 text-xs font-bold text-ok">出場</p>
                  ) : (
                    <p className="mt-0.5 mb-0 text-xs text-warn-dark">未エントリー</p>
                  ))}
              </div>
            </Link>
          );
        })}
        {/* 大会の登録（担当者）。大会の一覧と薄い線で区切って、その下に置く */}
        {editor && (
          <div className={`flex justify-center py-3 ${upcoming.length === 0 ? "border-t border-hair" : ""}`}>
            <Link href="/meets/edit" className="flex items-center gap-1.5 rounded-full bg-accent-soft px-5 py-2.5 text-sm font-bold text-accent">
              <PlusIcon />
              大会を登録する
            </Link>
          </div>
        )}
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

      {past.length > 0 && (
        // 「大会を登録する」と少し間を空ける
        <section className="mt-4 overflow-hidden rounded-xl border border-[#D5DCE5] bg-[#E6EBF1]">
          <p className="m-0 px-4 pt-2.5 pb-1 text-xs font-bold text-muted">終わった大会</p>
          {past.map((m) => {
            const miss = isAthlete(me) && missingRecords(db, m, me.email, today).length > 0;
            return (
              <Link key={m.id} href={`/meets/detail?id=${m.id}`} className="flex items-center gap-3 border-t border-[#D5DCE5] px-4 py-2 text-sub">
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
