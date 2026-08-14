interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    title: "Expected income",
    body: "Log every income source with a certainty level — confirmed, likely, or speculative — instead of pretending every dollar is guaranteed.",
  },
  {
    title: "Obligations, with memory",
    body: "Recurring bills surface their own timing pattern automatically once you've logged them a few times — no manual tracking of when things usually land.",
  },
  {
    title: "Confidence-band forecasting",
    body: "Your projection isn't a single fragile number. It's a range, so you can see the difference between 'probably fine' and 'guaranteed fine.'",
  },
  {
    title: "The Sandbox",
    body: "Test a one-off withdrawal or windfall against your real forecast without committing it to your actual budget.",
  },
  {
    title: "Ask, in plain language",
    body: "Query your own logged history — what's typically due this time of month, what your income has looked like — without digging through a spreadsheet.",
  },
];

const steps = [
  {
    title: "Log what you know",
    body: "Add your accounts, expected income, and upcoming obligations — as much or as little certainty as you actually have.",
  },
  {
    title: "See the real range",
    body: "Runway projects your balance forward with a confidence band, not a single misleadingly-precise number.",
  },
  {
    title: "Catch it before it happens",
    body: "Spot the specific dates where things get tight, days or weeks in advance — while there's still time to do something about it.",
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <svg viewBox="0 0 64 40" width="26" height="16" aria-hidden="true">
            <path d="M2 30 C 16 30, 20 10, 32 10 C 44 10, 48 30, 62 30" fill="none" stroke="var(--color-primary-bright)" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span>Runway</span>
        </div>
        <button className="btn-ghost" onClick={onGetStarted}>Sign in</button>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">Cash flow, without the guesswork</p>
        <h1 className="landing-headline">
          Know where your money stands<br />before it actually happens.
        </h1>
        <p className="landing-subhead">
          Runway is a forecasting tool built for income that isn't steady — gig work, freelance,
          sponsorships. Log your expected income, mark your level of certainty, and see a real range for what's ahead
          instead guessing. 
        </p>
        <div className="landing-cta-row">
          <button className="btn-primary btn-lg" onClick={onGetStarted}>Get Started</button>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">The problem</p>
        <h2 className="landing-section-title">Most budgeting tools assume a paycheck that lands on a consistent basis.</h2>
        <p className="landing-section-body">
          If your income is irregular - gig payouts, freelance invoices, sponsorships that aren't confirmed 
          - that assumption breaks immediately. Runway treats uncertainty as the default,
          not an edge case.
        </p>
      </section>

      <section className="landing-section">
        <p className="eyebrow">What you get</p>
        <h2 className="landing-section-title">Everything you need to actually trust your forecast.</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">How it works</p>
        <h2 className="landing-section-title">Three steps. No bank connection required.</h2>
        <div className="step-row">
          {steps.map((s, i) => (
            <div key={s.title} className="step-card">
              <span className="step-number">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <h2>Stop finding out you're short the day it happens.</h2>
        <button className="btn-primary btn-lg" onClick={onGetStarted}>Get Started</button>
      </section>

      <footer className="landing-footer">
        <span>Runway</span>
        <span>Built for people whose income doesn't arrive on a schedule.</span>
      </footer>
    </div>
  );
}
