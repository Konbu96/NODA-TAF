"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { chipOff, chipOn, PrimaryButton } from "@/components/ui";
import { dayLabel } from "@/lib/dates";
import { approvedMembers } from "@/lib/derived";
import { isPayer, sortMembers } from "@/lib/grade";
import { liveSeconds, onlyDigits, secondsToDigits, secondsValue } from "@/lib/marks";
import { saveStabro, type StabroInput } from "@/lib/store";
import type { DbState, Member, StabroDistance } from "@/lib/types";

const DISTS: StabroDistance[] = ["30m", "60m", "80m"];
const DEFAULT_RUNS: Record<StabroDistance, number> = { "30m": 2, "60m": 2, "80m": 1 };

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const date = useSearchParams().get("date");
  return (
    <SubShell title="スタブロ" back="/">
      {(ctx) => <Form key={date ?? ctx.today} {...ctx} date={date ?? ctx.today} />}
    </SubShell>
  );
}

function Form({ db, me, today, date }: { db: DbState; me: Member; today: string; date: string }) {
  const day = db.attendance[date] ?? {};
  const people = sortMembers(approvedMembers(db).filter((m) => isPayer(m) && day[m.email]?.going), today);
  const sessions = Object.values(db.stabro).filter((s) => s.date === date);
  const [dist, setDist] = useState<StabroDistance>("30m");
  const [runs, setRuns] = useState<Record<StabroDistance, number>>(() => {
    const r = { ...DEFAULT_RUNS };
    for (const s of sessions) for (const d of DISTS) r[d] = Math.max(r[d], s.runs[d]?.length ?? 0);
    return r;
  });
  // キー：距離|メール|何本目 → 打った数字
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const s of sessions) for (const d of DISTS) (s.runs[d] ?? []).forEach((t, i) => (v[`${d}|${s.memberId}|${i}`] = secondsToDigits(t)));
    return v;
  });
  const router = useRouter();
  const n = runs[dist];

  const save = async () => {
    const input: StabroInput = {};
    const emails = new Set([...people.map((p) => p.email), ...sessions.map((s) => s.memberId)]);
    for (const email of emails) {
      input[email] = {};
      for (const d of DISTS) input[email][d] = Array.from({ length: runs[d] }, (_, i) => secondsValue(vals[`${d}|${email}|${i}`] ?? ""));
    }
    await saveStabro(date, input, me.email);
    router.push("/");
  };

  return (
    <>
      <p className="m-0 text-[15px] font-bold">{dayLabel(date)}</p>
      <div role="tablist" className="grid grid-cols-3 gap-1.5">
        {DISTS.map((d) => (
          <button key={d} role="tab" aria-selected={dist === d} onClick={() => setDist(d)} className={`h-11 rounded-full text-[15px] ${dist === d ? chipOn : chipOff}`}>
            {d}
          </button>
        ))}
      </div>

      <section className="flex flex-col rounded-xl bg-white px-4 pt-2 pb-3">
        <div className="flex h-8 items-center gap-2 text-xs text-muted">
          <span className="grow">競技場に行く人（{people.length}人）</span>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="w-[64px] text-center">
              {i + 1}本目
            </span>
          ))}
        </div>
        {people.length === 0 && <p className="m-0 border-t border-divider py-4 text-sm text-muted">この日に「行く」と答えた人がいません。</p>}
        {people.map((p) => (
          <div key={p.email} className="flex min-h-[52px] items-center gap-2 border-t border-divider">
            <span className="min-w-0 grow truncate text-[15px]">{p.name}</span>
            {Array.from({ length: n }, (_, i) => {
              const key = `${dist}|${p.email}|${i}`;
              return (
                <input
                  key={key}
                  inputMode="numeric"
                  placeholder="0.00"
                  aria-label={`${p.name} ${dist} ${i + 1}本目`}
                  value={liveSeconds(vals[key] ?? "")}
                  onChange={(e) => setVals({ ...vals, [key]: onlyDigits(e.target.value, 4) })}
                  className="h-[42px] w-[64px] shrink-0 rounded-lg border border-line bg-white text-center text-base"
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center justify-center gap-0.5 border-t border-divider pt-1.5">
          <button
            onClick={() => setRuns({ ...runs, [dist]: Math.max(1, n - 1) })}
            aria-label={`${dist} の本数を減らす`}
            className={`h-8 w-8 rounded-lg border bg-transparent text-[15px] ${n > 1 ? "border-[#94A3B8] text-[#94A3B8]" : "border-divider text-[#E2E8F0]"}`}
          >
            −
          </button>
          <span className="min-w-10 text-center text-xs text-[#94A3B8]">{n}本</span>
          <button
            onClick={() => setRuns({ ...runs, [dist]: Math.min(4, n + 1) })}
            aria-label={`${dist} の本数を増やす`}
            className={`h-8 w-8 rounded-lg border bg-transparent text-[15px] ${n < 4 ? "border-[#94A3B8] text-[#94A3B8]" : "border-divider text-[#E2E8F0]"}`}
          >
            ＋
          </button>
        </div>
      </section>

      <PrimaryButton onClick={save}>保存する</PrimaryButton>
    </>
  );
}
