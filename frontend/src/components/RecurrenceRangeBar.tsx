interface RecurrenceRangeBarProps {
  minDay: number;
  maxDay: number;
}

export function RecurrenceRangeBar({ minDay, maxDay }: RecurrenceRangeBarProps) {
  const left = ((minDay - 1) / 30) * 100;
  const width = ((maxDay - minDay + 1) / 30) * 100;

  return (
    <div className="recurrence-bar" title={`Days ${minDay}–${maxDay} of the month`}>
      <div className="recurrence-track">
        {Array.from({ length: 31 }, (_, i) => (
          <span key={i} className={i + 1 === 1 || i + 1 === 15 ? "recurrence-tick major" : "recurrence-tick"} />
        ))}
        <span className="recurrence-highlight" style={{ left: `${left}%`, width: `${width}%` }} />
      </div>
    </div>
  );
}

interface AmountSparklineProps {
  amounts: number[];
}

export function AmountSparkline({ amounts }: AmountSparklineProps) {
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const step = w / (amounts.length - 1);

  const points = amounts
    .map((a, i) => {
      const x = i * step;
      const y = h - ((a - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="amount-sparkline" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <polyline points={points} fill="none" stroke="var(--color-primary-bright)" strokeWidth="1.5" />
    </svg>
  );
}
