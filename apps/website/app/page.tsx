import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand } from '../components/cta-band';
import { ArrowRight, ArrowUpRight, Check, Spark } from '../components/icons';
import { MedicalNote } from '../components/medical-note';
import { CoachingPreview, DailyPlanPreview, GlpPreview, InsightPreview, NutritionPreview, ProgressPreview } from '../components/product-previews';
import { SectionHeading } from '../components/section-heading';

export const metadata: Metadata = {
  title: 'Know what to do today',
  description: 'Use the Today Dashboard to track daily progress and understand what is working across nutrition, water, habits, check-ins, and weight.',
};

const benefits = ['Know what to do today', 'Track daily progress', 'Understand what is working'];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero__texture" aria-hidden="true" />
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">Your day, brought into focus</p>
            <h1>Know what to do <em>today.</em></h1>
            <p className="hero__body">The TFK Today Dashboard keeps nutrition, water, habits, check-ins, weight, and progress together—so you can act on today and see what is working over time.</p>
            <div className="hero__actions">
              <a className="button button--large" href="https://app.thefatkiller.com">Open TFK App <ArrowUpRight /></a>
              <Link className="button button--outline button--large" href="/features">Explore Features</Link>
            </div>
            <div className="hero__benefits">
              {benefits.map((benefit) => <span key={benefit}><i><Check /></i>{benefit}</span>)}
            </div>
          </div>
          <div className="hero__product"><div className="orange-orbit" aria-hidden="true" /><DailyPlanPreview /><p className="floating-note"><Spark /> Built around your real week</p></div>
        </div>
      </section>

      <section className="manifesto section">
        <div className="container manifesto__grid">
          <p className="manifesto__index">01 / THE SYSTEM</p>
          <p className="manifesto__statement">Your Today Dashboard turns daily tracking into a clear next step—not another list to manage.</p>
          <p className="manifesto__body">Create your account, complete onboarding, and bring the essentials into one place so you can spend less time wondering and more time doing.</p>
        </div>
      </section>

      <section className="section section--cream">
        <div className="container split-section">
          <ProgressPreview />
          <div className="split-copy">
            <p className="section-number">01</p>
            <SectionHeading eyebrow="See the whole trend" title="Progress is more than this morning’s number." body="Follow weight and progress over time alongside your check-ins and daily tracking. TFK helps you zoom out and notice the direction—not overreact to one day." />
            <ul className="check-list"><li><Check /> Weight and progress tracking</li><li><Check /> Daily and weekly check-ins</li><li><Check /> TFK Score for a clearer consistency signal</li></ul>
            <Link className="inline-link" href="/features">Explore progress tracking <ArrowRight /></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-section split-section--reverse">
          <NutritionPreview />
          <div className="split-copy">
            <p className="section-number">02</p>
            <SectionHeading eyebrow="Track the day" title="Nutrition, water, and habits—kept together." body="Log the daily inputs you care about, keep hydration visible, and track the habits that support your routine without losing sight of the bigger trend." />
            <div className="mini-feature-grid"><div><strong>Daily progress</strong><p>See what you have tracked and what still needs attention today.</p></div><div><strong>Weekly context</strong><p>Use check-ins and your TFK Score to understand what is working.</p></div></div>
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container split-section">
          <CoachingPreview />
          <div className="split-copy split-copy--light">
            <p className="section-number">COMING SOON</p>
            <SectionHeading eyebrow="Future Expansion" title="Coaching and training are part of what’s next." body="A coaching platform and a workout and training system are planned future expansions. They are not presented as currently available in TFK." />
            <Link className="inline-link inline-link--light" href="/features">See the product roadmap <ArrowRight /></Link>
          </div>
        </div>
      </section>

      <section className="section insights-section">
        <div className="container">
          <SectionHeading align="center" eyebrow="Planned · AI-powered weekly insights" title="Future insights, with clear medical boundaries." body="AI-powered weekly insights are planned to help summarize logged patterns. They will not provide medication guidance, diagnosis, treatment, or other medical decisions." />
          <div className="insight-stage"><span className="insight-stage__label">LESS GUESSING</span><InsightPreview /><span className="insight-stage__label insight-stage__label--right">MORE CONTEXT</span></div>
        </div>
      </section>

      <section className="section section--cream">
        <div className="container glp-section">
          <div className="split-copy">
            <p className="section-number">COMING SOON</p>
            <SectionHeading eyebrow="Future Expansion · GLP-1 journal" title="Planned tracking—not treatment decisions." body="A GLP-1 journal is planned as an optional future expansion for recording personal observations. Medication tracking does not replace advice from a qualified healthcare professional." />
            <MedicalNote />
          </div>
          <GlpPreview />
        </div>
      </section>

      <div className="container section"><CtaBand /></div>
    </main>
  );
}
