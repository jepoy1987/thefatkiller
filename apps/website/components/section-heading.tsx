import type { ReactNode } from 'react';

type Props = {
  eyebrow: string;
  title: string;
  body?: ReactNode;
  align?: 'left' | 'center';
};

export function SectionHeading({ eyebrow, title, body, align = 'left' }: Props) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body ? <p className="section-heading__body">{body}</p> : null}
    </div>
  );
}
