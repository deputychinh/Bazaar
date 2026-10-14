import { useState, type FormEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';

import './ReasonForm.css';

interface ReasonFormProps {
  /** Text of the button that opens the form and of the confirm button. */
  actionLabel: string;
  isBusy: boolean;
  onConfirm: (reason: string) => void;
}

/** An inline "why?" step for decisions that need a reason (reject, hide); 3–500 characters. */
export const ReasonForm = ({ actionLabel, isBusy, onConfirm }: ReasonFormProps): ReactElement => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (!isOpen) {
    return (
      <Button variant={ButtonVariant.Secondary} onClick={() => setIsOpen(true)}>
        {actionLabel}
      </Button>
    );
  }
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onConfirm(reason.trim());
  };
  return (
    <form className="reason-form" onSubmit={submit}>
      <label className="reason-form__label">
        {t('reason.label')}
        <input
          className="reason-form__input"
          value={reason}
          minLength={3}
          maxLength={500}
          required
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <Button type="submit" disabled={isBusy || reason.trim().length < 3}>
        {actionLabel}
      </Button>
      <Button variant={ButtonVariant.Ghost} onClick={() => setIsOpen(false)}>
        {t('reason.cancel')}
      </Button>
    </form>
  );
};
