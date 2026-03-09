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
  return (
    <div className="flex min-h-[42px] items-center gap-2 border border-[#1F1F3E] bg-[#25254D] px-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt={`Icone ${label}`} className="h-[18px] w-[18px] image-pixelated" />
      <div className="text-[14px] font-bold text-[#DDD]">
        {label}
        {typeof value !== "undefined" ? <span className="ml-1 font-normal text-[#BEBECE]">{String(value)}</span> : null}
        {valueNode ? <span className="ml-2">{valueNode}</span> : null}
      </div>
    </div>
  );
}
