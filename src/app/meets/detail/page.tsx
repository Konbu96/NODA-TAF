"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Label, PbTag, PrimaryLink, RefMark, EditButton } from "@/components/ui";
import { rangeLabel } from "@/lib/dates";
import { isMeetOver, isMeetStarted, missingRecords } from "@/lib/derived";
import { sortMembers } from "@/lib/grade";
import { ALL_EVENTS, heatLaneParts, windLabel, showMark } from "@/lib/marks";
import { canEditMenu, hasEvents, isAthlete, showResultEditOf } from "@/lib/permissions";
import type { DbState, Entry, Meet, Member, RecordDoc } from "@/lib/types";

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

const sortedEvents = (e: Entry) => [...e.events].sort((a, b) => eventOrder(a) - eventOrder(b));

/** 見出しの「あなた：」には種目名だけ */
const entryText = (e: Entry) => sortedEvents(e).join("、");

/** 名前の右に、種目を 1 つずつ。組・レーンと時間は下に分けて、ラベルを付ける。結果があれば種目の右に出す */
function EntryLines({ events, entry, meet, results, showPlace = true, isMe = false }: {
  events: string[];
  entry?: Entry;
  meet: Meet;
  /** 大会が始まっていれば、その人の記録（始まっていなければ null） */
  results?: RecordDoc[] | null;
  showPlace?: boolean;
  isMe?: boolean;
}) {
  return (
    <div className="flex min-w-0 grow flex-col gap-4 text-[#334155]">
      {events.map((ev) => {
        const { place, call, start } = heatLaneParts(entry?.lanes?.[ev], meet.eventTimes?.[ev]);
        const r = results?.find((x) => x.event === ev);
        return (
          <div key={ev} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold">{ev}</span>
              {results &&
                (r ? (
                  <span className="flex items-center gap-1 text-[#0f172a]">
                    {r.isWindAssisted && <RefMark small />}
                    {showMark(r.mark)}
                    {r.wind != null && `（${windLabel(r.wind)}）`}
                    {r.isPB && <PbTag />}
                  </span>
                ) : (
                  <span className={isMe ? "text-warn-dark" : "text-muted"}>未入力</span>
                ))}
            </div>
            {showPlace && place.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {place.map((p) => (
                  <span key={p} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-[#334155]">
                    {p}
                  </span>
                ))}
              </div>
            )}
            {showPlace && (call || start) && (
              <div className="flex flex-col gap-1 text-xs">
                {call && <TimeItem label="招集" time={call} />}
                {start && <TimeItem label="競技開始" time={start} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimeItem({ label, time }: { label: string; time: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="w-14 text-muted">{label}</span>
      <span className="text-sm font-bold tabular-nums text-[#0f172a]">{time}</span>
    </span>
  );
}

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
  // 大会当日は、エントリー（組・時間）と結果の両方を出す
  const started = isMeetStarted(meet, today);
  const entries = db.entries[meet.id] ?? {};
  const records = Object.values(db.records).filter((r) => r.meetId === meet.id);
  // 人ごとに並べる（エントリーした人と、記録がある人）
  const people = sortMembers(
    [...new Set([...Object.keys(entries), ...records.map((r) => r.memberId)])].map((e) => db.members[e]).filter(Boolean),
    today,
  );
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

      {/* エントリーと結果をひとつの欄に。大会が始まったら、種目の右に記録が出る */}
      <Card className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Label className="grow">
            {started ? "エントリー・結果" : "エントリー"}（{people.length}人）
          </Label>
          {/* マネージャー・顧問などは、全員の記録をまとめて直せる */}
          {started && people.some((m) => m.email !== me.email && showResultEditOf(me, m.email)) && (
            <EditButton small href={`/meets/results?id=${meet.id}`} label="結果をまとめて編集" ariaLabel="みんなの記録をまとめて編集" />
          )}
        </div>
        {mine && <p className="m-0 text-xs font-bold text-ok">あなた：{entryText(mine)}</p>}
        {people.length === 0 && <p className="m-0 text-sm text-muted">まだいません</p>}
        {people.map((m, i) => {
          const list = records.filter((r) => r.memberId === m.email);
          const evs = [...new Set([...(entries[m.email]?.events ?? []), ...list.map((r) => r.event)])].sort(byOrder);
          return (
            <div key={m.email} className={`flex gap-3 text-sm ${i ? "border-t border-divider pt-4" : ""}`}>
              <span className="w-24 shrink-0 font-bold">
                {editor ? (
                  <Link href={`/meets/entry?id=${meet.id}&member=${encodeURIComponent(m.email)}`} className="underline decoration-line">
                    {m.email === me.email ? "あなた" : m.name}
                  </Link>
                ) : m.email === me.email ? (
                  "あなた"
                ) : (
                  m.name
                )}
              </span>
              <EntryLines events={evs} entry={entries[m.email]} meet={meet} results={started ? list : null} showPlace={!over} isMe={m.email === me.email} />
            </div>
          );
        })}

        {/* ボタンは、することごとに分ける */}
        <div className="mt-1 flex flex-col gap-2.5">
          {started && mine && (
            <PrimaryLink href={`/meets/entry?id=${meet.id}`}>{missing.length || !records.some((r) => r.memberId === me.email) ? "自分の記録を入力する" : "自分の記録を直す"}</PrimaryLink>
          )}
          {!over && isAthlete(me) && me.role !== "manager" && (
            <Link href={`/meets/entry?id=${meet.id}`} className="flex h-12 items-center justify-center rounded-xl border-2 border-accent bg-white text-[15px] font-bold text-accent">
              {mine ? "自分のエントリー・組を直す" : "自分のエントリーを入力"}
            </Link>
          )}
          {/* 種目ごとの招集・競技開始の時間を、全部の種目まとめて入れる */}
          {!over && (mine || editor) && Object.keys(entries).length > 0 && (
            <Link href={`/meets/times?id=${meet.id}`} className="flex h-12 items-center justify-center rounded-xl border-2 border-accent bg-white text-[15px] font-bold text-accent">
              種目の時間を入力
            </Link>
          )}
        </div>
      </Card>

      {/* 開発者だけ：大会の前でも後でも、だれのエントリーでも入力・修正できる */}
      {me.isAdmin && <AdminEntries db={db} meet={meet} today={today} />}
    </>
  );
}

/** 開発者用：部員全員のエントリーを一覧にして、名前から直せる（まだの人も入力できる） */
function AdminEntries({ db, meet, today }: { db: DbState; meet: Meet; today: string }) {
  const entries = db.entries[meet.id] ?? {};
  const athletes = sortMembers(
    Object.values(db.members).filter((m) => m.status === "approved" && hasEvents(m)),
    today,
  );
  return (
    <Card className="flex flex-col gap-2.5">
      <Label>エントリーを編集（開発者）</Label>
      {athletes.map((m, i) => {
        const q = `id=${meet.id}&member=${encodeURIComponent(m.email)}`;
        return (
          <div key={m.email} className={`flex items-start gap-3 text-sm ${i ? "border-t border-divider pt-4" : ""}`}>
            <Link href={`/meets/entry?${q}`} className="flex min-w-0 grow gap-3">
              <span className="w-24 shrink-0 font-bold underline decoration-line">{m.name}</span>
              {entries[m.email] ? <EntryLines events={sortedEvents(entries[m.email])} entry={entries[m.email]} meet={meet} /> : <span className="text-muted">なし</span>}
            </Link>
          </div>
        );
      })}
    </Card>
  );
}
