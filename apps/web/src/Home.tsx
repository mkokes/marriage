import { useState, type FormEvent } from 'react';

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function newTableCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

const openTable = (code: string) => {
  window.location.search = `?table=${encodeURIComponent(code)}`;
};

export function Home() {
  const [code, setCode] = useState('');

  const join = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (trimmed) openTable(trimmed);
  };

  return (
    <main className="home">
      <div className="dhaka-band" aria-hidden="true" />
      <section className="home__hero">
        <h1 className="home__title">Marriage</h1>
        <p className="home__lede">
          The three-deck rummy of Dashain nights. Start a table, send the link, and play with family
          wherever they are.
        </p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => openTable(newTableCode())}
        >
          Start a table
        </button>
      </section>
      <form className="home__join" onSubmit={join}>
        <label htmlFor="code">Have a table code?</label>
        <div className="field-row">
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. k7m2qa"
            autoComplete="off"
            autoCapitalize="none"
          />
          <button type="submit" className="button">
            Join
          </button>
        </div>
      </form>
    </main>
  );
}
