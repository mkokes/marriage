import { useEffect, useState } from 'react';
import { useI18n } from './i18n';
import type { Reactions } from './useTable';

/** How long a reaction stays on screen. */
const SHOW_MS = 3000;

/** The player's latest reaction, shown for a few seconds after it arrives. */
export function ReactionBubble({
  reactions,
  playerId,
}: {
  reactions: Reactions;
  playerId: string;
}) {
  const { t } = useI18n();
  const reaction = reactions[playerId];
  const [expired, setExpired] = useState<number | null>(null);

  useEffect(() => {
    if (!reaction) return undefined;
    const id = setTimeout(
      () => setExpired(reaction.at),
      Math.max(0, reaction.at + SHOW_MS - Date.now()),
    );
    return () => clearTimeout(id);
  }, [reaction]);

  if (!reaction || expired === reaction.at) return null;
  return (
    <span key={reaction.at} className="reaction" aria-label={t.chat.reacted(reaction.emoji)}>
      {reaction.emoji}
    </span>
  );
}
