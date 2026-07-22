'use client';

// Swap this ID once the Google Form is created (Send → embed HTML → copy /d/e/... segment).
// The form should include an optional "Your name (leave blank to stay anonymous)" question
// at the top and have "Collect email addresses" turned OFF.
const FORM_EMBED_ID: string = '1FAIpQLSdc00uMQs9NHUp2Z1rJ_QTdwf47rcJ94nzRxzXbGmjyWjR_uQ';

const FORM_URL = `https://docs.google.com/forms/d/e/${FORM_EMBED_ID}/viewform?embedded=true`;

export default function ThreeSixtyFeedbackPage() {
  const configured = FORM_EMBED_ID !== 'FORM_ID_HERE';

  return (
    <div className="px-5 py-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-black uppercase tracking-[0.15em] mb-2 text-center">360 Feedback</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)] text-center">
        Share feedback. Leave the name field blank to submit anonymously.
      </p>

      {configured ? (
        <div className="mx-auto border border-[var(--border)] bg-[var(--card-background)]" style={{ maxWidth: 770 }}>
          <iframe
            src={FORM_URL}
            width="100%"
            height="1400"
            frameBorder={0}
            marginHeight={0}
            marginWidth={0}
            title="360 Feedback Form"
          >
            Loading…
          </iframe>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[var(--border)] bg-[var(--card-background)] p-6 font-mono text-xs">
          <p className="mb-2 font-black uppercase tracking-wider">Form not yet configured</p>
          <p className="text-[var(--text-secondary)]">
            Set <code>FORM_EMBED_ID</code> in <code>src/app/team/360-feedback/page.tsx</code> to
            the ID from the Google Form embed link (the segment after <code>/d/e/</code>).
          </p>
        </div>
      )}
    </div>
  );
}
