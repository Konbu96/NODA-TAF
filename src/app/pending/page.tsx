"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertIcon, HourglassIcon } from "@/components/icons";
import { PlainHeader } from "@/components/Shell";
import { PrimaryButton } from "@/components/ui";
import { gradeOf } from "@/lib/grade";
import { logout, removeMember } from "@/lib/store";
import { useApp } from "@/lib/useApp";

export default function PendingPage() {
  const { email, me, ready, today } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!email) router.replace("/login");
    else if (!me) router.replace("/apply");
    else if (me.status === "approved") router.replace("/");
  }, [ready, email, me, router]);

  if (!me || me.status === "approved") return null;
  const rejected = me.status === "rejected";

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <PlainHeader />
      <main className="flex grow flex-col justify-center gap-[22px] px-6 pt-6 pb-10">
        {rejected ? (
          <>
            <div className="flex flex-col items-center gap-3.5 text-center">
              <AlertIcon size={64} className="text-danger" />
              <h1 className="m-0 text-[22px] font-bold">申請が通りませんでした</h1>
              <p className="m-0 text-sm leading-[1.7] text-sub">
                名前や学年に間違いがないか確認して、
                <br />
                もう一度申請してください。
              </p>
            </div>
            <PrimaryButton
              onClick={async () => {
                await removeMember(me.email);
                router.replace("/apply");
              }}
            >
              もう一度申請する
            </PrimaryButton>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3.5 text-center">
              <HourglassIcon className="text-accent" />
              <h1 className="m-0 text-[22px] font-bold">承認待ちです</h1>
              <p className="m-0 text-sm leading-[1.7] text-sub">
                顧問かキャプテンが承認すると、
                <br />
                アプリが使えるようになります。
              </p>
            </div>
            <section className="overflow-hidden rounded-xl border border-divider bg-white">
              <p className="m-0 px-4 pt-3 pb-1 text-xs font-bold text-sub">申請した内容</p>
              <div className="flex justify-between px-4 py-2 text-[15px]">
                <span className="text-sub">名前</span>
                <span className="font-bold">{me.name}</span>
              </div>
              <div className="flex justify-between px-4 pt-2 pb-3 text-[15px]">
                <span className="text-sub">学年</span>
                <span className="font-bold">{gradeOf(me.graduationYear, today) ?? "―"}</span>
              </div>
            </section>
          </>
        )}
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="self-center text-xs text-muted underline"
        >
          ログアウト
        </button>
      </main>
    </div>
  );
}
