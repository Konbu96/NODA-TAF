"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/grade";
import { authErrorText, sendReset, USE_FIREBASE } from "@/lib/firebase";
import { getDb, login, resetDemo, signInWithEmail } from "@/lib/store";
import { useApp } from "@/lib/useApp";

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const { db } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [noAccount, setNoAccount] = useState(params.get("noAccount") === "1");
  const [picker, setPicker] = useState<null | "login" | "create">(null);
  const [typed, setTyped] = useState("");

  // 本番はメールアドレスとパスワードの画面、お試し版はアカウントを選ぶ画面を出す
  const [authMode, setAuthMode] = useState<null | "login" | "create">(null);
  const open = (mode: "login" | "create") => (USE_FIREBASE ? setAuthMode(mode) : setPicker(mode));

  // お試し版：選んだアカウントで入る
  const choose = async (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email || !db) return;
    const member = db.members[email];
    const mode = picker;
    setPicker(null);
    setTyped("");
    if (mode === "login") {
      if (!member) {
        setNoAccount(true);
        return;
      }
      await login(email);
      router.replace("/");
    } else {
      await login(email);
      router.replace(member ? "/" : "/apply");
    }
  };

  // まだ使われていない new1@example.com, new2@example.com …
  let n = 1;
  while (db?.members[`new${n}@example.com`]) n++;
  const newEmail = `new${n}@example.com`;

  const emailForm = (placeholder: string, label: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        choose(typed);
      }}
      className="flex gap-2"
    >
      <input
        type="email"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={placeholder}
        className="h-11 min-w-0 grow rounded-[10px] border border-line px-3 text-sm"
      />
      <button type="submit" className="h-11 rounded-[10px] bg-accent px-4 text-sm font-bold text-white">
        {label}
      </button>
    </form>
  );

  const accounts = db
    ? Object.values(db.members).sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin))
    : [];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-accent px-7 pt-[120px] pb-10 text-white">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="野田学園陸上競技部のロゴ" width={160} height={119} className="h-auto w-[160px]" />
        <h1 className="m-0 text-[30px] leading-[1.4] font-bold tracking-[0.08em]">
          野田学園
          <br />
          陸上競技部
        </h1>
      </div>

      <div className="flex w-full flex-col items-stretch gap-3.5">
        {noAccount && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-white px-3.5 py-3 text-ink">
            <AlertIcon className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="m-0 text-[15px] font-bold text-danger">アカウントがありません</p>
              <p className="mt-1 mb-0 text-[13px] leading-[1.6] text-[#334155]">初めての人は、下の「アカウント作成」から入部申請をしてください。</p>
            </div>
          </div>
        )}
        <button
          onClick={() => open("login")}
          className={`h-14 rounded-[28px] text-[17px] font-bold ${noAccount ? "bg-white/20 text-accent-soft" : "bg-white text-accent"}`}
        >
          ログイン
        </button>
        <button
          onClick={() => open("create")}
          className={`flex h-14 flex-col items-center justify-center rounded-[28px] border-2 border-white leading-[1.3] ${
            noAccount ? "bg-white text-accent shadow-[0_0_0_4px_rgba(253,186,116,0.9)]" : "bg-transparent text-white"
          }`}
        >
          <span className="text-base font-bold">アカウント作成</span>
          <span className="text-[11px] opacity-85">初めての人</span>
        </button>
        {!USE_FIREBASE && <button
          onClick={() => {
            if (confirm("お試しデータを最初の状態に戻しますか？")) {
              resetDemo();
              setNoAccount(false);
            }
          }}
          className="mt-1.5 text-[11px] text-[#BFDBFE] underline"
        >
          （お試し版）データを最初の状態に戻す
        </button>}
      </div>

      {USE_FIREBASE && (
        <EmailAuthSheet
          mode={authMode}
          onMode={setAuthMode}
          onDone={(hasMember) => router.replace(hasMember ? "/" : "/apply")}
        />
      )}

      <Sheet open={picker === "login"} onClose={() => setPicker(null)} title="Google アカウントを選ぶ（お試し版）">
        <p className="m-0 text-xs leading-relaxed text-muted">
          本番では Google のログイン画面が出ます。お試し版では、使う人を選んでください。
        </p>
        <div className="flex flex-col">
          {accounts.map((m) => (
            <button key={m.email} onClick={() => choose(m.email)} className="flex min-h-12 items-center gap-2 border-t border-divider text-left">
              <span className="grow">
                <span className="block text-[15px]">{m.name}</span>
                <span className="block text-[11px] text-muted">{m.email}</span>
              </span>
              <span className="text-xs text-sub">
                {m.status === "pending" ? "承認待ち" : m.status === "rejected" ? "却下" : m.isAdmin ? "開発者" : ROLE_LABEL[m.role]}
              </span>
            </button>
          ))}
        </div>
        {emailForm("ほかのアカウント（メールアドレス）", "使う")}
      </Sheet>

      <Sheet open={picker === "create"} onClose={() => setPicker(null)} title="アカウント作成（お試し版）">
        <p className="m-0 text-xs leading-relaxed text-muted">
          本番では Google のログイン画面が出て、使う Google アカウントを選びます。お試し版では、新しく入部する人のメールアドレスを決めてください。
        </p>
        <button
          onClick={() => choose(newEmail)}
          className="flex min-h-14 flex-col items-start justify-center rounded-xl border border-line px-3.5 text-left"
        >
          <span className="text-[15px] font-bold text-accent">新しい人として始める</span>
          <span className="text-[11px] text-muted">{newEmail}</span>
        </button>
        {emailForm("自分で決める（メールアドレス）", "作成")}
      </Sheet>
    </div>
  );
}

/** 本番のログイン・アカウント作成（メールアドレスとパスワード） */
function EmailAuthSheet({
  mode, onMode, onDone,
}: {
  mode: null | "login" | "create";
  onMode: (m: null | "login" | "create") => void;
  onDone: (hasMember: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPw, setShowPw] = useState(false);
  const create = mode === "create";

  const switchTo = (m: "login" | "create") => {
    setError("");
    setInfo("");
    onMode(m);
  };

  const submit = async () => {
    if (!mode) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const me = await signInWithEmail(mode, email, password);
      onDone(!!getDb().members[me]);
    } catch (e) {
      setError(authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("先にメールアドレスを入れてください。");
      return;
    }
    try {
      await sendReset(email);
      setInfo("パスワードを決め直すメールを送りました。メールのリンクから新しいパスワードを決めてください。");
    } catch (e) {
      setError(authErrorText(e));
    }
  };

  return (
    <Sheet open={!!mode} onClose={() => onMode(null)} title={create ? "アカウント作成" : "ログイン"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-sub">メールアドレス</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-[10px] border border-line px-3.5 text-base"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-sub">パスワード{create && "（6 文字以上）"}</span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete={create ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-[10px] border border-line pr-12 pl-3.5 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "パスワードを隠す" : "パスワードを見る"}
              aria-pressed={showPw}
              className="absolute top-0 right-0 flex h-12 w-12 items-center justify-center text-muted"
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>
        {error && <p role="alert" className="m-0 text-[13px] font-bold text-danger">{error}</p>}
        {info && <p className="m-0 text-[13px] text-accent">{info}</p>}
        <button
          type="submit"
          disabled={busy || !email.trim() || !password}
          className="h-12 rounded-[24px] bg-accent text-base font-bold text-white disabled:opacity-40"
        >
          {busy ? "少し待ってください…" : create ? "アカウントを作る" : "ログイン"}
        </button>
      </form>
      <div className="flex flex-col items-center gap-1">
        {!create && (
          <button onClick={reset} className="h-10 text-[13px] text-sub underline">
            パスワードを忘れたとき
          </button>
        )}
        <button onClick={() => switchTo(create ? "login" : "create")} className="h-10 text-[13px] text-accent underline">
          {create ? "アカウントがある人はこちら（ログイン）" : "初めての人はこちら（アカウント作成）"}
        </button>
      </div>
    </Sheet>
  );
}
