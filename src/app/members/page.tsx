"use client";

import Link from "next/link";
import { useState } from "react";
import { MoodFace } from "@/components/MoodFace";
import { MainShell } from "@/components/Shell";
import { monthLabel } from "@/lib/dates";
import { athletes, pendingMembers, reflectionStatus } from "@/lib/derived";
import { gradeOf, GRADES, ROLE_LABEL, sortMembers } from "@/lib/grade";
import { canApprove, writesReflection } from "@/lib/permissions";
import { DownIcon, NextIcon } from "@/components/icons";
import type { DbState, Member } from "@/lib/types";

export default function MembersPage() {
  return <MainShell title="部員" tab="members">{(ctx) => <Body {...ctx} />}</MainShell>;
}

function Body({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const myGrade = gradeOf(me.graduationYear, today);
  const [open, setOpen] = useState<string>(myGrade ?? "高2");
  const [q, setQ] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const list = sortMembers(athletes(db), today);
  const month = reflectionStatus(db, me, today).month;
  const writers = list.filter(writesReflection);
  const submitted = writers.filter((m) => db.goals[`${month}_${m.email}`]);
  const missing = writers.filter((m) => !db.goals[`${month}_${m.email}`]);
  const ratio = writers.length ? Math.round((submitted.length / writers.length) * 100) : 0;
  const approver = canApprove(me);
  const pending = approver ? pendingMembers(db).length : 0;
  const query = q.trim();
  const groups = [...GRADES].reverse().map((g) => ({ g, people: list.filter((m) => gradeOf(m.graduationYear, today) === g) })).filter((x) => x.people.length);

  const row = (m: Member) => {
    const goal = db.goals[`${month}_${m.email}`]?.goal;
    const mood = db.moods[`${today}_${m.email}`];
    return (
      <Link key={m.email} href={`/members/detail?id=${encodeURIComponent(m.email)}`} className="block border-b border-hair px-4 py-2.5 hover:bg-[#F8FAFC]">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[15px] font-medium">
            {m.name}
            {mood && <MoodFace kind={mood.mood} />}
          </span>
          <span className="text-xs text-sub">
            {m.role === "manager" ? ROLE_LABEL.manager : [m.bibNumber, m.events.join(" / ")].filter(Boolean).join("・")}
          </span>
        </span>
        {!writesReflection(m) ? null : goal ? (
          <span className="mt-[3px] block text-[13px] text-[#334155]">目標：{goal}</span>
        ) : (
          <span className="mt-[3px] block text-[13px] text-warn-dark">未提出</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {approver && (
        <Link href="/admin/members" className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-[15px]">
          <span className="grow">部員名簿</span>
          {pending > 0 && <span className="rounded-xl bg-[#EF4444] px-2.5 py-[3px] text-xs font-bold text-white">承認待ち {pending}</span>}
          <NextIcon className="text-line" />
        </Link>
      )}

      <section className="rounded-xl bg-white px-4 py-2.5">
        <button
          onClick={() => setShowMissing(!showMissing)}
          disabled={missing.length === 0 && !db.sheetsUrl}
          aria-expanded={showMissing}
          className="flex w-full items-center gap-2 text-left"
        >
          <span className="text-[13px] font-bold text-sub">{monthLabel(month)}の振り返り</span>
          <span className="grow text-[13px]">
            <b className="text-accent">{submitted.length}</b> / {writers.length}人
          </span>
          {missing.length > 0 && <span className="text-xs font-bold text-warn-dark">未提出 {missing.length}人</span>}
          {(missing.length > 0 || db.sheetsUrl) && (
            <DownIcon className={`shrink-0 text-[#94A3B8] transition-transform ${showMissing ? "rotate-180" : ""}`} />
          )}
        </button>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div className="h-full bg-accent" style={{ width: `${ratio}%` }} />
        </div>
        {showMissing && (
          <div className="mt-2 flex flex-col gap-1.5">
            {missing.length > 0 && (
              <p className="m-0 text-[13px] leading-[1.6] text-warn-dark">
                <span className="font-bold">未提出：</span>
                {missing.map((m) => m.name).join("、")}
              </p>
            )}
            {db.sheetsUrl && (
              <a href={db.sheetsUrl} target="_blank" rel="noreferrer" className="text-[13px] text-accent underline">
                振り返りのスプレッドシートを開く ↗
              </a>
            )}
          </div>
        )}
      </section>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="名前で探す"
        className="h-11 rounded-xl border border-line bg-white px-4 text-[15px]"
      />

      <section className="overflow-hidden rounded-xl bg-white">
        {query
          ? list.filter((m) => m.name.replace(/\s/g, "").includes(query.replace(/\s/g, ""))).map(row)
          : groups.map(({ g, people }) => (
              <div key={g}>
                <button
                  onClick={() => setOpen(open === g ? "" : g)}
                  aria-expanded={open === g}
                  className="w-full border-b border-hair px-4 py-3 text-left text-sm font-bold"
                >
                  {open === g ? "▼" : "▶"} {g}（{people.length}人）
                </button>
                {open === g && people.map(row)}
              </div>
            ))}
        {query && !list.some((m) => m.name.replace(/\s/g, "").includes(query.replace(/\s/g, ""))) && (
          <p className="m-0 px-4 py-4 text-sm text-muted">見つかりません</p>
        )}
      </section>
    </>
  );
}
