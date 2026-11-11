"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CloseIcon, NextIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Label, PrimaryButton, Sheet } from "@/components/ui";
import { canEditMenu } from "@/lib/permissions";
import { saveOptions, saveWarmUpDetail } from "@/lib/store";
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
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  // メニューの編集から来たときは、その日のメニューの編集に戻る
  const date = useSearchParams().get("date");
  return (
    <SubShell title="メニューの種類" back={date ? `/menu/edit?date=${date}` : "/"}>
      {(ctx) => (canEditMenu(ctx.me) ? <Body db={ctx.db} /> : <p className="text-sm text-sub">メニューの種類を直せるのは担当者だけです。</p>)}
    </SubShell>
  );
}

function Body({ db }: { db: DbState }) {
  const [adding, setAdding] = useState<keyof PracticeOptions | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
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
                    onClick={() => {
                      saveOptions({ ...o, [key]: o[key].filter((x) => x !== v) });
                      if (key === "warmUps") saveWarmUpDetail(v, "");
                    }}
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
          {key === "warmUps" && o.warmUps.length > 0 && (
            <div className="mt-1 flex flex-col">
              <p className="m-0 text-xs text-muted">中身を書いておくと、メニュー画面で押したときに開きます</p>
              {o.warmUps.map((w) => {
                const lines = (db.warmUpDetails[w] ?? "").split("\n").filter((l) => l.trim()).length;
                return (
                  <button
                    key={w}
                    onClick={() => {
                      setEditing(w);
                      setDetail(db.warmUpDetails[w] ?? "");
                    }}
                    className="flex min-h-11 items-center gap-2 border-t border-hair text-left text-[14px]"
                  >
                    <span className="grow">{w}</span>
                    <span className={`text-xs ${lines ? "text-sub" : "text-muted"}`}>{lines ? `中身 ${lines}行` : "中身なし"}</span>
                    <NextIcon className="text-line" />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={`${editing ?? ""} の中身`}>
        <p className="m-0 text-xs leading-relaxed text-muted">1行に1つ書きます。「・」で始めた行は、一段下げて表示されます。</p>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={12}
          placeholder={"1. もも上げ 20m\n2. スキップ 20m\n・ゆっくり20 速く20"}
          className="rounded-[10px] border border-line px-3 py-2.5 text-[15px] leading-[1.6]"
        />
        <PrimaryButton
          onClick={async () => {
            if (editing) await saveWarmUpDetail(editing, detail);
            setEditing(null);
          }}
        >
          保存する
        </PrimaryButton>
      </Sheet>
    </>
  );
}
