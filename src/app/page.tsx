"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BackIcon, DownIcon, NextIcon, PlusIcon } from "@/components/icons";
import { WarmUpText } from "@/components/WarmUpText";
import { MainShell } from "@/components/Shell";
import { chipOff, chipOn, Sheet, EditButton } from "@/components/ui";
import { addDays, dayLabel, diffDays } from "@/lib/dates";
import { approvedMembers, latestGoal } from "@/lib/derived";
import { feeFor, isPayer, sortMembers } from "@/lib/grade";
import { itemLine } from "@/lib/menuText";
import { canEditMenu, writesReflection } from "@/lib/permissions";
import { setAttendance, setWinter } from "@/lib/store";
import { showMark } from "@/lib/marks";
import type { DbState, Member } from "@/lib/types";
import { familyName } from "@/lib/names";

export default function MenuPage() {
  return <MainShell title="メニュー" tab="menu">{(ctx) => <MenuBody {...ctx} />}</MainShell>;
}


function MenuBody({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const [offset, setOffset] = useState(0);
  const [openWarm, setOpenWarm] = useState<string | null>(null);
  const [pbOpen, setPbOpen] = useState(false);
  const swipeX = useRef<number | null>(null);
  const date = addDays(today, offset);
  const menu = db.menus[date];
  const editor = canEditMenu(me);
  const goal = writesReflection(me) ? latestGoal(db, me.email) : "";

  const recentPbs = Object.values(db.records)
    .filter((r) => r.isPB && diffDays(today, r.date) >= 0 && diffDays(today, r.date) < 3 && db.members[r.memberId])
    .sort((a, b) => b.date.localeCompare(a.date));

  const go = (d: number) => setOffset((o) => Math.min(7, Math.max(-1, o + d)));
  const sub = offset === 0 ? "今日" : offset === -1 ? "昨日" : offset === 1 ? "明日" : `${offset}日後`;

  return (
    <>
      {goal && (
        <section className="flex items-baseline gap-2.5 rounded-xl bg-white px-4 py-2.5">
          <p className="m-0 shrink-0 text-xs text-sub">今月の目標</p>
          <p className="m-0 text-[15px] font-bold">{goal}</p>
        </section>
      )}

      {recentPbs.length > 0 && (
        <section className="rounded-xl bg-warn-soft">
          <button onClick={() => setPbOpen(!pbOpen)} aria-expanded={pbOpen} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-warn-dark">
            <span className="text-[13px] font-bold">最近の PB</span>
            <span className="grow text-[13px] text-[#7C2D12]">
              {familyName(db.members[recentPbs[0].memberId].name)}{recentPbs.length > 1 ? ` ほか ${recentPbs.length - 1}人` : ""}
            </span>
            <DownIcon className={`transition-transform ${pbOpen ? "rotate-180" : ""}`} />
          </button>
          {pbOpen && (
            <div className="flex flex-col gap-1 px-4 pb-3">
              {recentPbs.map((r) => (
                <p key={r.id} className="m-0 text-sm">
                  {familyName(db.members[r.memberId].name)}　{r.event}　{showMark(r.mark)}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <section
        className="touch-pan-y overflow-hidden rounded-xl bg-white"
        onPointerDown={(e) => (swipeX.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeX.current == null) return;
          const dx = e.clientX - swipeX.current;
          swipeX.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="flex items-center justify-between p-1.5">
          <button onClick={() => go(-1)} disabled={offset <= -1} aria-label="前の日" className="flex h-11 w-11 items-center justify-center text-accent disabled:text-line">
            <BackIcon />
          </button>
          <div className="text-center">
            <p className="m-0 text-[17px] font-bold">{dayLabel(date)}</p>
            <p className="mt-0.5 mb-0 text-xs text-sub">{sub}</p>
          </div>
          <button onClick={() => go(1)} disabled={offset >= 7} aria-label="次の日" className="flex h-11 w-11 items-center justify-center text-accent disabled:text-line">
            <NextIcon size={22} />
          </button>
        </div>

        {menu ? (
          <div className="border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="m-0 text-[13px] font-bold text-accent">練習メニュー</p>
              {editor && <EditButton small href={`/menu/edit?date=${date}`} ariaLabel="メニューを編集" />}
            </div>
            {menu.isStadium && <StadiumBlock db={db} me={me} date={date} today={today} />}
            <div className="flex flex-col gap-3 px-4 pb-3.5">
              {menu.warmUp.length > 0 && (
                <div>
                  <p className="mb-1 mt-0 text-xs font-bold text-sub">アップ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {menu.warmUp.map((w) =>
                      db.warmUpDetails[w] ? (
                        <button
                          key={w}
                          onClick={() => setOpenWarm(openWarm === w ? null : w)}
                          aria-expanded={openWarm === w}
                          className={`flex h-8 items-center gap-1 rounded-full pr-2 pl-3 text-[14px] ${openWarm === w ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}
                        >
                          {w}
                          <DownIcon size={16} className={`transition-transform ${openWarm === w ? "rotate-180" : ""}`} />
                        </button>
                      ) : (
                        <span key={w} className="flex h-8 items-center rounded-full bg-hair px-3 text-[14px]">
                          {w}
                        </span>
                      ),
                    )}
                  </div>
                  {openWarm && menu.warmUp.includes(openWarm) && db.warmUpDetails[openWarm] && (
                    <div className="mt-2 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
                      <p className="mt-0 mb-1.5 text-[13px] font-bold text-accent">{openWarm}</p>
                      <WarmUpText text={db.warmUpDetails[openWarm]} />
                    </div>
                  )}
                </div>
              )}
              {menu.items.length > 0 && (
                <div>
                  <p className="mb-1 mt-0 text-xs font-bold text-sub">メニュー</p>
                  {menu.items.map((it, i) => (
                    <p key={i} className="m-0 text-[15px] leading-[1.7]">
                      {itemLine(it, i + 1)}
                    </p>
                  ))}
                </div>
              )}
              {menu.note && (
                <div>
                  <p className="mb-1 mt-0 text-xs font-bold text-sub">連絡</p>
                  <p className="m-0 text-[15px] leading-[1.6] whitespace-pre-line">{menu.note}</p>
                </div>
              )}
              {menu.hasStabro && (
                <Link href={`/stabro?date=${date}`} className="flex h-11 items-center justify-center rounded-[10px] border-2 border-accent text-sm font-bold text-accent">
                  スタブロの記録をつける
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 border-t border-[#E2E8F0] px-4 py-7 text-center">
            {/* 過ぎた日は、もう登録しないので案内だけ出す */}
            <p className="m-0 text-sm text-sub">{date < today ? "メニューは登録されていませんでした" : "まだ登録されていません"}</p>
            {editor && date >= today && (
              <Link href={`/menu/edit?date=${date}`} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-5 py-2.5 text-sm font-bold text-accent">
                <PlusIcon />
                メニューを登録する
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function StadiumBlock({ db, me, date, today }: { db: DbState; me: Member; date: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const day = db.attendance[date] ?? {};
  const payer = isPayer(me);
  const mine = day[me.email];
  const answered = !!mine;
  const payers = sortMembers(approvedMembers(db).filter(isPayer), today);
  const going = payers.filter((m) => day[m.email]?.going === true);
  const notGoing = payers.filter((m) => day[m.email]?.going === false);
  const unanswered = payers.filter((m) => !day[m.email]);
  const fee = (m: Member) => feeFor(m, db.fees, db.winter.isOn, today);
  const total = going.reduce((s, m) => s + fee(m), 0);
  const editor = canEditMenu(me);
  const showButtons = payer && (!answered || open);

  return (
    <div className="mx-3 mb-3 rounded-[10px] bg-[#EFF6FF]">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 px-3 text-left">
        <span className="grow text-[13px] font-bold text-accent">競技場の日</span>
        {payer && answered && (
          <span className={`text-[13px] font-bold ${mine.going ? "text-ok" : "text-muted"}`}>{mine.going ? "行く" : "行かない"}</span>
        )}
        <DownIcon className={`text-accent transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {showButtons && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {[true, false].map((g) => (
            <button
              key={String(g)}
              onClick={() => setAttendance(date, me.email, g, me.email)}
              className={`h-11 rounded-lg text-[15px] font-bold ${mine?.going === g ? chipOn : chipOff}`}
            >
              {g ? "行く" : "行かない"}
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="flex flex-col gap-2.5 px-3 pb-3">
          <div className="flex justify-between border-t border-accent-soft pt-2.5 text-[13px] text-[#334155]">
            {payer ? (
              <>
                <span>あなたの料金</span>
                <b>{mine?.going ? `${fee(me)}円` : "0円"}</b>
              </>
            ) : (
              <span>マネージャー・顧問は料金がかかりません</span>
            )}
          </div>
          <div className="flex justify-between text-[13px] text-[#334155]">
            <button onClick={() => setSheet(true)} className="font-bold text-accent underline">
              参加 {going.length}人／未回答 {unanswered.length}人
            </button>
            <span>合計 {total.toLocaleString()}円</span>
          </div>
          <label className="flex items-center justify-between gap-2 text-[13px] text-[#334155]">
            冬季料金（+{db.fees.winterExtra}円）
            <input
              type="checkbox"
              checked={db.winter.isOn}
              onChange={(e) => setWinter(e.target.checked, me.email)}
              className="h-[22px] w-[22px] shrink-0 accent-accent"
            />
          </label>
        </div>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title={`${dayLabel(date)} の参加者`}>
        {[
          { label: "行く", list: going, showFee: true },
          { label: "行かない", list: notGoing, showFee: false },
          { label: "未回答", list: unanswered, showFee: false },
        ].map((g) => (
          <div key={g.label}>
            <p className="mt-0 mb-1 text-xs font-bold text-sub">
              {g.label}（{g.list.length}人）
            </p>
            {g.list.length === 0 && <p className="m-0 text-sm text-muted">いません</p>}
            {g.list.map((m) => (
              <div key={m.email} className="flex min-h-10 items-center gap-2 border-t border-hair text-sm">
                <span className="grow">{m.name}</span>
                {g.showFee && <span>{fee(m)}円</span>}
                {editor && (
                  <span className="flex gap-1">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        onClick={() => setAttendance(date, m.email, v, me.email)}
                        className={`h-7 rounded-full px-2 text-[11px] ${day[m.email]?.going === v ? chipOn : chipOff}`}
                      >
                        {v ? "行く" : "行かない"}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
        <div className="flex justify-between border-t-2 border-ink pt-2 text-[15px] font-bold">
          <span>合計</span>
          <span>{total.toLocaleString()}円</span>
        </div>
      </Sheet>
    </div>
  );
}
