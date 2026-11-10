// アップの中身を読みやすく並べる。「・」で始まる行は一段下げる
export function WarmUpText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        const sub = t.startsWith("・");
        return (
          <p key={i} className={`m-0 leading-[1.6] ${sub ? "pl-4 text-[13px] text-sub" : "text-[14px]"}`}>
            {t}
          </p>
        );
      })}
    </div>
  );
}
