"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlainHeader } from "@/components/Shell";
import { chipOff, chipOn, PrimaryButton } from "@/components/ui";
import { GRADES, type Grade } from "@/lib/grade";
import { apply } from "@/lib/store";
import { useApp } from "@/lib/useApp";

export default function ApplyPage() {
  const { email, me, ready } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!email) router.replace("/login");
    else if (me && me.status !== "rejected") router.replace(me.status === "pending" ? "/pending" : "/");
  }, [ready, email, me, router]);

  if (!ready || !email) return null;

  const submit = async () => {
    if (!name.trim() || !grade) return;
    await apply(email, name.trim(), grade);
    router.replace("/pending");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <PlainHeader title="入部申請" />
      <main className="flex grow flex-col gap-5 px-5 py-7">
        <div>
          <p className="m-0 text-xl font-bold">はじめまして</p>
          <p className="mt-2 mb-0 text-sm leading-[1.7] text-sub">名前と学年を入力して申請してください。顧問かキャプテンが承認すると使えるようになります。</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-bold">名前（漢字・フルネーム）</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：野田 太郎"
            className="h-12 rounded-[10px] border border-line bg-white px-3.5 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-bold">学年</p>
          <div role="radiogroup" aria-label="学年" className="grid grid-cols-3 gap-2">
            {GRADES.map((g) => (
              <button key={g} role="radio" aria-checked={grade === g} onClick={() => setGrade(g)} className={`h-11 rounded-[10px] text-[15px] ${grade === g ? chipOn : chipOff}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grow" />
        <PrimaryButton onClick={submit} disabled={!name.trim() || !grade}>
          申請する
        </PrimaryButton>
      </main>
    </div>
  );
}
