import type { Card } from '@marriage/engine';
import { cardName, rankLabel, SUIT_GLYPH } from './cardNames';

interface Props {
  card: Card;
  selected?: boolean;
  /** Marks a wild card for players who have seen. */
  wild?: boolean;
  size?: 'hand' | 'small';
  onClick?: () => void;
}

/** A face-up card: rank and suit in the corner, a large suit in the middle. */
export function PlayingCard({
  card,
  selected = false,
  wild = false,
  size = 'hand',
  onClick,
}: Props) {
  const red = card.kind === 'standard' && (card.suit === 'hearts' || card.suit === 'diamonds');
  const corner =
    card.kind === 'standard' ? (
      <>
        <span>{rankLabel(card.rank)}</span>
        <span>{SUIT_GLYPH[card.suit]}</span>
      </>
    ) : (
      <span>★</span>
    );
  const pip = card.kind === 'standard' ? SUIT_GLYPH[card.suit] : 'Man';
  const className = `card card--${size}${red ? ' card--red' : ''}${selected ? ' card--selected' : ''}`;
  const face = (
    <>
      <span className="card__corner">{corner}</span>
      <span className={card.kind === 'standard' ? 'card__pip' : 'card__pip card__pip--man'}>
        {pip}
      </span>
      {wild && <span className="card__wild" title="Joker" />}
    </>
  );

  return onClick ? (
    <button
      type="button"
      className={className}
      aria-label={`${cardName(card)}${wild ? ', joker' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {face}
    </button>
  ) : (
    <span className={className} role="img" aria-label={cardName(card)}>
      {face}
    </span>
  );
}

/** A face-down card, printed with the dhaka weave. */
export function CardBack({ size = 'hand' }: { size?: 'hand' | 'small' }) {
  return <span className={`card card--${size} card--back`} aria-hidden="true" />;
}
