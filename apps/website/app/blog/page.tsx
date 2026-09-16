import type { Metadata } from 'next';
import { ArrowRight } from '../../components/icons';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Planned educational articles about daily progress, nutrition, habits, check-ins, and future TFK topics.',
};

const posts = [
  { category: 'Progress', title: 'The weekly check-in that actually helps', summary: 'A short review can reveal more than a perfect spreadsheet. Here’s what to notice before planning the next week.', time: '6 min', tone: 'orange', featured: true },
  { category: 'Nutrition', title: 'Protein targets without making food miserable', summary: 'A flexible way to make protein more visible while leaving room for meals you genuinely enjoy.', time: '5 min', tone: 'cream' },
  { category: 'Future topic · GLP-1', title: 'What to discuss during a GLP-1 journey', summary: 'General educational prompts to discuss with a qualified healthcare professional—not medication guidance.', time: '7 min', tone: 'red' },
  { category: 'Future topic · Training', title: 'Short workouts still count', summary: 'A planned educational article about adapting training expectations when time and energy are limited.', time: '4 min', tone: 'charcoal' },
  { category: 'Mindset', title: 'The scale moved up. Now what?', summary: 'How to pause, add context, and choose a measured next action instead of reacting to one number.', time: '5 min', tone: 'cream' },
  { category: 'Nutrition', title: 'Design your easiest healthy breakfast', summary: 'Use fewer decisions, a repeatable template, and ingredients you already like.', time: '4 min', tone: 'orange' },
];

export default function BlogPage() {
  return (
    <main id="main-content">
      <section className="page-hero journal-hero"><div className="container page-hero__grid"><div><p className="eyebrow">The TFK journal</p><h1>Useful ideas for the <em>week you’re in.</em></h1></div><div><p>Planned, educational reads about building consistency—without perfectionism, scare tactics, or promises of specific results.</p><span className="draft-label">Planned editorial content</span></div></div></section>
      <section className="section blog-section"><div className="container">
        <div className="blog-filters" aria-label="Article categories"><span>Browse:</span>{['All', 'Progress', 'Nutrition', 'Habits', 'Check-ins', 'Future topics'].map((item, index) => <span className={index === 0 ? 'is-active' : ''} key={item}>{item}</span>)}</div>
        <div className="post-grid">
          {posts.map((post, index) => <article className={`post-card post-card--${post.tone}${post.featured ? ' post-card--featured' : ''}`} key={post.title}><div className="post-card__art" aria-hidden="true"><span>{String(index + 1).padStart(2, '0')}</span><i /><i /></div><div className="post-card__content"><div className="post-meta"><span>{post.category}</span><small>{post.time} read</small></div><h2>{post.title}</h2><p>{post.summary}</p><span className="post-soon">Article coming soon <ArrowRight /></span></div></article>)}
        </div>
        <aside className="editorial-note"><span>+</span><div><strong>About future medical topics</strong><p>TFK will share general educational information—not diagnosis, prescribing, dosing, medication-switching advice, or medical decisions. Talk with a qualified healthcare professional about your care.</p></div></aside>
      </div></section>
    </main>
  );
}
