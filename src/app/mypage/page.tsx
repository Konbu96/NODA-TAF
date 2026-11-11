"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DownIcon, NextIcon, PlusIcon } from "@/components/icons";
import { LineChart } from "@/components/LineChart";
import { MoodFace, NoMoodFace } from "@/components/MoodFace";
import { MainShell } from "@/components/Shell";
import { WarmUpText } from "@/components/WarmUpText";
import { Card, Chip, Confirm, Label, PrimaryButton, RefMark, Sheet, EditButton, RoleTag } from "@/components/ui";
import { monthLabel, shortDate } from "@/lib/dates";
import { reflectionStatus } from "@/lib/derived";
import { legalBestIfRef, pbEvents } from "@/lib/pb";
import { gradeOf, ROLE_LABEL } from "@/lib/grade";
import { formatValue, lowerIsBetter, showMark } from "@/lib/marks";
import { isAthlete, writesReflection } from "@/lib/permissions";
import { addWarmUp, logout, saveWarmUpDetail } from "@/lib/store";
import type { DbState, Member } from "@/lib/types";

export default function MyPage() {
  return (
    <MainShell title="マイページ" tab="mypage">
      {(ctx) => <Body {...ctx} />}
    </MainShell>
  );
}

function Body({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const router = useRouter();
  const myEvents = pbEvents(me);
  const [ev, setEv] = useState(myEvents[0] ?? "");
  const pb = me.personalBests.find((p) => p.event === ev);
  const legalMark = legalBestIfRef(db, me, ev)?.mark;
  const legal = legalMark && showMark(legalMark);
  const [askLogout, setAskLogout] = useState(false);
  const mood = db.moods[`${today}_${me.email}`];
  const grade = gradeOf(me.graduationYear, today);
  const athlete = isAthlete(me);
  const runner = athlete && me.role !== "manager";
  const r = reflectionStatus(db, me, today);
  const points = Object.values(db.records)
    .filter((x) => x.memberId === me.email && x.event === ev && !x.isShort)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => ({ date: x.date, value: x.value, label: shortDate(x.date), isRef: x.isWindAssisted }));
  // 大会の記録がなく、手で入れた PB だけのときは、PB を 1 つの点として出す（日付なし）
  const chartPoints = points.length || !pb?.value ? points : [{ date: "", value: pb.value, label: "", isRef: pb.isWindAssisted }];

  return (
    <>
      <Card className="flex items-center gap-3">
        {mood ? <MoodFace kind={mood.mood} size={44} /> : <NoMoodFace size={44} />}
        <div className="grow">
          <p className="m-0 flex items-center gap-2 text-lg font-bold">
            {me.name}
            <RoleTag label={ROLE_LABEL[me.role]} />
          </p>
          <p className="mt-0.5 mb-0 text-[13px] text-sub">{[grade, runner && me.bibNumber && `ゼッケン ${me.bibNumber}`].filter(Boolean).join("・")}</p>
        </div>
        {runner && (
          <EditButton href="/profile/edit" ariaLabel="プロフィールを編集" />
        )}
      </Card>

      {writesReflection(me) && (
        <Card className="flex flex-col gap-2.5">
          <Label>月末の振り返り</Label>
          {r.needed ? (
            <Link href="/reflection" className="flex items-center gap-2.5 rounded-[10px] border-2 border-warn bg-warn-soft px-3.5 py-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warn" />
              <span className="grow text-sm font-bold">{monthLabel(r.month)}の振り返りが届いています</span>
              <NextIcon className="text-warn-dark" />
            </Link>
          ) : (
            <p className="m-0 text-sm text-sub">{monthLabel(r.month)}の振り返りは提出済みです</p>
          )}
          <Link href="/reflections" className="text-sm text-accent underline">
            過去の振り返りを見る
          </Link>
        </Card>
      )}

      {me.role === "manager" && <WarmUpDetails db={db} today={today} />}

      {runner && (
        <Card className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label>PB と記録の推移</Label>
            <div role="tablist" className="flex flex-wrap justify-end gap-1">
              {myEvents.map((e) => (
                <Chip key={e} on={ev === e} onClick={() => setEv(e)} className="h-8">
                  {e}
                </Chip>
              ))}
            </div>
          </div>
          {myEvents.length === 0 ? (
            <p className="m-0 text-sm text-muted">まだ記録がありません。大会の記録を入れるか、右上の ✎ から PB を入れてください。</p>
          ) : (
            <>
              <div>
                <p className="m-0 text-[22px] font-bold text-accent">
                  PB：{pb?.isWindAssisted && <RefMark />}
                  {pb?.mark ? showMark(pb.mark) : "―"}
                </p>
                {legal && <p className="m-0 text-sm font-bold text-muted">公認：{legal}</p>}
              </div>
              <LineChart points={chartPoints} lowerIsBetter={lowerIsBetter(ev)} ariaLabel={`${ev} の記録の推移`} format={(v) => formatValue(ev, v)} />
            </>
          )}
        </Card>
      )}

      {runner && (
        <Card className="flex flex-col gap-2">
          <Label>スタブロのベスト</Label>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["30m", "60m", "80m"] as const).map((d) => (
              <p key={d} className="m-0 text-[15px]">
                <span className="text-sub">{d}：</span>
                <b>{me.stabroBests[d]?.toFixed(2) ?? "―"}</b>
              </p>
            ))}
          </div>
          <Link href="/stabro/graph" className="text-[13px] text-accent underline">
            スタブロのグラフを見る
          </Link>
        </Card>
      )}

      {askLogout ? (
        <Confirm
          danger
          title="ログアウトしますか？"
          okLabel="ログアウト"
          onCancel={() => setAskLogout(false)}
          onOk={async () => {
            await logout();
            router.replace("/login");
          }}
        />
      ) : (
        <button onClick={() => setAskLogout(true)} className="my-3 self-center p-0 text-[13px] leading-none text-muted underline">
          ログアウト
        </button>
      )}
    </>
  );
}

/** マネージャー用の「練習メモ」：アップの中身を折りたたみで並べる（読み上げるときに使う）。ここから追加・編集もできる */
function WarmUpDetails({ db, today }: { db: DbState; today: string }) {
  const [open, setOpen] = useState<string[]>([]);
  // 編集中のもの。name が空なら新しく追加する
  const [edit, setEdit] = useState<null | { name: string; isNew: boolean }>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const todays = db.menus[today]?.warmUp ?? [];
  const names = db.options.warmUps.filter((w) => db.warmUpDetails[w]);
  const toggle = (w: string) => setOpen(open.includes(w) ? open.filter((x) => x !== w) : [...open, w]);
  const newName = name.trim();
  const taken = edit?.isNew && !!db.warmUpDetails[newName];

  const startEdit = (w: string) => {
    setEdit({ name: w, isNew: false });
    setText(db.warmUpDetails[w] ?? "");
  };
  const startAdd = () => {
    setEdit({ name: "", isNew: true });
    setName("");
    setText("");
  };
  const save = async () => {
    if (!edit) return;
    if (edit.isNew) {
      await addWarmUp(newName, text);
      setOpen([...open, newName]);
    } else await saveWarmUpDetail(edit.name, text);
    setEdit(null);
  };

  return (
    <Card className="flex flex-col pb-1">
      <Label className="mb-1">練習メモ</Label>
      {names.length === 0 && <p className="m-0 pb-2.5 text-sm text-muted">練習メモはまだありません。</p>}
      {names.map((w) => (
        <div key={w} className="border-t border-divider">
          <button onClick={() => toggle(w)} aria-expanded={open.includes(w)} className="flex min-h-12 w-full items-center gap-2 text-left text-[15px]">
            <span className="grow font-medium">{w}</span>
            {todays.includes(w) && <span className="rounded-[10px] bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">今日</span>}
            <DownIcon className={`text-[#94A3B8] transition-transform ${open.includes(w) ? "rotate-180" : ""}`} />
          </button>
          {open.includes(w) && (
            <div className="mb-3 flex flex-col gap-2 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
              <WarmUpText text={db.warmUpDetails[w]} />
              <div className="self-end">
                <EditButton small onClick={() => startEdit(w)} label="中身を編集" />
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={startAdd} className="flex min-h-12 items-center gap-1.5 border-t border-divider text-[15px] font-bold text-accent">
        <PlusIcon />
        追加
      </button>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? "練習メモを追加" : (edit?.name ?? "")}>
        {edit?.isNew && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-sub">名前</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ハードルドリル" className="h-11 rounded-[10px] border border-line px-3 text-[15px]" />
            {taken && <span className="text-xs text-danger">同じ名前のものがもうあります</span>}
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-sub">中身</span>
          <span className="text-xs leading-relaxed text-muted">1行に1つ書きます。「・」で始めた行は、一段下げて表示されます。</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={"1. もも上げ 20m\n2. スキップ 20m\n・ゆっくり20 速く20"}
            className="rounded-[10px] border border-line px-3 py-2.5 text-[15px] leading-[1.6]"
          />
          {!edit?.isNew && !text.trim() && <span className="text-xs text-warn-dark">空にして保存すると、練習メモから消えます（メニューの選択肢には残ります）</span>}
        </label>
        <PrimaryButton onClick={save} disabled={edit?.isNew ? !newName || !text.trim() || taken : false}>
          保存する
        </PrimaryButton>
      </Sheet>
    </Card>
  );
}
