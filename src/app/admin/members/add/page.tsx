"use client";

import { useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Chip, chipOff, chipOn, Label, PrimaryButton, Toast } from "@/components/ui";
import { GRADES, ROLE_LABEL, type Grade } from "@/lib/grade";
import { onlyDigits } from "@/lib/marks";
import { canApprove, canChangeRole } from "@/lib/permissions";
import { addMember } from "@/lib/store";
import type { DbState, Member, Role } from "@/lib/types";

/** 顧問・開発者が、部員を 1 人ずつ名簿に登録する画面 */
export default function Page() {
  return (
    <SubShell title="部員を登録" back="/members">
      {(ctx) => (canApprove(ctx.me) ? <Form {...ctx} /> : <p className="text-sm text-sub">ここを使えるのは顧問・キャプテン・マネージャーだけです。</p>)}
    </SubShell>
  );
}

const ROLES: Role[] = ["member", "captain", "viceCaptain", "manager", "adviser"];
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function Form({ db, me }: { db: DbState; me: Member; today: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [role, setRole] = useState<Role>("member");
  const [bib, setBib] = useState("");
  const [restDay, setRestDay] = useState("");
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
      gender: "",
      restDay: adviser ? "" : restDay,
      events: [],
    });
    setBusy(false);
    setAdded(name.trim());
    // 次の人を続けて入れられるように空にする（学年と役職はそのまま）
    setName("");
    setEmail("");
    setBib("");
    setRestDay("");
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

      {/* 顧問は、ゼッケン・休みの曜日を入れない */}
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
            <Label>休みの曜日</Label>
            {/* 7 つを 1 段に、画面のはばに合わせて並べる */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <Chip key={d} on={restDay === `${d}曜日`} onClick={() => setRestDay(restDay === `${d}曜日` ? "" : `${d}曜日`)} className="w-full justify-center px-0">
                  {d}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      )}

      <PrimaryButton onClick={save} disabled={!ready || busy}>
        {busy ? "登録しています…" : "名簿に登録する"}
      </PrimaryButton>

      {added && <Toast text={`${added} を登録しました`} link={{ href: "/members", label: "部員へ" }} onDone={() => setAdded("")} />}
    </>
  );
}
