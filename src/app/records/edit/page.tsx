"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BigTrophyIcon, CheckIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Card, chipOff, chipOn, PrimaryButton, RefMark, Toast } from "@/components/ui";
import { dayLabel, diffDays } from "@/lib/dates";
import { kindOf, liveMark, liveWind, markToDigits, onlyDigits, parseMark, WIND_EVENTS, windValue } from "@/lib/marks";
import { canEditRecordsOf } from "@/lib/permissions";
import { saveRecords, type PbUpdate, type RecordInput } from "@/lib/store";
import type { DbState, Meet, Member } from "@/lib/types";

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const meetId = params.get("meet") ?? "";
  const memberParam = params.get("member");
  return (
    <SubShell title="記録の入力" back={meetId ? `/meets/detail?id=${meetId}` : "/meets"}>
      {(ctx) => {
        const meet = ctx.db.meets[meetId];
        if (!meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        const target = ctx.db.members[memberParam ?? ctx.me.email];
        if (!target) return <p className="text-sm text-sub">部員が見つかりません。</p>;
        if (!canEditRecordsOf(ctx.me, target.email)) return <p className="text-sm text-sub">この人の記録は直せません。</p>;
        if (diffDays(ctx.today, meet.startDate) < 0) return <p className="text-sm text-sub">記録は大会の日から入力できます。</p>;
        return <Form key={target.email} {...ctx} meet={meet} target={target} />;
      }}
    </SubShell>
  );
}

function Form({ db, me, meet, target }: { db: DbState; me: Member; today: string; meet: Meet; target: Member }) {
  const existing = Object.values(db.records).filter((r) => r.memberId === target.email && r.meetId === meet.id);
  const entered = db.entries[meet.id]?.[target.email]?.events ?? [];
  const events = [...new Set([...entered, ...existing.map((r) => r.event)])];
  const [tab, setTab] = useState(0);
  const [inputs, setInputs] = useState<RecordInput[]>(() =>
    events.map((event) => {
      const r = existing.find((x) => x.event === event);
      return {
        event,
        digits: r ? markToDigits(r.mark) : "",
        windDigits: r?.wind != null ? String(Math.round(Math.abs(r.wind) * 10)) : "",
        minus: r?.wind != null && r.wind < 0,
      };
    }),
  );
  const [pbs, setPbs] = useState<PbUpdate[] | null>(null);
  const [toast, setToast] = useState(false);

  if (events.length === 0) {
    return (
      <Card>
        <p className="m-0 text-sm text-sub">この大会にエントリーした種目がありません。先にエントリーを入力してください。</p>
        <Link href={`/meets/entry?id=${meet.id}${target.email !== me.email ? `&member=${encodeURIComponent(target.email)}` : ""}`} className="mt-2 block text-sm text-accent underline">
          エントリーを入力する
        </Link>
      </Card>
    );
  }

  const set = (i: number, p: Partial<RecordInput>) => setInputs(inputs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const cur = inputs[tab];
  const parsed = parseMark(cur.event, cur.digits);
  const hasWind = WIND_EVENTS.includes(cur.event);
  const w = windValue(cur.windDigits, cur.minus);
  const isRef = w != null && w > 2.0;

  return (
    <>
      <Card className="flex flex-col gap-0.5">
        <p className="m-0 text-[17px] font-bold">{meet.name}</p>
        <p className="m-0 text-[13px] text-sub">{dayLabel(meet.startDate)}</p>
        {target.email !== me.email && <p className="mt-1 mb-0 text-sm font-bold">{target.name} さんの記録</p>}
      </Card>

      <div role="tablist" aria-label="種目" className="flex gap-1.5">
        {inputs.map((x, i) => (
          <button
            key={x.event}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[15px] ${tab === i ? chipOn : chipOff}`}
          >
            {x.event}
            {parseMark(x.event, x.digits) && <CheckIcon />}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            記録
            <span className="flex items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="数字のみ入力"
                value={liveMark(cur.event, cur.digits)}
                onChange={(e) => set(tab, { digits: onlyDigits(e.target.value) })}
                className="h-12 w-[150px] rounded-lg border border-line bg-white px-3 text-left text-xl font-bold tracking-[0.04em] placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
              />
              <span className="text-base font-bold">{kindOf(cur.event) === "distance" ? "m" : kindOf(cur.event) === "points" ? "点" : ""}</span>
            </span>
          </label>
          {parsed && <p className="m-0 text-[11px] text-[#94A3B8]">{parsed.mark} として保存します</p>}
        </div>

        {hasWind && (
          <div className="flex flex-col gap-1.5">
            <p className="m-0 text-[13px] font-bold">風速</p>
            <div className="flex items-center gap-1.5">
              <div role="radiogroup" aria-label="追い風か向かい風か" className="flex gap-1">
                <button onClick={() => set(tab, { minus: false })} aria-label="追い風（プラス）" className={`h-12 w-11 rounded-lg text-lg font-bold ${cur.minus ? chipOff : chipOn}`}>
                  +
                </button>
                <button onClick={() => set(tab, { minus: true })} aria-label="向かい風（マイナス）" className={`h-12 w-11 rounded-lg text-lg font-bold ${cur.minus ? chipOn : chipOff}`}>
                  −
                </button>
              </div>
              <input
                inputMode="numeric"
                placeholder="数字のみ入力"
                aria-label="風速"
                value={liveWind(cur.windDigits)}
                onChange={(e) => set(tab, { windDigits: onlyDigits(e.target.value, 3) })}
                className="h-12 w-[120px] rounded-lg border border-line bg-white px-3 text-left text-lg font-bold placeholder:text-sm placeholder:font-normal"
              />
              <span className="text-[15px]">m</span>
              {isRef && <RefMark />}
            </div>
            {w != null && (
              <p className="m-0 text-[11px] text-[#94A3B8]">
                {w >= 0 ? "+" : "−"}
                {Math.abs(w).toFixed(1)}m として保存します{isRef ? "（追い風参考）" : ""}
              </p>
            )}
          </div>
        )}
        {existing.some((r) => r.event === cur.event) && (
          <p className="m-0 text-[11px] text-muted">記録を消したいときは、欄を空にして保存してください。</p>
        )}
      </Card>

      <p className="m-0 text-center text-[11px] text-[#94A3B8]">予選・決勝などで何本か走ったときは、一番良い記録だけ入れてください</p>

      <PrimaryButton
        onClick={async () => {
          const res = await saveRecords(meet, target.email, inputs, me.email);
          if (res.length) setPbs(res);
          else setToast(true);
        }}
      >
        保存する
      </PrimaryButton>

      {toast && <Toast text="記録を保存しました" link={{ href: `/meets/detail?id=${meet.id}`, label: "大会へ" }} onDone={() => setToast(false)} />}

      {pbs && (
        <div className="fixed inset-0 z-50 mx-auto max-w-[480px]">
          <div className="anim-fade absolute inset-0 bg-ink/50" />
          <section role="dialog" aria-label="PB 更新" className="absolute inset-x-7 top-[200px] flex flex-col items-center gap-2.5 rounded-[20px] bg-white px-5 pt-7 pb-5 text-center">
            <BigTrophyIcon className="text-warn" />
            <p className="m-0 text-[26px] font-bold text-warn">PB 更新！</p>
            {pbs.map((p) => (
              <div key={p.event}>
                <p className="m-0 text-base font-bold">
                  {p.event}　{p.isWindAssisted && <RefMark small />}
                  {p.mark}
                </p>
                {p.diff != null && (
                  <p className="m-0 text-sm text-sub">
                    前の PB から {p.diff > 0 ? "+" : "−"}
                    {kindOf(p.event) === "points" ? `${Math.round(Math.abs(p.diff))}点` : kindOf(p.event) === "distance" ? `${Math.abs(p.diff).toFixed(2)}m` : `${Math.abs(p.diff).toFixed(2)} 秒`}
                  </p>
                )}
              </div>
            ))}
            <Link href={`/meets/detail?id=${meet.id}`} className="mt-2.5 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-white">
              OK
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
