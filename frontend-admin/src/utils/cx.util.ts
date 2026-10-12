type ClassName = string | false | null | undefined;

/** Joins BEM class names, skipping falsy entries: `cx('card', isActive && 'card--active')`. */
export const cx = (...classNames: ClassName[]): string => classNames.filter(Boolean).join(' ');
