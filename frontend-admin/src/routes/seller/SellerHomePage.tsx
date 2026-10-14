import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { BarChart } from '@/components/BarChart/BarChart';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { StatCard } from '@/components/StatCard/StatCard';
import { useSellerStats } from '@/features/stats/hooks/useStats';
import { formatUsd } from '@/utils/money.util';
import { dailyBars, totalCents, totalOrders } from '@/utils/stats.util';

/** The seller's last 30 days: sales, orders, what waits to be shipped (plan FR-11). */
export const SellerHomePage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const stats = useSellerStats();
  return (
    <main id="main" className="container stack">
      <h1>{t('seller.dashboardTitle')}</h1>
      {stats.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <>
          <div className="grid">
            <StatCard
              label={t('dashboard.sales30')}
              value={formatUsd(totalCents(stats.data.daily), i18n.language)}
            />
            <StatCard
              label={t('dashboard.orders30')}
              value={String(totalOrders(stats.data.daily))}
            />
            <StatCard label={t('dashboard.toShip')} value={String(stats.data.toShip)} />
          </div>
          {stats.data.toShip > 0 && <Link to="/seller/orders">{t('dashboard.goShip')}</Link>}
          <BarChart
            title={t('dashboard.salesPerDay')}
            bars={dailyBars(stats.data.daily, i18n.language)}
          />
        </>
      )}
    </main>
  );
};
