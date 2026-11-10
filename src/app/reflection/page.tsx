"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Card, chipOff, chipOn, PrimaryButton } from "@/components/ui";
import { monthLabel } from "@/lib/dates";
import { reflectionStatus } from "@/lib/derived";
import { writesReflection } from "@/lib/permissions";
import { submitReflection } from "@/lib/store";
import type { DbState, Member } from "@/lib/types";

export default function ReflectionPage() {
  return (
    <SubShell title="月末の振り返り" back="/mypage">
      {(ctx) => <Body {...ctx} />}
    </SubShell>
  );
}

const area = "w-full resize-none rounded-lg border border-line p-2.5 text-[15px]";

function Body({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const r = reflectionStatus(db, me, today);
  const lastGoal = db.goals[`${r.lastMonth}_${me.email}`]?.goal ?? "";
  // 先月の 25 日より後に入部した人は、先月の目標がないので質問 1・2 を飛ばす
  const newcomer = me.createdAt.slice(0, 10) > `${r.lastMonth}-25`;
  const missedLast = !newcomer && !lastGoal;
  const [q1, setQ1] = useState(lastGoal);
  const [q2, setQ2] = useState<number | null>(null);
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [sent, setSent] = useState(false);

  if (!writesReflection(me)) return <p className="text-sm text-sub">振り返りは選手だけが書きます。</p>;
  if (sent || r.submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="m-0 text-lg font-bold">{monthLabel(r.month)}の振り返りを提出しました</p>
        <p className="m-0 text-sm text-sub">来月の目標はメニュー画面の一番上に表示されます。</p>
        <Link href="/" className="text-sm font-bold text-accent underline">
          メニューへ
        </Link>
      </Card>
    );
  }

  const ready = q4.trim() && q3.trim() && (newcomer || (q1.trim() && q2 != null));
  let n = 0;

  return (
    <>
      <p className="m-0 px-1 text-base font-bold">{monthLabel(r.month)}の振り返り</p>
      {missedLast && (
        <section role="alert" className="flex items-start gap-2.5 rounded-xl border-2 border-[#DC2626] bg-[#FEF2F2] px-3.5 py-3">
          <AlertIcon className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="m-0 text-[15px] font-bold text-danger">{monthLabel(r.lastMonth)}の振り返りが未提出です</p>
            <p className="mt-1 mb-0 text-[13px] leading-normal text-[#7F1D1D]">先月の目標が立てられていません。今月こそ目標を決めて、提出しましょう。</p>
          </div>
        </section>
      )}

      {!newcomer && (
        <>
          <Card className="flex flex-col gap-2">
            <label htmlFor="q1" className="text-sm font-bold">
              {++n}. あなたの先月の個人目標は何でしたか？
            </label>
            {missedLast && <p className="m-0 text-xs text-danger">先月の目標が登録されていないため、自分で書いてください</p>}
            <textarea id="q1" rows={2} value={q1} onChange={(e) => setQ1(e.target.value)} className={area} />
          </Card>
          <Card className="flex flex-col gap-2.5">
            <p className="m-0 text-sm font-bold">{++n}. 目標をどのくらい達成できましたか？</p>
            <div role="radiogroup" aria-label="達成度" className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} role="radio" aria-checked={q2 === v} onClick={() => setQ2(v)} className={`h-11 rounded-lg text-base ${q2 === v ? chipOn : chipOff}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-sub">
              <span>達成できなかった</span>
              <span>完璧に達成できた</span>
            </div>
          </Card>
        </>
      )}
      <Card className="flex flex-col gap-2">
        <label htmlFor="q3" className="text-sm font-bold">
          {++n}. 達成できた・できなかった部分や、新しい課題
        </label>
        <textarea id="q3" rows={3} value={q3} onChange={(e) => setQ3(e.target.value)} className={area} />
      </Card>
      <Card className="flex flex-col gap-2">
        <label htmlFor="q4" className="text-sm font-bold">
          {++n}. 来月の個人目標
        </label>
        <textarea id="q4" rows={2} value={q4} onChange={(e) => setQ4(e.target.value)} className={area} />
      </Card>
      <PrimaryButton
        disabled={!ready}
        onClick={async () => {
          await submitReflection(me.email, r.month, newcomer ? "" : q1.trim(), newcomer ? null : q2, q3.trim(), q4.trim());
          setSent(true);
        }}
      >
        提出する（提出後は直せません）
      </PrimaryButton>
    </>
  );
}
