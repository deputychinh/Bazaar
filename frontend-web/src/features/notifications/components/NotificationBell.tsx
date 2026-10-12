'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ReactElement } from 'react';

import { NOTIFICATION_POLL_INTERVAL_MS } from '@/constants/checkout.constant';
import { useAuth } from '@/features/auth/useAuth';
import { Link } from '@/i18n/navigation';
import type { NotificationPage } from '@/interfaces/notification.interface';
import { cx } from '@/utils/cx.util';

import { latestNotifications, markAllNotificationsRead } from '../notification-api';

import './NotificationBell.css';

/** Header bell for signed-in users: unread badge, latest notifications, all marked read on open. */
export const NotificationBell = (): ReactElement | null => {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const { accessToken } = useAuth();
  const panelId = useId();
  const [page, setPage] = useState<NotificationPage | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (accessToken === null) return undefined;
    let isCurrent = true;
    const refresh = (): void => {
      void latestNotifications(accessToken).then((latest) => {
        if (isCurrent && latest !== null) setPage(latest);
      });
    };
    refresh();
    const timer = setInterval(refresh, NOTIFICATION_POLL_INTERVAL_MS);
    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [accessToken]);

  if (accessToken === null) return null;
  const unread = page?.unread ?? 0;

  const toggle = (): void => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && unread > 0) {
      void markAllNotificationsRead(accessToken).then(() => {
        setPage((current) => (current === null ? current : { ...current, unread: 0 }));
      });
    }
  };

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell__button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={t('label', { count: unread })}
        onClick={toggle}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {unread}
          </span>
        )}
      </button>
      {isOpen && (
        <div id={panelId} className="notification-bell__panel">
          {page === null || page.items.length === 0 ? (
            <p className="notification-bell__empty">{t('empty')}</p>
          ) : (
            <ul className="notification-bell__list">
              {page.items.map((item) => (
                <li
                  key={item.id}
                  className={cx('notification-bell__item', item.readAt === null && 'is-unread')}
                >
                  <Link className="notification-bell__link" href={`/orders/${item.data.orderId}`}>
                    {t(`kind.${item.kind}`, { ref: item.data.orderReference })}
                  </Link>
                  <time className="notification-bell__time" dateTime={item.createdAt}>
                    {format.relativeTime(new Date(item.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
