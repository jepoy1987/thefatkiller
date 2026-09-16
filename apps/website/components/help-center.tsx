'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Search } from './icons';

export const helpArticles = [
  { title: 'Create your TFK account', category: 'Account and onboarding', time: '3 min' },
  { title: 'Complete onboarding', category: 'Account and onboarding', time: '4 min' },
  { title: 'Use your Today Dashboard', category: 'Today Dashboard', time: '4 min' },
  { title: 'Choose what appears in Today', category: 'Today Dashboard', time: '3 min' },
  { title: 'Understand your weight trend', category: 'Tracking progress', time: '5 min' },
  { title: 'Review your progress history', category: 'Tracking progress', time: '4 min' },
  { title: 'Track nutrition for the day', category: 'Nutrition, water, and habits', time: '5 min' },
  { title: 'Update your water tracking', category: 'Nutrition, water, and habits', time: '2 min' },
  { title: 'Create a personal habit', category: 'Nutrition, water, and habits', time: '3 min' },
  { title: 'Complete a daily check-in', category: 'Check-ins and TFK Score', time: '3 min' },
  { title: 'Review your weekly check-in', category: 'Check-ins and TFK Score', time: '4 min' },
  { title: 'Understand your TFK Score', category: 'Check-ins and TFK Score', time: '4 min' },
  { title: 'Learn what is current and what is planned', category: 'Access and roadmap', time: '3 min' },
];

const categories = ['All', 'Account and onboarding', 'Today Dashboard', 'Tracking progress', 'Nutrition, water, and habits', 'Check-ins and TFK Score', 'Access and roadmap'];

export function HelpCenter() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return helpArticles.filter((article) => (category === 'All' || article.category === category) && (!normalized || `${article.title} ${article.category}`.toLowerCase().includes(normalized)));
  }, [category, query]);

  return (
    <div className="help-browser">
      <div className="search-box">
        <Search />
        <label className="sr-only" htmlFor="help-search">Search help articles</label>
        <input id="help-search" type="search" placeholder="Search by topic or question…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search">Clear</button> : <kbd>⌘ K</kbd>}
      </div>
      <div className="category-filters" aria-label="Filter help articles">
        {categories.map((item) => <button type="button" className={category === item ? 'is-active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>{item}</button>)}
      </div>
      <div className="help-results" aria-live="polite">
        <p className="result-count">{results.length} {results.length === 1 ? 'article' : 'articles'}</p>
        {results.length ? <div className="article-list">{results.map((article) => <article key={article.title}><div><span>{article.category}</span><h2>{article.title}</h2><small>{article.time} read</small></div><span className="article-arrow" aria-hidden="true"><ArrowRight /></span></article>)}</div> : <div className="empty-state"><span>?</span><h2>No articles found</h2><p>Try a broader search or choose another category. You can also ask our support team.</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button></div>}
      </div>
    </div>
  );
}
