"use client";

// 画面の切りかえ（PageTransition）で出す棒人間。毎回ランダムに 1 つ選ぶ。
// 走る・ハードル・幅跳び・やり投げ。4月は黄色い学生帽、12月はマフラーをどれにも付ける。
// 動きは globals.css の run-* / hurdle-* / lj-* / jav-*。

export type AthleteKind = "run" | "hurdle" | "longJump" | "javelin";
export const ATHLETE_KINDS: AthleteKind[] = ["run", "hurdle", "longJump", "javelin"];
export const ATHLETE_LABEL: Record<AthleteKind, string> = {
  run: "走る",
  hurdle: "ハードル",
  longJump: "幅跳び",
  javelin: "やり投げ",
};

export function Athlete({ kind, month }: { kind: AthleteKind; month: number }) {
  if (kind === "hurdle") return <Hurdler month={month} />;
  if (kind === "longJump") return <LongJumper month={month} />;
  if (kind === "javelin") return <Thrower month={month} />;
  return <Runner month={month} />;
}

/** 頭の中心。衣装のもとの形は頭が 63,24 のときにかいてあるので、そこからずらす */
type Head = [number, number];
const shift = ([x, y]: Head) => `translate(${x - 63} ${y - 24})`;

const line = {
  stroke: "#FFFFFF",
  strokeWidth: 11,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** 頭と衣装（4月 学生帽・12月 マフラー）。マフラーのはしは体よりうしろに出すので別 */
function HeadWithCostume({ at, month }: { at: Head; month: number }) {
  return (
    <>
      <circle cx={at[0]} cy={at[1]} r="16" fill="#FFFFFF" />
      {month === 4 && <SchoolCap at={at} />}
      {month === 12 && <MufflerWrap at={at} />}
    </>
  );
}

/** ハードル：走ってきて、ハードルをとびこえ、また走る。手足は関節ごとの角度を計算して動かす（globals.css の hd-） */
function Hurdler({ month }: { month: number }) {
  const head: Head = [54, 23];
  // もとの形はまっすぐ立って手足を下ろした形。関節ごとに回して形を作る
  const leg = (k: "a" | "b") => (
    <g className={`hd-l${k}1`} style={{ transformOrigin: "54px 78px" }}>
      <line x1="54" y1="78" x2="54" y2="102" {...line} />
      <g className={`hd-l${k}2`} style={{ transformOrigin: "54px 102px" }}>
        <line x1="54" y1="102" x2="54" y2="125" {...line} />
      </g>
    </g>
  );
  const arm = (k: "a" | "b") => (
    <g className={`hd-a${k}1`} style={{ transformOrigin: "54px 51px" }}>
      <line x1="54" y1="51" x2="54" y2="71" {...line} />
      <g className={`hd-a${k}2`} style={{ transformOrigin: "54px 71px" }}>
        <line x1="54" y1="71" x2="54" y2="85" {...line} />
      </g>
    </g>
  );
  return (
    <svg width="110" height="128" viewBox="0 0 120 140" className="overflow-visible">
      {/* 足もとの線とハードル：同じ速さで右から流れてくる */}
      <clipPath id="hd-ground-clip">
        <rect x="-60" y="120" width="240" height="20" />
      </clipPath>
      <g clipPath="url(#hd-ground-clip)">
        <g className="hd-ground" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          {Array.from({ length: 30 }, (_, k) => -60 + k * 20).map((x) => (
            <line key={x} x1={x} y1="132" x2={x + 10} y2="132" />
          ))}
        </g>
      </g>
      <g className="hd-hurdle">
        <line x1="42" y1="98" x2="42" y2="132" stroke="#CBD5E1" strokeWidth="4" />
        <line x1="82" y1="98" x2="82" y2="132" stroke="#CBD5E1" strokeWidth="4" />
        <rect x="36" y="92" width="52" height="9" fill="#FFFFFF" />
        {[36, 56, 76].map((x) => (
          <rect key={x} x={x} y="92" width="10" height="9" fill="#1F2937" />
        ))}
      </g>
      <g className="hd-body">
        {leg("a")}
        {leg("b")}
        <g className="hd-torso" style={{ transformOrigin: "54px 78px" }}>
          {month === 12 && <MufflerTail at={head} />}
          <line x1="54" y1="78" x2="54" y2="35" {...line} />
          {arm("a")}
          {arm("b")}
          <HeadWithCostume at={head} month={month} />
        </g>
      </g>
    </svg>
  );
}

/** 幅跳び：左からふみ切って、空中で手足を前に出し、右の砂場に着地する */
function LongJumper({ month }: { month: number }) {
  const runHead: Head = [63, 24];
  const head: Head = [54, 22];
  // 助走（走るときと同じ動き）
  const runLeg = (k: "a" | "b") => (
    <g className={`run-leg-${k}`} style={{ transformOrigin: "54px 78px" }}>
      <line x1="54" y1="78" x2="60" y2="101" {...line} />
      <g className={`run-knee-${k}`} style={{ transformOrigin: "60px 101px" }}>
        <line x1="60" y1="101" x2="60" y2="124" {...line} />
      </g>
    </g>
  );
  const runArm = (k: "a" | "b") => (
    <g className={`run-arm-${k}`} style={{ transformOrigin: "59px 51px" }}>
      <polyline points="59,51 56,71 66,81" {...line} />
    </g>
  );
  // 空中：もとの形はまっすぐ立って手足を下ろした形。関節ごとに回して形を作る
  const limb = (cls: string, x: number, y: number) => (
    <g className={`${cls}1`} style={{ transformOrigin: `${x}px ${y}px` }}>
      <line x1={x} y1={y} x2={x} y2={y + 24} {...line} />
      <g className={`${cls}2`} style={{ transformOrigin: `${x}px ${y + 24}px` }}>
        <line x1={x} y1={y + 24} x2={x} y2={y + 48} {...line} />
      </g>
    </g>
  );
  const arm = (cls: string) => (
    <g className={`${cls}1`} style={{ transformOrigin: "54px 46px" }}>
      <line x1="54" y1="46" x2="54" y2="64" {...line} />
      <g className={`${cls}2`} style={{ transformOrigin: "54px 64px" }}>
        <line x1="54" y1="64" x2="54" y2="82" {...line} />
      </g>
    </g>
  );
  return (
    <svg width="110" height="128" viewBox="0 0 120 140" className="overflow-visible">
      {/* 走路・ふみ切り板・砂場 */}
      <line x1="-260" y1="132" x2="0" y2="132" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" />
      <rect x="-68" y="129" width="14" height="5" fill="#FFFFFF" />
      <rect x="0" y="127" width="170" height="10" rx="3" fill="#E9C98B" />
      {/* 着地したときの砂しぶき */}
      {[
        [-26, -22],
        [-14, -32],
        [4, -34],
        [18, -24],
        [28, -12],
      ].map(([dx, dy], i) => (
        <circle key={i} cx="90" cy="128" r="3.5" fill="#E9C98B" className="lj-sand" style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties} />
      ))}
      <g className="lj-move">
        {/* 助走 */}
        <g className="lj-run">
          <g className="run-bob">
            {month === 12 && <MufflerTail at={runHead} />}
            {runLeg("a")}
            {runLeg("b")}
            <line x1="62" y1="36" x2="54" y2="78" {...line} />
            {runArm("a")}
            {runArm("b")}
            <HeadWithCostume at={runHead} month={month} />
          </g>
        </g>
        {/* ふみ切り → 体をそらす → エビのように手足を前へ → 着地 */}
        <g className="lj-air">
          {limb("lj-la", 54, 78)}
          {limb("lj-lb", 54, 78)}
          <g className="lj-torso" style={{ transformOrigin: "54px 78px" }}>
            {month === 12 && <MufflerTail at={head} />}
            <line x1="54" y1="78" x2="54" y2="38" {...line} />
            {arm("lj-aa")}
            {arm("lj-ab")}
            <HeadWithCostume at={head} month={month} />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** やり投げ：うしろに引いたやりを、うでを大きくふって前の上へ投げる */
function Thrower({ month }: { month: number }) {
  const head: Head = [44, 24];
  const runHead: Head = [48, 24];
  const leg = (k: "a" | "b") => (
    <g className={`run-leg-${k}`} style={{ transformOrigin: "54px 78px" }}>
      <line x1="54" y1="78" x2="60" y2="101" {...line} />
      <g className={`run-knee-${k}`} style={{ transformOrigin: "60px 101px" }}>
        <line x1="60" y1="101" x2="60" y2="124" {...line} />
      </g>
    </g>
  );
  return (
    <svg width="110" height="128" viewBox="0 0 120 140" className="overflow-visible">
      {/* 足もとの線：助走中は流れ、ふみこんだら少しずつ遅くなって止まる */}
      <clipPath id="jav-ground-clip">
        <rect x="-50" y="120" width="220" height="20" />
      </clipPath>
      <g clipPath="url(#jav-ground-clip)">
        <g className="jav-ground" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          {Array.from({ length: 18 }, (_, k) => -40 + k * 20).map((x) => (
            <line key={x} x1={x} y1="132" x2={x + 10} y2="132" />
          ))}
        </g>
      </g>
      {/* 体ぜんぶ：ふみこんだあと、勢いで少し前へ進んでから止まる */}
      <g className="jav-drift">
        {/* やり（体より先にかく）。助走中は左上にのばした手で持ち、投げると右上へ飛んでいく */}
        <g className="jav-fly">
          <line x1="0" y1="45" x2="100" y2="6" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
          <line x1="9" y1="41.5" x2="19" y2="37.6" stroke="#1F2937" strokeWidth="6" strokeLinecap="round" />
        </g>
        {/* 助走：走りながら、やりを持たないうではこしのあたりで少しふる */}
        <g className="jav-runup">
          {month === 12 && <MufflerTail at={runHead} />}
          {leg("a")}
          {leg("b")}
          <line x1="47" y1="38" x2="54" y2="78" {...line} />
          <g className="jav-run-arm" style={{ transformOrigin: "49px 48px" }}>
            <polyline points="49,48 51,62 61,68" {...line} />
          </g>
          <HeadWithCostume at={runHead} month={month} />
        </g>
        {/* 投げ：ふんばって投げ、投げたら後ろ足を一歩前へ出す（腰も前へ進む） */}
        <g className="jav-step">
          <g className="jav-plant">
            {/* 前足 */}
            <g className="jav-ft" style={{ transformOrigin: "56px 78px" }}>
              <line x1="56" y1="78" x2="74" y2="102" {...line} />
              <g className="jav-fs" style={{ transformOrigin: "74px 102px" }}>
                <line x1="74" y1="102" x2="88" y2="126" {...line} />
              </g>
            </g>
            {/* 後ろ足 */}
            <g className="jav-bt" style={{ transformOrigin: "56px 78px" }}>
              <line x1="56" y1="78" x2="42" y2="102" {...line} />
              <g className="jav-bs" style={{ transformOrigin: "42px 102px" }}>
                <line x1="42" y1="102" x2="28" y2="126" {...line} />
              </g>
            </g>
          </g>
        {/* 上半身：はじめはうしろにそり、投げるときにこしを中心に前へたおれる */}
        <g className="jav-lean" style={{ transformOrigin: "56px 78px" }}>
          <g className="jav-plant">
            {month === 12 && <MufflerTail at={head} />}
            <line x1="46" y1="38" x2="56" y2="78" {...line} />
            {/* 前のうで（前へのばしてバランスをとる） */}
            <polyline points="48,48 64,46 78,40" {...line} />
          </g>
          {/* 投げるうで：上うで（肩が中心）と前うで（ひじが中心） */}
          <g className="jav-upper" style={{ transformOrigin: "48px 48px" }}>
            <line x1="48" y1="48" x2="66" y2="48" {...line} />
            <g className="jav-fore" style={{ transformOrigin: "66px 48px" }}>
              <line x1="66" y1="48" x2="84" y2="48" {...line} />
            </g>
          </g>
          <g className="jav-plant">
            <HeadWithCostume at={head} month={month} />
          </g>
        </g>
        </g>
      </g>
    </svg>
  );
}

export function Runner({ month }: { month: number }) {
  const line = {
    stroke: "#FFFFFF",
    strokeWidth: 11,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  const leg = (k: "a" | "b") => (
    <g className={`run-leg-${k}`} style={{ transformOrigin: "54px 78px" }}>
      <line x1="54" y1="78" x2="60" y2="101" {...line} />
      {/* すね：真下に来たときはまっすぐ地面に立て、前に出るときは深く曲げる */}
      <g className={`run-knee-${k}`} style={{ transformOrigin: "60px 101px" }}>
        <line x1="60" y1="101" x2="60" y2="124" {...line} />
      </g>
    </g>
  );
  const arm = (k: "a" | "b") => (
    <g className={`run-arm-${k}`} style={{ transformOrigin: "59px 51px" }}>
      <polyline points="59,51 56,71 66,81" {...line} />
    </g>
  );
  return (
    <svg width="110" height="128" viewBox="0 0 120 140" className="overflow-visible">
      <g className="run-bob">
        {month === 12 && <MufflerTail at={[63, 24]} />}
        {leg("a")}
        {leg("b")}
        {/* 体（少し前かがみ） */}
        <line x1="62" y1="36" x2="54" y2="78" {...line} />
        {arm("a")}
        {arm("b")}
        <circle cx="63" cy="24" r="16" fill="#FFFFFF" />
        {month === 4 && <SchoolCap at={[63, 24]} />}
        {month === 12 && <MufflerWrap at={[63, 24]} />}
      </g>
      {/* 足もとの流れる線（走っている感じ） */}
      <g className="run-ground" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6">
        {/* 20 ずつの間かくで短い線をならべ、20 ずらすと同じ形にもどる */}
        {[0, 20, 40, 60, 80, 100, 120].map((x) => (
          <line key={x} x1={x} y1="132" x2={x + 10} y2="132" />
        ))}
      </g>
    </svg>
  );
}

/** 4月：黄色い学生帽（つばは前＝右） */
function SchoolCap({ at }: { at: Head }) {
  return (
    <g transform={shift(at)}>
      <path d="M46,21 Q46,5 63,5 Q80,5 80,19 Z" fill="#FACC15" />
      <path d="M76,17 Q88,15 93,20 Q86,23 77,22 Z" fill="#EAB308" />
      <path d="M46,21 L80,19" stroke="#EAB308" strokeWidth="2.5" />
    </g>
  );
}

/** 12月：首に巻いたマフラー */
function MufflerWrap({ at }: { at: Head }) {
  return (
    <g transform={shift(at)}>
      <rect x="52" y="34" width="21" height="9" rx="4.5" fill="#DC2626" transform="rotate(-8 62 38)" />
    </g>
  );
}

/** 12月：うしろへなびくマフラーのはし（体より後ろにかく） */
function MufflerTail({ at }: { at: Head }) {
  return (
    <g transform={shift(at)}>
      <g className="muffler-a" style={{ transformOrigin: "57px 40px" }}>
        <path d="M58,36 C42,30 24,42 2,33 L-1,43 C22,52 42,41 57,45 Z" fill="#DC2626" />
        <path d="M5,35 L2,44 M11,37 L8,46" stroke="#FFFFFF" strokeWidth="2.5" />
      </g>
      <g className="muffler-b" style={{ transformOrigin: "57px 42px" }}>
        <path d="M57,41 C44,44 30,56 10,53 L9,61 C30,64 46,52 57,47 Z" fill="#B91C1C" />
      </g>
    </g>
  );
}
