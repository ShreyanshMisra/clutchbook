import { Line, LineChart } from 'recharts';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Color override; defaults to cyan. */
  color?: string;
}

/** Minimal odds-movement sparkline (no axes, no tooltip). */
export function Sparkline({ data, width = 64, height = 24, color }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const chartData = data.map((v, i) => ({ i, v }));
  // Trend color: green if line rose over the window, crimson if it fell.
  const trendUp = data[data.length - 1] >= data[0];
  const stroke = color ?? (trendUp ? 'var(--pos)' : 'var(--crimson)');

  return (
    <LineChart width={width} height={height} data={chartData}>
      <Line
        type="monotone"
        dataKey="v"
        stroke={stroke}
        strokeWidth={1.6}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
