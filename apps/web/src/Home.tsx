import { parseTableCode } from '@marriage/protocol';
import { useState, type FormEvent } from 'react';
import { navigate } from './router';

export function Home() {
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const join = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseTableCode(code);
    // Four letters that can't be a code (e.g. with a vowel) get the "no such table" page.
    if (parsed || /^[A-Z]{4}$/.test(code)) navigate(`?table=${parsed ?? code}`);
    else setProblem('Table codes are four letters, like QXRT.');
  };

  return (
    <main className="home">
      <div className="dhaka-band" aria-hidden="true" />
      <section className="home__hero">
        <h1 className="home__title">Marriage</h1>
        <p className="home__lede">
          The three-deck rummy of Dashain nights. Start a table, send the code, and play with family
          wherever they are.
        </p>
        <button type="button" className="button button--primary" onClick={() => navigate('?new')}>
          Start a table
        </button>
      </section>
      <form className="home__join" onSubmit={join} noValidate>
        <label htmlFor="code">Have a table code?</label>
        <div className="field-row">
          <input
            id="code"
            className="code-input"
            value={code}
            maxLength={4}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setProblem(null);
            }}
            placeholder="QXRT"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={problem ? 'code-problem' : undefined}
          />
          <button type="submit" className="button">
            Join
          </button>
        </div>
        {problem && (
          <p id="code-problem" className="field-problem" role="alert">
            {problem}
          </p>
        )}
      </form>
    </main>
  );
}
