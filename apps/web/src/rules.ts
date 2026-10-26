import { STANDARD_RULES, type RulesConfig } from '@marriage/engine';

/** Plain-language notes for each way the rules differ from Standard. */
export function ruleChanges(rules: RulesConfig): string[] {
  const s = STANDARD_RULES;
  const notes: string[] = [];
  if (rules.decks !== s.decks) notes.push(`${rules.decks} decks`);
  if (rules.printedJokers !== s.printedJokers)
    notes.push(rules.printedJokers ? 'Printed jokers' : 'No printed jokers');
  if (rules.seeRequirement !== s.seeRequirement) notes.push('Only pure sequences to see');
  if (rules.dublees !== s.dublees) notes.push(rules.dublees ? 'Dublees' : 'No dublees');
  if (rules.discardPickup !== s.discardPickup) {
    notes.push(rules.discardPickup === 'free' ? 'Take any discard' : 'No taking discards');
  }
  if (rules.jhipluPopluWild !== s.jhipluPopluWild) notes.push('Jhiplu and poplu not jokers');
  if (JSON.stringify(rules.maal) !== JSON.stringify(s.maal)) notes.push('Custom maal points');
  if (rules.unseenPenalty !== s.unseenPenalty || rules.seenPenalty !== s.seenPenalty) {
    notes.push(`Penalties ${rules.unseenPenalty}/${rules.seenPenalty}`);
  }
  if (rules.dubleeFinishBonus !== s.dubleeFinishBonus)
    notes.push(`Dublee bonus ${rules.dubleeFinishBonus}`);
  if (rules.kidnap) notes.push('Kidnap');
  if (rules.murder) notes.push('Murder');
  if (rules.turnTimerSeconds !== s.turnTimerSeconds) {
    notes.push(rules.turnTimerSeconds ? `${rules.turnTimerSeconds}s turns` : 'No turn timer');
  }
  if (rules.stockExhausted !== s.stockExhausted) notes.push('Reshuffle when the stock runs out');
  return notes;
}
