import { render, screen } from '@testing-library/react';

import { ButtonVariant } from '@/enums/button-variant.enum';

import { Button } from './Button';

describe('Button', () => {
  it('is a plain button by default and accepts submit', () => {
    render(
      <>
        <Button>Save</Button>
        <Button type="submit" variant={ButtonVariant.Ghost} isFullWidth>
          Send
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Send' })).toHaveClass(
      'button',
      'button--ghost',
      'button--full-width',
    );
  });
});
