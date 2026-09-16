import { Check, Spark } from './icons';

export function DailyPlanPreview() {
  return (
    <div className="dashboard-shell" aria-label="Example TFK daily plan dashboard">
      <div className="dashboard-topbar">
        <div className="mini-brand">T</div>
        <div className="dashboard-date"><span>Today</span><strong>Tuesday, Sep 16</strong></div>
        <div className="avatar">JP</div>
      </div>
      <div className="dashboard-content">
        <div className="score-card">
          <div className="score-ring"><strong>82</strong><span>score</span></div>
          <div><span className="tiny-label">Consistency</span><h3>You’re building momentum.</h3><p>Four strong days this week.</p></div>
        </div>
        <div className="today-header"><div><span className="tiny-label">Your daily plan</span><h3>Three things for today</h3></div><span className="status-pill">2 of 3 done</span></div>
        <div className="task-list">
          <div className="task is-complete"><span className="task-check"><Check /></span><div><strong>Log breakfast</strong><small>32g protein · 410 kcal</small></div><b>Done</b></div>
          <div className="task is-complete"><span className="task-check"><Check /></span><div><strong>Morning weigh-in</strong><small>Trend is steady this week</small></div><b>Done</b></div>
          <div className="task"><span className="task-number">3</span><div><strong>Complete daily check-in</strong><small>Energy · hunger · today’s win</small></div><b>Open</b></div>
        </div>
        <div className="dashboard-bottom">
          <div><span>Water</span><strong>5 / 8</strong><i><em style={{ width: '62%' }} /></i></div>
          <div><span>Protein</span><strong>86 / 120g</strong><i><em style={{ width: '72%' }} /></i></div>
          <div><span>Habits</span><strong>4 / 5</strong><i><em style={{ width: '80%' }} /></i></div>
        </div>
      </div>
    </div>
  );
}

export function ProgressPreview() {
  return (
    <div className="preview-card progress-preview" aria-label="Example weight trend chart">
      <div className="preview-card__head"><div><span className="tiny-label">12-week view</span><h3>Progress, in context</h3></div><span className="trend-badge">Updated</span></div>
      <div className="chart-summary"><strong>12</strong><span>weekly entries</span></div>
      <div className="chart" aria-hidden="true">
        <div className="chart-lines"><i /><i /><i /><i /></div>
        <svg viewBox="0 0 480 170" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ee6b2f" stopOpacity=".3"/><stop offset="1" stopColor="#ee6b2f" stopOpacity="0"/></linearGradient></defs><path className="chart-area" d="M0 32 C55 45 70 38 112 68 S180 56 220 90 S280 75 322 116 S395 96 480 142 L480 170 L0 170Z"/><path className="chart-line" d="M0 32 C55 45 70 38 112 68 S180 56 220 90 S280 75 322 116 S395 96 480 142"/><g className="chart-dot"><circle cx="480" cy="142" r="7"/><circle cx="480" cy="142" r="3"/></g></svg>
      </div>
      <div className="chart-labels"><span>Jun 24</span><span>Jul 22</span><span>Aug 19</span><span>Today</span></div>
      <div className="measurement-row"><div><span>Weight logs</span><strong>12</strong></div><div><span>Check-ins</span><strong>11 / 12</strong></div><div><span>TFK Score</span><strong>82</strong></div></div>
    </div>
  );
}

export function NutritionPreview() {
  return (
    <div className="preview-card nutrition-preview" aria-label="Example nutrition and habit dashboard">
      <div className="preview-card__head"><div><span className="tiny-label">Today</span><h3>Fuel & foundations</h3></div><span className="small-date">Sep 16</span></div>
      <div className="macro-grid">
        <div className="calorie-ring"><span><strong>1,420</strong><small>of 1,850 kcal</small></span></div>
        <div className="macro-bars"><div><span>Protein <b>86 / 120g</b></span><i><em style={{ width: '72%' }} /></i></div><div><span>Carbs <b>142 / 190g</b></span><i><em style={{ width: '75%' }} /></i></div><div><span>Fats <b>48 / 62g</b></span><i><em style={{ width: '77%' }} /></i></div></div>
      </div>
      <div className="habit-row"><div><span className="habit-icon">◒</span><span>Water<strong>5 glasses</strong></span></div><div><span className="habit-icon">+</span><span>Check-in<strong>Complete</strong></span></div><div><span className="habit-icon">✓</span><span>Habits<strong>4 of 5</strong></span></div></div>
    </div>
  );
}

export function CoachingPreview() {
  return (
    <div className="preview-card coaching-preview" aria-label="Example workout and coach check-in">
      <div className="workout-card"><span className="tiny-label">Future concept · 5:30 PM</span><h3>Upper body strength</h3><p>20 min · 5 exercises · Home</p><div className="exercise-chips"><span>Push</span><span>Pull</span><span>Core</span></div><button type="button">Concept preview <span>→</span></button></div>
      <div className="coach-message"><div className="avatar avatar--coach">AM</div><div><span>Coach Alex · 9:42 AM</span><p>Your check-in looks solid. Let’s keep today simple: hit protein at lunch and complete the short session.</p></div></div>
      <div className="history-strip"><span>Workout history</span><div>{['M','T','W','T','F','S','S'].map((day, index) => <i className={index === 0 || index === 2 || index === 4 ? 'done' : ''} key={`${day}-${index}`}>{day}</i>)}</div></div>
    </div>
  );
}

export function InsightPreview() {
  return (
    <div className="insight-preview" aria-label="Example AI weekly insight">
      <div className="insight-preview__top"><span><Spark /></span><div><p>Planned weekly insight</p><strong>Concept preview</strong></div><b>Future AI</b></div>
      <blockquote>“Your most consistent days started with a planned breakfast. On three days without one, protein was harder to reach.”</blockquote>
      <div className="insight-action"><span>Try this next</span><p>Choose tomorrow’s breakfast tonight and add it to your daily plan.</p></div>
      <p className="insight-fineprint">Planned insights would summarize logged patterns for education only—not medication or medical decisions.</p>
    </div>
  );
}

export function GlpPreview() {
  return (
    <div className="glp-preview" aria-label="Example optional medication journal">
      <div className="glp-preview__head"><div><span className="tiny-label">Future concept</span><h3>Notice patterns over time</h3></div><span className="lock-pill">Coming Soon</span></div>
      <div className="journal-days"><span>M<i /></span><span>T<i /></span><span>W<i className="active" /></span><span>T<i /></span><span>F<i /></span><span>S<i /></span><span>S<i /></span></div>
      <div className="journal-entry"><div><span>Appetite</span><strong>Moderate</strong></div><div><span>Energy</span><strong>Good</strong></div><div><span>Notes</span><strong>Added</strong></div></div>
    </div>
  );
}
