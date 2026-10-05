'use client';

import { FormEvent, useState } from 'react';
import {
  SURVEYS,
  surveyPlan,
  type SurveyAnswerValue,
  type SurveyQuestion,
  type SurveySource,
  type SurveyType,
} from '@/lib/surveys';
import { contest } from '@/contest.config';

type Answers = Record<string, SurveyAnswerValue>;

export default function SurveyForm({
  type,
  source,
  initialAnswers = {},
}: {
  type: SurveyType;
  source: SurveySource;
  /** Pre-filled answers from the link, e.g. /feedback?watch=stream picks the livestream path. */
  initialAnswers?: Answers;
}) {
  const def = SURVEYS[type];
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const plan = surveyPlan(type, answers);
  const sections = def.sections.filter((s) => plan.sectionIds.has(s.id));
  const totalSteps = sections.length + 1;
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [allowQuote, setAllowQuote] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [hp, setHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const setAnswer = (key: string, value: SurveyAnswerValue | undefined) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
      else next[key] = value;
      return next;
    });
    setMissing((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const required = plan.questions.filter((q) => q.required && answers[q.key] === undefined);
    if (required.length > 0) {
      setMissing(new Set(required.map((q) => q.key)));
      setError('A few required questions still need an answer. Look for the red bar.');
      document.getElementById(`q-${required[0].key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const optIns = answers.keep_me_posted;
    if (Array.isArray(optIns) && optIns.length > 0 && !contactEmail.trim()) {
      setError('You asked for updates. Add your email in Follow-Up so we can send them.');
      document.getElementById('contact_email')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_type: type,
          source,
          answers,
          contact_name: contactName,
          contact_email: contactEmail,
          allow_quote: allowQuote,
          quote_text: quoteText,
          _hp: hp,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setError(json.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="border border-gold bg-navy p-6 sm:p-8">
        <span className="inline-block bg-gold text-navy-deep text-xs font-black tracking-widest px-2 py-0.5 mb-3">THANK YOU</span>
        <h2 className="font-display font-black text-3xl text-white mb-3">Got it. Thank you.</h2>
        <p className="text-sm text-text-body leading-relaxed">
          Your answers go straight into planning {contest.nextShortName}. See you next year.
        </p>
        <a
          href={contest.links.events}
          className="inline-block mt-5 border border-navy-border text-gold font-black tracking-caps px-4 py-3 text-xs hover:border-gold"
        >
          SEE MORE FROM {contest.organizer.name.toUpperCase()} →
        </a>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-12" noValidate>
      <input
        type="text"
        name="_hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {sections.map((section, i) => (
        <section key={section.id}>
          <div className="mb-6">
            <span className="inline-block bg-gold text-navy-deep text-xs font-black tracking-widest px-2 py-0.5 mb-2">
              {i + 1} OF {totalSteps}
            </span>
            <h2 className="font-display font-black text-2xl text-white">{section.title}</h2>
            <div className="w-12 h-0.5 bg-gold mt-2" />
            {section.blurb && <p className="text-sm text-text-muted mt-3">{section.blurb}</p>}
          </div>
          <div className="space-y-7">
            {section.questions
              .filter((q) => plan.questionKeys.has(q.key))
              .map((q) => (
                <Question
                  key={q.key}
                  q={q}
                  value={answers[q.key]}
                  onChange={(v) => setAnswer(q.key, v)}
                  missing={missing.has(q.key)}
                />
              ))}
          </div>
        </section>
      ))}

      <section>
        <div className="mb-6">
          <span className="inline-block bg-gold text-navy-deep text-xs font-black tracking-widest px-2 py-0.5 mb-2">
            {totalSteps} OF {totalSteps}
          </span>
          <h2 className="font-display font-black text-2xl text-white">Follow-Up</h2>
          <div className="w-12 h-0.5 bg-gold mt-2" />
          <p className="text-sm text-text-muted mt-3">Optional. Only if you&apos;re open to us reaching back out.</p>
        </div>
        <div className="space-y-6">
          <div>
            <label htmlFor="contact_name" className={labelCls}>Your name</label>
            <input id="contact_name" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={120} className={inputCls} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="contact_email" className={labelCls}>Email</label>
            <input id="contact_email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={254} className={inputCls} autoComplete="email" />
          </div>
          <label className="flex items-start gap-3 text-sm text-text-body cursor-pointer">
            <input type="checkbox" checked={allowQuote} onChange={(e) => setAllowQuote(e.target.checked)} className="mt-1 h-4 w-4 accent-[#C9A84C]" />
            <span>It&apos;s OK to quote my answers publicly: sponsor decks, social posts, recaps.</span>
          </label>
          {allowQuote && (
            <div>
              <label htmlFor="quote_text" className={labelCls}>Anything you want quoted?</label>
              <textarea
                id="quote_text"
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                maxLength={1000}
                rows={3}
                className={inputCls}
                placeholder="Otherwise we'll pull from your answers above."
              />
            </div>
          )}
        </div>
      </section>

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto bg-red text-white font-black tracking-caps text-sm px-8 py-4 hover:bg-red-dark disabled:opacity-50"
        >
          {submitting ? 'SENDING…' : 'SEND FEEDBACK'}
        </button>
        {error && <p className="border-l-4 border-red pl-3 text-white text-sm mt-4" role="alert">{error}</p>}
        <p className="text-xs text-text-muted mt-4">
          Questions? <a href={`mailto:${contest.contactEmail}`} className="text-gold hover:text-gold-light">{contest.contactEmail}</a>
        </p>
      </div>
    </form>
  );
}

const labelCls = 'block text-xs font-black tracking-caps text-gold mb-1.5';
const inputCls =
  'w-full bg-navy-deep border border-navy-border px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold transition-colors';

function missingCls(missing: boolean) {
  return missing ? 'border-l-4 border-red pl-3' : '';
}

function MissingNote() {
  return <span className="block text-xs font-bold text-gold-light mt-1">Answer this one to send.</span>;
}

function chipCls(selected: boolean) {
  return `min-h-[44px] px-3 py-2 text-sm font-semibold border transition-colors text-left ${
    selected
      ? 'bg-gold text-navy-deep border-gold'
      : 'bg-navy-deep text-text-body border-navy-border hover:border-gold'
  }`;
}

function Question({
  q,
  value,
  onChange,
  missing,
}: {
  q: SurveyQuestion;
  value: SurveyAnswerValue | undefined;
  onChange: (v: SurveyAnswerValue | undefined) => void;
  missing: boolean;
}) {
  const id = `q-${q.key}`;
  const legend = (
    <legend className="block text-sm font-bold mb-2 text-white">
      {q.label}
      {q.required && <span className="text-gold"> *</span>}
      {q.hint && <span className="block text-xs font-normal text-text-muted mt-0.5">{q.hint}</span>}
      {missing && <MissingNote />}
    </legend>
  );

  if (q.kind === 'text' || q.kind === 'short') {
    return (
      <div id={id} className={missingCls(missing)}>
        <label htmlFor={`${id}-input`} className="block text-sm font-bold mb-2 text-white">
          {q.label}
          {q.required && <span className="text-gold"> *</span>}
          {q.hint && <span className="block text-xs font-normal text-text-muted mt-0.5">{q.hint}</span>}
          {missing && <MissingNote />}
        </label>
        {q.kind === 'text' ? (
          <textarea
            id={`${id}-input`}
            rows={3}
            maxLength={q.maxLength}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={inputCls}
          />
        ) : (
          <input
            id={`${id}-input`}
            maxLength={q.maxLength}
            placeholder={q.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={inputCls}
          />
        )}
      </div>
    );
  }

  if (q.kind === 'scale5' || q.kind === 'nps') {
    const points = q.kind === 'nps' ? Array.from({ length: 11 }, (_, i) => i) : [1, 2, 3, 4, 5];
    return (
      <fieldset id={id} className={missingCls(missing)}>
        {legend}
        <div className={`grid gap-1.5 ${q.kind === 'nps' ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5'}`}>
          {points.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={value === n}
              onClick={() => onChange(value === n ? undefined : n)}
              className={`${chipCls(value === n)} text-center px-0`}
            >
              {n}
            </button>
          ))}
        </div>
        {q.scaleLabels && (
          <div className="flex justify-between text-xs text-text-muted mt-1.5">
            <span>{q.scaleLabels[0]}</span>
            <span>{q.scaleLabels[1]}</span>
          </div>
        )}
      </fieldset>
    );
  }

  const options = q.options ?? [];
  const selected = q.kind === 'multi' ? (Array.isArray(value) ? value : []) : [];

  return (
    <fieldset id={id} className={missingCls(missing)}>
      {legend}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {options.map((opt) => {
          const isOn = q.kind === 'multi' ? selected.includes(opt) : value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={isOn}
              onClick={() => {
                if (q.kind === 'multi') {
                  onChange(isOn ? selected.filter((x) => x !== opt) : [...selected, opt]);
                } else {
                  onChange(isOn ? undefined : opt);
                }
              }}
              className={chipCls(isOn)}
            >
              {q.kind === 'multi' && <span aria-hidden="true" className="mr-2">{isOn ? '■' : '□'}</span>}
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
