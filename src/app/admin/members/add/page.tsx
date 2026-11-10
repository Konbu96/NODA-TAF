"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Card, Chip, chipOff, chipOn, Label, PrimaryButton, Sheet, Toast } from "@/components/ui";
import { GRADES, ROLE_LABEL, type Grade } from "@/lib/grade";
import { EVENT_GROUPS, onlyDigits } from "@/lib/marks";
import { canApprove, canChangeRole } from "@/lib/permissions";
import { addMember } from "@/lib/store";
import type { DbState, Member, Role } from "@/lib/types";

/** 顧問・開発者が、部員を 1 人ずつ名簿に登録する画面 */
export default function Page() {
  return (
    <SubShell title="部員を登録" back="/admin/members">
      {(ctx) => (canApprove(ctx.me) ? <Form {...ctx} /> : <p className="text-sm text-sub">ここを使えるのは顧問・キャプテン・マネージャーだけです。</p>)}
    </SubShell>
  );
}

const ROLES: Role[] = ["member", "captain", "viceCaptain", "manager", "adviser"];
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const GENDERS = ["男", "女"];
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function Form({ db, me }: { db: DbState; me: Member; today: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [role, setRole] = useState<Role>("member");
  const [bib, setBib] = useState("");
  const [gender, setGender] = useState("");
  const [restDay, setRestDay] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState("");

  const mail = email.trim().toLowerCase();
  const adviser = role === "adviser";
  const athlete = !adviser && role !== "manager";
  const taken = !!db.members[mail];
  const emailBad = !!mail && !looksLikeEmail(mail);
  const ready = !!name.trim() && looksLikeEmail(mail) && !taken && (adviser || !!grade);
  const count = Object.values(db.members).filter((m) => m.status === "approved").length;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    await addMember(mail, {
      name: name.trim(),
      grade: adviser ? null : grade,
      role,
      bibNumber: athlete ? bib : "",
      gender: adviser ? "" : gender,
      restDay: adviser ? "" : restDay,
      events: athlete ? events : [],
    });
    setBusy(false);
    setAdded(name.trim());
    // 次の人を続けて入れられるように空にする（学年と役職はそのまま）
    setName("");
    setEmail("");
    setBib("");
    setGender("");
    setRestDay("");
    setEvents([]);
  };

  return (
    <>
      <p className="m-0 px-1 text-[13px] leading-relaxed text-sub">
        登録した人は、同じメールアドレスでアカウントを作ると、承認なしですぐ使えます。名簿にいるのは今 {count} 人です。
      </p>

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <Label>名前（漢字・フルネーム）</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：野田 太郎" className="h-11 rounded-[10px] border border-line px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1.5">
          <Label>メールアドレス（ログインに使うもの）</Label>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例：taro@gmail.com"
            className="h-11 rounded-[10px] border border-line px-3 text-base"
          />
          {taken && <span className="text-xs text-danger">このメールアドレスの人は、もう名簿にいます（{db.members[mail].name}）</span>}
          {emailBad && <span className="text-xs text-danger">メールアドレスの書き方を確かめてください</span>}
        </label>
      </Card>

      <Card className="flex flex-col gap-2">
        <Label>役職</Label>
        <div className="flex flex-wrap gap-1.5">
          {/* 顧問を登録できるのは顧問・開発者だけ */}
          {ROLES.filter((r) => r !== "adviser" || canChangeRole(me)).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={`h-9 rounded-full px-3.5 text-[13px] ${role === r ? chipOn : chipOff}`}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Card>

      {!adviser && (
        <Card className="flex flex-col gap-2">
          <Label>学年</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {GRADES.map((g) => (
              <button key={g} onClick={() => setGrade(g)} className={`h-10 rounded-[10px] text-sm ${grade === g ? chipOn : chipOff}`}>
                {g}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 顧問は、ゼッケン・性別・休みの曜日を入れない */}
      {!adviser && (
        <Card className="flex flex-col gap-3">
          {athlete && (
            <label className="flex flex-col gap-1.5">
              <Label>ゼッケン</Label>
              <input
                inputMode="numeric"
                value={bib}
                onChange={(e) => setBib(onlyDigits(e.target.value, 5))}
                className="h-11 w-[120px] rounded-[10px] border border-line px-3 text-base"
              />
            </label>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>性別</Label>
            <div className="flex gap-1.5">
              {GENDERS.map((g) => (
                <Chip key={g} on={gender === g} onClick={() => setGender(gender === g ? "" : g)} className="w-14">
                  {g}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>休みの曜日</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => (
                <Chip key={d} on={restDay === `${d}曜日`} onClick={() => setRestDay(restDay === `${d}曜日` ? "" : `${d}曜日`)} className="w-11">
                  {d}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      )}

      {athlete && (
        <Card className="flex flex-col gap-1">
          <Label className="mb-1">専門種目</Label>
          <p className="mt-0 mb-1 text-[11px] text-muted">PB は、登録したあとに部員のページの ✎ から入れられます。</p>
          {events.map((ev) => (
            <div key={ev} className="flex min-h-11 items-center border-t border-hair">
              <b className="grow text-[15px]">{ev}</b>
              <button onClick={() => setEvents(events.filter((x) => x !== ev))} aria-label={`${ev} を外す`} className="flex h-9 w-9 items-center justify-center text-[#94A3B8]">
                <CloseIcon />
              </button>
            </div>
          ))}
          <button onClick={() => setSheet(true)} className="mt-1.5 h-11 rounded-[10px] border border-dashed border-[#93C5FD] bg-[#F8FAFC] text-sm font-bold text-accent">
            ＋ 種目を選ぶ
          </button>
        </Card>
      )}

      <PrimaryButton onClick={save} disabled={!ready || busy}>
        {busy ? "登録しています…" : "名簿に登録する"}
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

      {added && <Toast text={`${added} を登録しました`} link={{ href: "/admin/members", label: "名簿へ" }} onDone={() => setAdded("")} />}
    </>
  );
}
