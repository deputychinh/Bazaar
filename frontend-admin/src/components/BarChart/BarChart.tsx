import type { ReactElement } from 'react';

import type { ChartBar } from '@/interfaces/stats.interface';

import './BarChart.css';

interface BarChartProps {
  title: string;
  bars: readonly ChartBar[];
  /** Text of the top gridline, e.g. "$1,250.00" for the highest bar. */
  formatValue: (value: number) => string;
  /** Labels under the first and last bar (dates). */
  startLabel?: string;
  endLabel?: string;
}

const HEIGHT = 160;
const BAR_WIDTH = 14;
const GAP = 6;
const GRIDLINES = [0.25, 0.5, 0.75, 1] as const;

/**
 * A small SVG bar chart (no chart library) with gridlines and axis labels. Screen readers get
 * every bar's text through a list, since the bars alone only show shapes.
 */
export const BarChart = ({
  title,
  bars,
  formatValue,
  startLabel,
  endLabel,
}: BarChartProps): ReactElement => {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const width = Math.max(1, bars.length * (BAR_WIDTH + GAP) - GAP);
  return (
    <figure className="bar-chart">
      <figcaption className="bar-chart__head">
        <span className="bar-chart__title">{title}</span>
        <span className="bar-chart__max">{formatValue(max)}</span>
      </figcaption>
      <svg
        className="bar-chart__svg"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        {GRIDLINES.map((line) => (
          <line
            key={line}
            className="bar-chart__grid"
            x1={0}
            x2={width}
            y1={HEIGHT - line * (HEIGHT - 1)}
            y2={HEIGHT - line * (HEIGHT - 1)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {bars.map((bar, index) => {
          const height = bar.value === 0 ? 0 : Math.max(2, Math.round((bar.value / max) * HEIGHT));
          return (
            <rect
              key={bar.label}
              className="bar-chart__bar"
              x={index * (BAR_WIDTH + GAP)}
              y={HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
              rx={2}
            >
              <title>{bar.description}</title>
            </rect>
          );
        })}
      </svg>
      {(startLabel !== undefined || endLabel !== undefined) && (
        <div className="bar-chart__axis" aria-hidden="true">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
      <ul className="visually-hidden">
        {bars.map((bar) => (
          <li key={bar.label}>{bar.description}</li>
        ))}
      </ul>
    </figure>
  );
};
