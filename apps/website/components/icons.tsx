import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const iconProps: IconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function ArrowUpRight(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="M7 17 17 7M7 7h10v10" /></svg>;
}

export function Check(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="m5 12 4 4L19 6" /></svg>;
}

export function Menu(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function Close(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function Search(props: IconProps) {
  return <svg {...iconProps} {...props}><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>;
}

export function ArrowRight(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

export function Spark(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="m12 3 1.2 4.1a5 5 0 0 0 3.7 3.7L21 12l-4.1 1.2a5 5 0 0 0-3.7 3.7L12 21l-1.2-4.1a5 5 0 0 0-3.7-3.7L3 12l4.1-1.2a5 5 0 0 0 3.7-3.7L12 3Z" /></svg>;
}
