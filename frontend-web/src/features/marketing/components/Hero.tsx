import type { ReactElement, ReactNode } from 'react';

import './Hero.css';

interface HeroProps {
  title: string;
  lead: string;
  actions?: ReactNode;
}

export const Hero = ({ title, lead, actions }: HeroProps): ReactElement => (
  <section className="hero">
    <div className="hero__inner container">
      <h1 className="hero__title">{title}</h1>
      <p className="hero__lead">{lead}</p>
      {actions !== undefined && <div className="hero__actions">{actions}</div>}
    </div>
  </section>
);
