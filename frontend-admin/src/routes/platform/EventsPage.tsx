import { useState, type FormEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EventType } from '@/api/notification.schema';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Pagination } from '@/components/Pagination/Pagination';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useEvents } from '@/features/platform/hooks/usePlatform';

import './PlatformList.css';

const PAGE_SIZE = 50;

/** Every business event, newest first — e.g. follow one order through the saga (plan F12). */
export const EventsPage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const type = Object.values(EventType).find((value) => value === params.get('type'));
  const aggregateId = params.get('aggregateId') ?? undefined;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const [aggregate, setAggregate] = useState(aggregateId ?? '');
  const [chosenType, setChosenType] = useState(type ?? '');
  const events = useEvents({
    page,
    pageSize: PAGE_SIZE,
    ...(type && { type }),
    ...(aggregateId && { aggregateId }),
  });

  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (chosenType !== '') next.set('type', chosenType);
    if (aggregate.trim() !== '') next.set('aggregateId', aggregate.trim());
    setParams(next);
  };

  return (
    <main id="main" className="page container">
      <h1>{t('events.title')}</h1>
      <form className="page__toolbar platform-list__toolbar" onSubmit={apply}>
        <label className="platform-list__filter">
          {t('events.type')}
          <select
            className="select platform-list__control"
            value={chosenType}
            onChange={(event) => setChosenType(event.target.value)}
          >
            <option value="">{t('events.allTypes')}</option>
            {Object.values(EventType).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="platform-list__filter">
          {t('events.aggregate')}
          <input
            className="input platform-list__control"
            value={aggregate}
            onChange={(event) => setAggregate(event.target.value)}
          />
        </label>
        <Button type="submit" variant={ButtonVariant.Secondary}>
          {t('moderation.apply')}
        </Button>
      </form>
      {events.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : events.data.items.length === 0 ? (
        <EmptyState title={t('events.none')} />
      ) : (
        <>
          <ul className="platform-list">
            {events.data.items.map((entry) => (
              <li key={entry.eventId} className="platform-list__item">
                <div className="platform-list__row">
                  <strong>{entry.type}</strong>
                  <span className="platform-list__meta">
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    }).format(new Date(entry.occurredAt))}
                  </span>
                </div>
                <span className="platform-list__meta">
                  {entry.topic} · {entry.aggregateId}
                </span>
                <details>
                  <summary>{t('events.payload')}</summary>
                  <pre className="platform-list__payload">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={Math.ceil(events.data.total / PAGE_SIZE)} />
        </>
      )}
    </main>
  );
};
