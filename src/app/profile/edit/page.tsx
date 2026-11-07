"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Label, PrimaryButton, Sheet, Toast } from "@/components/ui";
import { gradeOf } from "@/lib/grade";
import { EVENT_GROUPS, liveMark, markToDigits, onlyDigits, parseMark } from "@/lib/marks";
import { canEditProfileOf } from "@/lib/permissions";
import { saveProfile } from "@/lib/store";
import type { DbState, Member } from "@/lib/types";

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
  return (
    <SubShell title="プロフィール" back={id ? `/members/detail?id=${encodeURIComponent(id)}` : "/mypage"}>
      {({ db, me, today }) => {
        const target = db.members[id || me.email];
        if (!target) return <p className="text-sm text-sub">部員が見つかりません。</p>;
        if (!canEditProfileOf(me, target.email)) return <p className="text-sm text-sub">この人のプロフィールは直せません。</p>;
        return <Form key={target.email} db={db} target={target} me={me} today={today} />;
      }}
    </SubShell>
  );
}

function Form({ target, me, today }: { db: DbState; target: Member; me: Member; today: string }) {
  const [bib, setBib] = useState(target.bibNumber);
  const [events, setEvents] = useState<string[]>(target.events);
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(target.personalBests.filter((p) => p.manualMark).map((p) => [p.event, markToDigits(p.manualMark)])),
  );
  const [sheet, setSheet] = useState(false);
  const [saved, setSaved] = useState(false);
  const self = me.email === target.email;

  return (
    <>
      <section className="px-1 py-0.5">
        <p className="m-0 text-lg font-bold">{target.name}</p>
        <p className="mt-0.5 mb-0 text-[13px] text-muted">{gradeOf(target.graduationYear, today)}</p>
      </section>

      <Card className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <Label>ゼッケン</Label>
          <input
            inputMode="numeric"
            value={bib}
            onChange={(e) => setBib(onlyDigits(e.target.value, 5))}
            className="h-11 w-[120px] rounded-[10px] border border-line px-3 text-base"
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-1">
        <Label className="mb-1">専門種目と PB</Label>
        <p className="mt-0 mb-1 text-[11px] text-muted">PB はアプリを使い始める前のベストを入れてください。大会の記録を入れると自動で更新されます。</p>
        {events.map((ev) => {
          const d = raw[ev] ?? "";
          const parsed = parseMark(ev, d);
          const recordPb = target.personalBests.find((p) => p.event === ev && p.recordId);
          return (
            <div key={ev} className="flex min-h-14 items-center gap-2.5 border-t border-hair py-1.5">
              <b className="w-16 shrink-0 text-[15px]">{ev}</b>
              <div className="flex grow flex-col gap-0.5">
                <input
                  inputMode="numeric"
                  placeholder="数字のみ入力"
                  value={liveMark(ev, d)}
                  onChange={(e) => setRaw({ ...raw, [ev]: onlyDigits(e.target.value) })}
                  aria-label={`${ev} の PB`}
                  className="h-11 w-full rounded-[10px] border border-line px-3 text-base"
                />
                {parsed && <span className="text-xs text-muted">{parsed.mark} として保存します</span>}
                {recordPb && <span className="text-xs text-accent">大会の PB：{recordPb.mark}</span>}
              </div>
              <button onClick={() => setEvents(events.filter((x) => x !== ev))} aria-label={`${ev} を外す`} className="flex h-9 w-9 items-center justify-center text-[#94A3B8]">
                <CloseIcon />
              </button>
            </div>
          );
        })}
        <button onClick={() => setSheet(true)} className="mt-1.5 h-11 rounded-[10px] border border-dashed border-[#93C5FD] bg-[#F8FAFC] text-sm font-bold text-accent">
          ＋ 種目を選ぶ
        </button>
      </Card>

      <PrimaryButton
        onClick={async () => {
          await saveProfile(target.email, bib, events, raw);
          setSaved(true);
        }}
      >
        保存する
      </PrimaryButton>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="専門種目">
        {EVENT_GROUPS.map((g) => (
          <div key={g.name}>
            <p className="mt-0 mb-1.5 text-xs font-bold text-sub">{g.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.events.map((e) => (
                <Chip key={e} small on={events.includes(e)} onClick={() => setEvents(events.includes(e) ? events.filter((x) => x !== e) : [...events, e])}>
                  {e}
                </Chip>
              ))}
            </div>
          </div>
        ))}
        <PrimaryButton onClick={() => setSheet(false)}>決定</PrimaryButton>
      </Sheet>

      {saved && (
        <Toast
          text="保存しました"
          link={self ? { href: "/mypage", label: "マイページへ" } : { href: `/members/detail?id=${encodeURIComponent(target.email)}`, label: "部員のページへ" }}
          onDone={() => setSaved(false)}
        />
      )}
    </>
  );
}
