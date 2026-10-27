import { STANDARD_RULES, type RulesConfig } from '@marriage/engine';
import type { Messages } from './i18n';

/** Plain-language notes for each way the rules differ from Standard. */
export function ruleChanges(rules: RulesConfig, t: Messages): string[] {
  const s = STANDARD_RULES;
  const c = t.rules.changes;
  const notes: string[] = [];
  if (rules.decks !== s.decks) notes.push(c.decks(rules.decks));
  if (rules.printedJokers !== s.printedJokers) {
    notes.push(rules.printedJokers ? c.printedJokers : c.noPrintedJokers);
  }
  if (rules.seeRequirement !== s.seeRequirement) notes.push(c.pureOnly);
  if (rules.dublees !== s.dublees) notes.push(rules.dublees ? c.dublees : c.noDublees);
  if (rules.discardPickup !== s.discardPickup) {
    notes.push(rules.discardPickup === 'free' ? c.pickupFree : c.pickupNever);
  }
  if (rules.jhipluPopluWild !== s.jhipluPopluWild) notes.push(c.jhipluPopluNotWild);
  if (JSON.stringify(rules.maal) !== JSON.stringify(s.maal)) notes.push(c.customMaal);
  if (rules.unseenPenalty !== s.unseenPenalty || rules.seenPenalty !== s.seenPenalty) {
    notes.push(c.penalties(rules.unseenPenalty, rules.seenPenalty));
  }
  if (rules.dubleeFinishBonus !== s.dubleeFinishBonus) {
    notes.push(c.dubleeBonus(rules.dubleeFinishBonus));
  }
  if (rules.kidnap) notes.push(c.kidnap);
  if (rules.murder) notes.push(c.murder);
  if (rules.turnTimerSeconds !== s.turnTimerSeconds) {
    notes.push(rules.turnTimerSeconds ? c.turnSeconds(rules.turnTimerSeconds) : c.noTimer);
  }
  if (rules.stockExhausted !== s.stockExhausted) notes.push(c.reshuffle);
  return notes;
}
