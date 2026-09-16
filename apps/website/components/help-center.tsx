'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowRight, Search } from './icons';

export const helpArticles = [
  { id: 'create-account', title: 'Create your TFK account', category: 'Account and onboarding', time: '3 min', content: 'Open the TFK app and follow the account creation prompts. Once your account is ready, continue to onboarding so the Today Dashboard can reflect the information you choose to track.' },
  { id: 'complete-onboarding', title: 'Complete onboarding', category: 'Account and onboarding', time: '4 min', content: 'Use onboarding to set up the essentials and choose the information you want to track. The goal is to arrive at a Today Dashboard focused on your next useful actions.' },
  { id: 'use-today-dashboard', title: 'Use your Today Dashboard', category: 'Today Dashboard', time: '4 min', content: 'The Today Dashboard keeps nutrition, water, habits, check-ins, weight, and progress together. Use it to see what needs attention today and what you have already completed.' },
  { id: 'choose-today-items', title: 'Choose what appears in Today', category: 'Today Dashboard', time: '3 min', content: 'Keep Today focused on the daily information you choose to track. Bring the essentials together so you can spend less time wondering and more time taking the next useful action.' },
  { id: 'understand-weight-trend', title: 'Understand your weight trend', category: 'Tracking progress', time: '5 min', content: 'Review weight entries over time alongside check-ins and your TFK Score. Looking at the broader direction helps keep a single weigh-in from carrying the whole story.' },
  { id: 'review-progress-history', title: 'Review your progress history', category: 'Tracking progress', time: '4 min', content: 'Use your progress history to compare what you tracked across days and weeks. Look for steady patterns across weight, daily actions, and check-ins rather than expecting every day to be perfect.' },
  { id: 'track-nutrition', title: 'Track nutrition for the day', category: 'Nutrition, water, and habits', time: '5 min', content: 'Record the nutrition information you care about and review it with the rest of your day. TFK keeps daily inputs visible alongside water, habits, check-ins, and progress.' },
  { id: 'update-water', title: 'Update your water tracking', category: 'Nutrition, water, and habits', time: '2 min', content: 'Keep hydration visible by updating your water progress during the day. Your Today Dashboard shows it with the other daily actions you choose to track.' },
  { id: 'create-habit', title: 'Create a personal habit', category: 'Nutrition, water, and habits', time: '3 min', content: 'Track a repeatable personal habit that supports your routine. Review it with your other daily inputs to understand what is helping you stay consistent.' },
  { id: 'daily-check-in', title: 'Complete a daily check-in', category: 'Check-ins and TFK Score', time: '3 min', content: 'Use the daily check-in to add context about the day you actually had. Short, repeatable reflections help connect your actions with the progress you review over time.' },
  { id: 'weekly-check-in', title: 'Review your weekly check-in', category: 'Check-ins and TFK Score', time: '4 min', content: 'Use the weekly check-in to look back at your tracked days, notice what supported you, and carry useful context into the next week.' },
  { id: 'understand-tfk-score', title: 'Understand your TFK Score', category: 'Check-ins and TFK Score', time: '4 min', content: 'The TFK Score is a simple consistency signal based on what you track. It supports awareness of your patterns; it is not a reward for perfection or a medical assessment.' },
  { id: 'current-and-planned', title: 'Learn what is current and what is planned', category: 'Access and roadmap', time: '3 min', content: 'The current MVP centers on account setup, Today, progress, nutrition, water, habits, check-ins, and TFK Score. GLP-1 journaling, coaching, workouts and training, and AI-powered weekly insights are planned future expansions, not current availability claims.' },
];

const categories = ['All', 'Account and onboarding', 'Today Dashboard', 'Tracking progress', 'Nutrition, water, and habits', 'Check-ins and TFK Score', 'Access and roadmap'];

export function HelpCenter() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return helpArticles.filter((article) => (category === 'All' || article.category === category) && (!normalized || `${article.title} ${article.category}`.toLowerCase().includes(normalized)));
  }, [category, query]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const isShortcut = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
      if (!isShortcut) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isUnrelatedEditable = Boolean(target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') && target !== searchInputRef.current;
      if (isUnrelatedEditable) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, []);

  function toggleArticle(id: string) {
    setOpenArticle((current) => current === id ? null : id);
  }

  function handleArticleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleArticle(id);
  }

  return (
    <div className="help-browser">
      <div className="search-box">
        <Search />
        <label className="sr-only" htmlFor="help-search">Search help articles</label>
        <input ref={searchInputRef} id="help-search" type="search" placeholder="Search by topic or question…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search">Clear</button> : <span className="shortcut-hint"><kbd aria-hidden="true">⌘K</kbd><span aria-hidden="true">/</span><kbd aria-hidden="true">Ctrl K</kbd><span className="sr-only">Press Command K on macOS or Control K on Windows and Linux to focus search</span></span>}
      </div>
      <div className="category-filters" aria-label="Filter help articles">
        {categories.map((item) => <button type="button" className={category === item ? 'is-active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>{item}</button>)}
      </div>
      <div className="help-results" aria-live="polite">
        <p className="result-count">{results.length} {results.length === 1 ? 'article' : 'articles'}</p>
        {results.length ? <div className="article-list">{results.map((article) => {
          const isOpen = openArticle === article.id;
          const panelId = `help-article-${article.id}`;
          const buttonId = `help-article-button-${article.id}`;
          return <article className={isOpen ? 'is-open' : ''} key={article.id}>
            <button id={buttonId} className="article-trigger" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggleArticle(article.id)} onKeyDown={(event) => handleArticleKeyDown(event, article.id)}>
              <span className="article-trigger__copy"><span>{article.category}</span><strong>{article.title}</strong><small>{article.time} read</small></span>
              <span className="article-trigger__state"><span>{isOpen ? 'Close article' : 'Read article'}</span><i className="article-arrow" aria-hidden="true"><ArrowRight /></i></span>
            </button>
            {isOpen ? <div className="article-panel" id={panelId} role="region" aria-labelledby={buttonId}><p>{article.content}</p></div> : null}
          </article>;
        })}</div> : <div className="empty-state"><span>?</span><h2>No articles found</h2><p>Try a broader search or choose another category. You can also ask our support team.</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button></div>}
      </div>
    </div>
  );
}
