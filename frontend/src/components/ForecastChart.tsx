import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ForecastPoint } from "../lib/types";

interface ForecastChartProps {
  data: ForecastPoint[];
  simulatedData?: ForecastPoint[];
  height?: number;
  comfortBuffer?: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ForecastChart({ data, simulatedData, height = 360, comfortBuffer = 0 }: ForecastChartProps) {
  const chartData = data.map((point, i) => ({
    date: point.date,
    label: formatDate(point.date),
    projectedBalance: point.projectedBalance,
    confidenceLow: point.confidenceLow,
    confidenceHigh: point.confidenceHigh,
    bandBase: point.confidenceLow,
    bandRange: point.confidenceHigh - point.confidenceLow,
    isShortfall: point.confidenceLow < 0,
    simulated: simulatedData?.[i]?.projectedBalance,
  }));

  return (
    <div className="forecast-chart-wrap">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-ink-soft)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--color-ink-soft)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-ink)",
            }}
            formatter={(value, name) => {
              if (name === "bandRange") return null;
              const labels: Record<string, string> = {
                projectedBalance: "Projected",
                confidenceLow: "Low",
                confidenceHigh: "High",
                simulated: "Simulated",
              };
              const numericValue = typeof value === "number" ? value : Number(value ?? 0);
              const key = String(name);
              return [`$${numericValue.toFixed(2)}`, labels[key] ?? key];
            }}
          />
          <ReferenceLine y={0} stroke="var(--color-amber)" strokeDasharray="4 4" />
          {comfortBuffer > 0 && (
            <ReferenceLine
              y={comfortBuffer}
              stroke="var(--color-primary)"
              strokeDasharray="2 6"
              label={{ value: "Buffer", fill: "var(--color-ink-soft)", fontSize: 10, position: "insideTopRight" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="bandBase"
            stackId="band"
            stroke="none"
            fill="transparent"
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="bandRange"
            stackId="band"
            stroke="none"
            fill="url(#bandGradient)"
            name="Confidence band"
          />
          <Line
            type="monotone"
            dataKey="projectedBalance"
            stroke="var(--color-primary-bright)"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (!payload.isShortfall) return <g key={props.key} />;
              return (
                <circle
                  key={props.key}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="var(--color-amber)"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 5, fill: "var(--color-primary-bright)" }}
          />
          {simulatedData && (
            <Line
              type="monotone"
              dataKey="simulated"
              stroke="var(--color-simulated)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Simulated"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-swatch legend-swatch-band" /> Confidence range
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-swatch-line" /> Projected balance
        </span>
        {simulatedData && (
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-simulated" /> Simulated
          </span>
        )}
        <span className="legend-item">
          <span className="legend-swatch legend-swatch-shortfall" /> Shortfall risk
        </span>
      </div>
    </div>
  );
}
