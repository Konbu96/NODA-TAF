"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Label } from "@/components/ui";
import { canEditMenu } from "@/lib/permissions";
import { saveOptions } from "@/lib/store";
import type { DbState, PracticeOptions } from "@/lib/types";

// 他の機能とつながっているので消せない選択肢
const FIXED = ["学校", "競技場", "専門", "スタブロ"];

const GROUPS: { key: keyof PracticeOptions; name: string }[] = [
  { key: "places", name: "場所" },
  { key: "warmUps", name: "アップ" },
  { key: "types", name: "練習の種類" },
  { key: "distances", name: "距離" },
];

export default function OptionsPage() {
  return (
    <SubShell title="選択肢" back="/">
      {(ctx) => (canEditMenu(ctx.me) ? <Body db={ctx.db} /> : <p className="text-sm text-sub">選択肢を直せるのは担当者だけです。</p>)}
    </SubShell>
  );
}

function Body({ db }: { db: DbState }) {
  const [adding, setAdding] = useState<keyof PracticeOptions | null>(null);
  const [draft, setDraft] = useState("");
  const o = db.options;

  const add = (k: keyof PracticeOptions) => {
    const v = draft.trim();
    if (v && !o[k].includes(v)) saveOptions({ ...o, [k]: [...o[k], v] });
    setAdding(null);
    setDraft("");
  };

  return (
    <>
      {GROUPS.map(({ key, name }) => (
        <section key={key} className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3.5">
          <Label>{name}</Label>
          <div className="flex flex-wrap gap-1.5">
            {o[key].map((v) => (
              <span key={v} className={`inline-flex h-9 items-center rounded-full border border-line bg-white text-[13px] text-[#334155] ${FIXED.includes(v) ? "px-3" : "pr-1 pl-3"}`}>
                {v}
                {!FIXED.includes(v) && (
                  <button
                    onClick={() => saveOptions({ ...o, [key]: o[key].filter((x) => x !== v) })}
                    aria-label={`${v} を消す`}
                    className="flex h-7 w-7 items-center justify-center text-[#94A3B8]"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </span>
            ))}
            {adding === key ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  add(key);
                }}
                className="inline-flex items-center gap-1"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="名前を入れる"
                  className="h-9 w-[150px] rounded-full border-[1.5px] border-accent px-3 text-[13px]"
                />
                <button type="submit" className="h-9 rounded-full bg-accent px-3 text-[13px] font-bold text-white">
                  追加
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setAdding(key);
                  setDraft("");
                }}
                className="h-9 rounded-full border border-dashed border-[#93C5FD] bg-[#F8FAFC] px-3 text-[13px] font-bold text-accent"
              >
                ＋ 追加
              </button>
            )}
          </div>
        </section>
      ))}
    </>
  );
}
