import type { Metadata } from 'next';
import { ArrowUpRight } from '../../components/icons';
import { HelpCenter } from '../../components/help-center';

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Find answers about TFK onboarding, the Today Dashboard, progress, nutrition, water, habits, check-ins, and TFK Score.',
};

const popular = ['Use your Today Dashboard', 'Understand your weight trend', 'Complete a daily check-in'];

export default function HelpPage() {
  return (
    <main id="main-content">
      <section className="help-hero"><div className="container"><p className="eyebrow eyebrow--light">TFK help center</p><h1>What can we help you <em>figure out?</em></h1><p>Search quick, practical guides for the tools you use every day.</p></div></section>
      <section className="help-section"><div className="container help-layout"><div><HelpCenter /></div><aside className="popular-sidebar"><p className="eyebrow">Popular now</p><ol>{popular.map((article, index) => <li key={article}><span>0{index + 1}</span><p>{article}</p></li>)}</ol><div className="support-card"><span>Still stuck?</span><h2>Talk to a person.</h2><p>Send your question and the email connected to your TFK account.</p><a href="mailto:support@thefatkiller.com">Contact support <ArrowUpRight /></a></div></aside></div></section>
    </main>
  );
}
