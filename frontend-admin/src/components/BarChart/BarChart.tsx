import type { ReactElement } from 'react';

import type { ChartBar } from '@/interfaces/stats.interface';

import './BarChart.css';

interface BarChartProps {
  title: string;
  bars: readonly ChartBar[];
}

const HEIGHT = 120;
const BAR_WIDTH = 10;
const GAP = 4;

/**
 * A small SVG bar chart (no chart library). Screen readers get every bar's text through a
 * list, since the bars alone only show shapes.
 */
export const BarChart = ({ title, bars }: BarChartProps): ReactElement => {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const width = bars.length * (BAR_WIDTH + GAP);
  return (
    <figure className="bar-chart">
      <figcaption className="bar-chart__title">{title}</figcaption>
      <svg
        className="bar-chart__svg"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        {bars.map((bar, index) => {
          const height = Math.round((bar.value / max) * (HEIGHT - 2));
          return (
            <rect
              key={bar.label}
              className="bar-chart__bar"
              x={index * (BAR_WIDTH + GAP)}
              y={HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
            >
              <title>{bar.description}</title>
            </rect>
          );
        })}
      </svg>
      <ul className="visually-hidden">
        {bars.map((bar) => (
          <li key={bar.label}>{bar.description}</li>
        ))}
      </ul>
    </figure>
  );
};
