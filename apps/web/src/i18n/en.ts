import { ENGINE_ERRORS, type RuleProblem } from '@marriage/engine';
import { TABLE_ERRORS, type ErrorCode } from '@marriage/protocol';

const n = (x: number) => x.toLocaleString('en');
const signed = (x: number) => (x > 0 ? `+${n(x)}` : n(x));

/**
 * Every piece of text the app shows, in English. `ne.ts` must provide the same keys
 * (TypeScript checks), so a missing translation fails the build.
 */
export const en = {
  language: { name: 'English', switchLabel: 'Language' },
  theme: { switchLabel: 'Theme', system: 'Match device', light: 'Light', dark: 'Dark' },
  format: { number: n, signed },

  common: {
    formerPlayer: 'A former player',
    close: 'Close',
    dismiss: 'Dismiss',
    seen: 'Seen',
    seenDublees: 'Seen with dublees',
    host: 'Host',
    you: 'You',
    bot: 'Bot',
    away: 'away',
    remove: 'Remove',
    removeNamed: (name: string) => `Remove ${name}`,
    tiplu: 'Tiplu',
  },

  home: {
    title: 'Marriage',
    lede: 'The three-deck rummy of Dashain nights. Start a table, send the code, and play with family wherever they are.',
    start: 'Start a table',
    codeLabel: 'Have a table code?',
    join: 'Join',
    codeProblem: 'Table codes are four letters, like QXRT.',
  },

  setup: {
    title: 'Set up your table',
    intro:
      "These are the Standard rules, the most common way to play. Change anything your family plays differently. Once the table is created, you'll get a code to share.",
    yourName: 'Your name',
    create: 'Create table',
    back: 'Back',
  },

  noTable: {
    title: (code: string) => `No table called ${code}`,
    body: 'Check the code with whoever invited you. Codes are four letters, like QXRT.',
    enterAnother: 'Enter another code',
    start: 'Start a table',
  },

  app: {
    joining: (code: string) => `Joining table ${code}…`,
    creating: 'Creating your table…',
    reconnecting: 'Reconnecting…',
  },

  lobby: {
    title: (code: string) => `Table ${code}`,
    shareBefore: "Tell the people you're playing with the code",
    shareAfter: ', or send them this link.',
    inviteLink: 'Invite link',
    copy: 'Copy link',
    copied: 'Copied',
    players: (count: number, max: number) => `Players ${n(count)} of ${n(max)}`,
    addBot: 'Add a bot',
    lockedNote: 'The host has locked this table to new players.',
    leave: 'Leave seat',
    rules: 'Rules',
    standard: 'Standard rules.',
    standardWith: (changes: string[]) => `Standard, with: ${changes.join(', ')}.`,
    changeRules: 'Change rules',
    deal: 'Deal the first hand',
    waitingForPlayer: 'Waiting for at least one more player.',
    hostWillDeal: (host: string) => `${host} will deal when everyone's here.`,
    waitingForHost: 'Waiting for a host.',
  },

  sit: {
    yourName: 'Your name',
    sitDown: 'Sit down',
    removed: 'The host removed you from this table.',
    locked: 'This table is locked. Ask the host to unlock it to sit down.',
    full: "The table is full. You're watching.",
  },

  host: {
    lock: 'Lock table',
    unlock: 'Unlock table',
    lockedHint: 'Locked: nobody new can sit down.',
    unlockedHint: 'Lock it once everyone is here.',
    players: 'Players',
  },

  rules: {
    cards: 'Cards',
    decks: 'Decks',
    printedJokers: 'Add printed jokers (Man)',
    jhipluPopluWild: 'Jhiplu and poplu are jokers',
    play: 'Play',
    seeRequirement: 'To see the tiplu, show',
    seePureOrTunnela: '3 pure sequences or tunnelas',
    seePureOnly: '3 pure sequences',
    dublees: 'Allow seeing with 7 dublees and finishing with an 8th',
    discardPickup: 'Taking the discard',
    pickupCompleteSet: 'Only to complete a set',
    pickupFree: 'Any time',
    pickupNever: 'Never',
    turnTimer: 'Turn timer (seconds, 0 for none)',
    stockExhausted: 'When the stock runs out',
    stockVoid: 'Nobody wins the hand',
    stockReshuffle: 'Reshuffle the discards',
    maalPoints: 'Maal points',
    maal: {
      tiplu: 'Tiplu',
      jhiplu: 'Jhiplu',
      poplu: 'Poplu',
      alter: 'Alter',
      man: 'Man (printed joker)',
      marriage: 'Marriage',
      tunnela: 'Tunnela',
    },
    settling: 'Settling up',
    unseenPenalty: 'Unseen players pay',
    seenPenalty: 'Seen players pay',
    dubleeFinishBonus: 'Dublee win bonus',
    kidnap: "Kidnap: the winner takes unseen players' maal",
    murder: "Murder: unseen players' maal counts for nothing",
    reset: 'Reset to Standard',
    save: 'Save rules',
    problem: (p: RuleProblem) => {
      switch (p.kind) {
        case 'amount':
          return `Use a whole number from 0 to ${n(p.max)}.`;
        case 'kidnapAndMurder':
          return "Kidnap and murder can't both be on.";
        default:
          return "Some of these settings aren't valid.";
      }
    },
    changes: {
      decks: (count: number) => `${n(count)} decks`,
      printedJokers: 'Printed jokers',
      noPrintedJokers: 'No printed jokers',
      pureOnly: 'Only pure sequences to see',
      dublees: 'Dublees',
      noDublees: 'No dublees',
      pickupFree: 'Take any discard',
      pickupNever: 'No taking discards',
      jhipluPopluNotWild: 'Jhiplu and poplu not jokers',
      customMaal: 'Custom maal points',
      penalties: (unseen: number, seen: number) => `Penalties ${n(unseen)}/${n(seen)}`,
      dubleeBonus: (bonus: number) => `Dublee bonus ${n(bonus)}`,
      kidnap: 'Kidnap',
      murder: 'Murder',
      turnSeconds: (s: number) => `${n(s)}s turns`,
      noTimer: 'No turn timer',
      reshuffle: 'Reshuffle when the stock runs out',
    },
  },

  game: {
    table: (code: string) => `Table ${code}`,
    hand: (number: number) => `Hand ${n(number)}`,
    scores: 'Scores',
    cards: (count: number) => `${n(count)} cards`,
    tableRegion: 'Table',
    drawStock: (count: number) => `Draw from the stock, ${n(count)} cards`,
    takeDiscard: 'Take the discard',
    discardEmpty: 'The discard pile is empty',
    turnOf: (name: string) => `${name}'s turn`,
    watching: (name: string) => `Watching: ${name}'s turn`,
    yourTurnComplete:
      'Your turn. Draw from the stock, or select the cards the discard completes and take it.',
    yourTurn: 'Your turn. Draw from the stock or take the discard.',
    canShow: 'You can show your sets as you discard.',
    canFinish: 'You can finish the game with this discard.',
    selectDiscard: 'Select one card to discard.',
    seconds: (s: number) => `${n(s)}s`,
    yourCards: 'Your cards',
    discard: 'Discard',
    discardShow: 'Discard and show',
    discardFinish: 'Discard and finish',
    moveHere: 'Move here',
    newGroup: 'New group',
    sortSuit: 'Sort by suit',
    sortRank: 'Sort by rank',
    clearSelection: 'Clear selection',
    sets: {
      pureSequence: 'Pure sequence',
      tunnela: 'Tunnela',
      trial: 'Trial',
      sequence: 'Sequence',
      dirtyTrial: 'Trial with joker',
      dublee: 'Dublee',
    },
  },

  results: {
    wins: (name: string) => `${name} wins`,
    winsDublees: (name: string) => `${name} wins with dublees`,
    noWinner: 'No winner: the stock ran out',
    tipluWas: 'The tiplu was',
    maal: (points: number) => `Maal ${n(points)}`,
    watchReplay: 'Watch a replay of this hand',
    endSession: 'End session',
    dealNext: 'Deal the next hand',
    waitingNext: 'Waiting for the host to deal the next hand.',
    thanks: 'Thanks for playing',
    hands: 'Hands',
    handWon: (hand: number, name: string) => `Hand ${n(hand)}: ${name} won`,
    handNoWinner: (hand: number) => `Hand ${n(hand)}: no winner`,
    replay: 'Replay',
    newTable: 'Start a new table',
  },

  scores: {
    caption: (hands: number) =>
      `Session totals after ${n(hands)} ${hands === 1 ? 'hand' : 'hands'}`,
  },

  chat: {
    open: 'Chat',
    title: 'Chat',
    region: 'Table chat',
    empty: 'No messages yet. Say namaste.',
    reactions: 'Send a reaction',
    message: 'Message',
    send: 'Send',
    sitToChat: 'Sit down to chat.',
    reacted: (emoji: string) => `reacted ${emoji}`,
  },

  replay: {
    title: (hand: number) => `Hand ${n(hand)} replay`,
    inStock: (count: number) => `${n(count)} in stock`,
    step: (i: number, total: number) => `Step ${n(i)} of ${n(total)}`,
    start: 'Start',
    back: 'Back',
    play: 'Play',
    pause: 'Pause',
    again: 'Replay',
    next: 'Next',
    end: 'End',
    dealt: (first: string) => `Cards dealt. ${first} goes first.`,
    drewStock: (who: string) => `${who} drew from the stock.`,
    tookDiscard: (who: string, card: string) => `${who} took ${card} from the discard pile.`,
    discarded: (who: string, card: string) => `${who} discarded ${card}.`,
    discardedShowedSets: (who: string, card: string) =>
      `${who} discarded ${card} and showed three sets.`,
    discardedShowedDublees: (who: string, card: string) =>
      `${who} discarded ${card} and showed seven dublees.`,
    finished: (who: string, card: string) => `${who} discarded ${card} and finished.`,
    played: (who: string) => `${who} played.`,
    aCard: 'a card',
    theCard: (name: string) => `the ${name.toLowerCase()}`,
  },

  cards: {
    rank: { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' } as Record<number, string>,
    suit: { clubs: 'clubs', diamonds: 'diamonds', hearts: 'hearts', spades: 'spades' },
    name: (rank: string, suit: string) => `${rank} of ${suit}`,
    joker: 'Joker',
    wild: 'joker',
    man: 'Man',
  },

  errors: { ...ENGINE_ERRORS, ...TABLE_ERRORS } as Record<ErrorCode, string>,
};

export type Messages = typeof en;
