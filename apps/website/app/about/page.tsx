import type { Metadata } from 'next';
import { CtaBand } from '../../components/cta-band';

export const metadata: Metadata = { title: 'About', description: 'Why The Fat Killer is building a calmer, clearer system for sustainable health habits.' };

export default function AboutPage() {
  return <main id="main-content"><section className="page-hero"><div className="container page-hero__grid"><div><p className="eyebrow">About TFK</p><h1>Better direction. Less <em>health noise.</em></h1></div><p>We’re building TFK around a simple belief: people do better when today’s next useful action is clear and their progress has enough context.</p></div></section><section className="section"><div className="container prose-grid"><p className="prose-grid__lead">Know what to do today. Track your progress. Understand what is working.</p><div><h2>Designed for real weeks</h2><p>TFK keeps nutrition, water, habits, check-ins, weight, and progress together in the Today Dashboard so the product reflects what is actually happening.</p><h2>Current scope and future direction</h2><p>The current MVP focuses on daily tracking and progress. GLP-1 journaling, coaching, workout and training tools, and AI-powered weekly insights are planned future expansions—not current availability claims.</p><h2>Encouragement with context</h2><p>We avoid shame, dramatic promises, specific weight-loss promises, and all-or-nothing scoring. Medical and medication decisions belong with qualified healthcare professionals.</p></div></div></section><div className="container section section--topless"><CtaBand /></div></main>;
}
