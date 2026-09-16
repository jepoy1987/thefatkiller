import type { Metadata } from 'next';
import { CtaBand } from '../../components/cta-band';
import { Check, Spark } from '../../components/icons';
import { MedicalNote } from '../../components/medical-note';
import { CoachingPreview, DailyPlanPreview, GlpPreview, InsightPreview, NutritionPreview, ProgressPreview } from '../../components/product-previews';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore TFK’s current MVP for Today, progress, nutrition, water, habits, check-ins, and TFK Score—plus a clearly labeled future roadmap.',
};

const supportingFeatures = [
  { number: '04', title: 'Account creation & onboarding', body: 'Create an account, set up the essentials, and arrive at a Today Dashboard shaped around the information you choose to track.', visual: <div className="mini-ui checkin-ui"><p>Getting started</p><div><span>Account</span><b>Created</b></div><div><span>Onboarding</span><b>Complete</b></div><button type="button">Open Today →</button></div> },
  { number: '05', title: 'Daily & weekly check-ins', body: 'Use short, repeatable reflections to add context to your day and review the week you actually had.', visual: <div className="mini-ui checkin-ui"><p>Weekly check-in</p><div><span>Energy</span><b>Good</b></div><div><span>Biggest win</span><b>Planned lunches</b></div><button type="button">Review week →</button></div> },
  { number: '06', title: 'TFK Score', body: 'See a simple consistency signal based on what you track—designed to support awareness, not reward perfection.', visual: <div className="mini-ui score-ui"><div><strong>82</strong><span>TFK Score</span></div><p>Built from your tracked activity</p></div> },
  { number: '07', title: 'Subscription foundation', body: 'The MVP includes the foundation for subscriptions. Final plans, prices, billing terms, and checkout are not yet presented as live.', visual: <div className="mini-ui message-ui"><span>TFK</span><p>Subscription-ready foundation. Final offers are coming soon.</p></div> },
  { number: '08', title: 'Web, iOS & Android direction', body: 'TFK is being shaped for web, iOS, and Android. Check the TFK app for current access; platform availability will be confirmed as releases are approved.', visual: <div className="mini-ui message-ui"><span>+</span><p>One product direction across web and mobile.</p></div> },
];

export default function FeaturesPage() {
  return (
    <main id="main-content">
      <section className="page-hero features-hero">
        <div className="container page-hero__grid">
          <div><p className="eyebrow">Current MVP</p><h1>Start with today. Understand what is <em>working.</em></h1></div>
          <div><p>TFK brings daily actions and progress together, while keeping future expansion clearly separate from what is available now.</p><div className="hero-stat"><strong>Today</strong><span>one dashboard<br />clear daily direction</span></div></div>
        </div>
      </section>

      <section className="section feature-showcase">
        <div className="container feature-row"><div className="feature-row__copy"><span>01</span><p className="eyebrow">Today Dashboard</p><h2>Open the app. See today. Start.</h2><p>Keep nutrition, water, habits, check-ins, weight, and progress in one focused daily view.</p><ul className="check-list"><li><Check /> Know what to do today</li><li><Check /> Track daily progress</li><li><Check /> Keep the essentials together</li></ul></div><DailyPlanPreview /></div>
        <div className="container feature-row feature-row--reverse"><div className="feature-row__copy"><span>02</span><p className="eyebrow">Weight & progress tracking</p><h2>Follow the direction, not the daily drama.</h2><p>Review weight and progress over time alongside check-ins and your TFK Score, so a single weigh-in never has to carry the whole story.</p></div><ProgressPreview /></div>
        <div className="container feature-row"><div className="feature-row__copy"><span>03</span><p className="eyebrow">Nutrition, water & habits</p><h2>Keep the inputs that matter within reach.</h2><p>Track nutrition, hydration, and the personal habits that support your day, then review them alongside your progress.</p></div><NutritionPreview /></div>
      </section>

      <section className="section section--cream">
        <div className="container"><div className="feature-grid-heading"><div><p className="eyebrow">Current MVP foundation</p><h2>From first setup to weekly context.</h2></div><p>These capabilities support the core loop: know what to do, track it, and understand what is working.</p></div><div className="feature-card-grid">{supportingFeatures.map((feature) => <article className="feature-card" key={feature.number}><div className="feature-card__number">{feature.number}</div>{feature.visual}<h3>{feature.title}</h3><p>{feature.body}</p></article>)}</div></div>
      </section>

      <section className="section section--dark">
        <div className="container feature-row feature-row--reverse"><div className="feature-row__copy feature-row__copy--light"><span>COMING SOON</span><p className="eyebrow">What’s Next · Future Expansion</p><h2>Coaching and workout systems are planned.</h2><p>A coaching platform and a workout and training system are future expansions. They are not currently presented as part of the available MVP.</p></div><CoachingPreview /></div>
      </section>

      <section className="section feature-insights">
        <div className="container feature-insights__grid"><div><span className="feature-big-number">09</span><p className="eyebrow"><Spark /> Planned · AI-powered weekly insights</p><h2>Future pattern summaries with firm boundaries.</h2><p>Planned AI insights may summarize information a user chooses to log. They will not provide medication guidance, diagnosis, treatment, or other medical decisions.</p></div><InsightPreview /></div>
      </section>

      <section className="section section--red glp-feature">
        <div className="container feature-row"><div className="feature-row__copy feature-row__copy--light"><span>COMING SOON</span><p className="eyebrow">What’s Next · GLP-1 journal</p><h2>Planned tracking. Care decisions stay with your clinician.</h2><p>An optional GLP-1 journal is a future expansion for recording personal observations. It is not currently presented as available.</p><MedicalNote /></div><GlpPreview /></div>
      </section>
      <div className="container section"><CtaBand /></div>
    </main>
  );
}
