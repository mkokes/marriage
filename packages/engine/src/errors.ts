/**
 * Every rule violation the engine reports, by stable code, with its English text.
 * Apps translate by code; the English text is the fallback and what tests read.
 */
export const ENGINE_ERRORS = {
  handOver: 'The hand is over',
  notYourTurn: "It isn't your turn",
  alreadyDrawn: 'You have already drawn',
  stockEmpty: 'The stock is empty',
  discardEmpty: 'The discard pile is empty',
  drawFirst: 'Draw a card first',
  cantDiscardPickup: "You can't discard the card you just picked up",
  cardUsedTwice: 'The same card is used twice',
  cardNotInHand: "That card isn't in your hand",
  pickupNotAllowed: 'Taking from the discard pile is not allowed at this table',
  pickupDubleeOnly: 'After seeing with dublees you can only take a discard that makes a dublee',
  pickupMustCompleteSet:
    'You can only take the discard if it completes a set with cards in your hand',
  alreadySeen: 'You have already seen',
  seeSetsOrDublees: 'To see, show three pure sequences or tunnelas, or seven dublees',
  seeSets: 'To see, show three pure sequences or tunnelas',
  seePureOrDublees: 'To see, show three pure sequences, or seven dublees',
  seePure: 'To see, show three pure sequences',
  pickFromStock: 'Pick a card from the stock',
  mustSeeFirst: 'You must see before you can finish',
  needEighthDublee: 'Finishing with dublees needs an eighth dublee',
  everyCardInOneSet: 'Every card in your hand must be in exactly one set',
  invalidSet: "One of your groups isn't a valid set",
  malformedAction: 'Malformed action',
} as const;

export type EngineErrorCode = keyof typeof ENGINE_ERRORS;
