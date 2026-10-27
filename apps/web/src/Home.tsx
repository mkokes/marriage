import { parseTableCode } from '@marriage/protocol';
import { useState, type FormEvent } from 'react';
import { useI18n } from './i18n';
import { navigate } from './router';

export function Home() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState(false);

  const join = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseTableCode(code);
    // Four letters that can't be a code (e.g. with a vowel) get the "no such table" page.
    if (parsed || /^[A-Z]{4}$/.test(code)) navigate(`?table=${parsed ?? code}`);
    else setProblem(true);
  };

  return (
    <main className="home">
      <div className="dhaka-band" aria-hidden="true" />
      <section className="home__hero">
        <h1 className="home__title">{t.home.title}</h1>
        <p className="home__lede">{t.home.lede}</p>
        <button type="button" className="button button--primary" onClick={() => navigate('?new')}>
          {t.home.start}
        </button>
      </section>
      <form className="home__join" onSubmit={join} noValidate>
        <label htmlFor="code">{t.home.codeLabel}</label>
        <div className="field-row">
          <input
            id="code"
            className="code-input"
            value={code}
            maxLength={4}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setProblem(false);
            }}
            placeholder="QXRT"
            lang="en"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={problem ? 'code-problem' : undefined}
          />
          <button type="submit" className="button">
            {t.home.join}
          </button>
        </div>
        {problem && (
          <p id="code-problem" className="field-problem" role="alert">
            {t.home.codeProblem}
          </p>
        )}
      </form>
    </main>
  );
}
