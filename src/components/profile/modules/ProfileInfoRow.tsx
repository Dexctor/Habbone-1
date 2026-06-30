"use client";

export function ProfileInfoRow({
  icon,
  label,
  value,
  valueNode,
}: {
  icon: string;
  label: string;
  value?: number | string;
  valueNode?: React.ReactNode;
}) {
  const displayValue = typeof value === "number" ? value.toLocaleString("fr-FR") : value;

  return (
    <div className="group flex min-h-[46px] items-center justify-between gap-3 rounded-[5px] border border-[#141433] bg-[#25254D] px-3 transition hover:border-[#2596FF]/25 hover:bg-[#303060]/45">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[5px] bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt={`Icone ${label}`} className="h-[18px] w-[18px] image-pixelated" />
        </span>
        <span className="truncate text-[13px] font-bold text-[#DDD]">{label.replace(/\s*:$/, "")}</span>
      </div>
      {typeof displayValue !== "undefined" ? (
        <span className="shrink-0 text-right text-[13px] font-bold text-[#BEBECE] group-hover:text-white">{String(displayValue)}</span>
      ) : null}
      {valueNode ? <span className="shrink-0">{valueNode}</span> : null}
    </div>
  );
}
