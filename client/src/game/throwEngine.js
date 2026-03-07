export class ThrowEngine {
  constructor() {
    this.caughtBalloons = new Map();
  }

  catchBalloon(balloon, hand) {
    balloon.state = 'caught';
    balloon.attachedHand = hand;
    this.caughtBalloons.set(balloon.id, { balloon, hand });
  }

  update(handStates) {
    for (const [, entry] of this.caughtBalloons) {
      const hand = handStates[entry.hand];
      if (hand) {
        entry.balloon.x = hand.palmPos.x;
        entry.balloon.y = hand.palmPos.y;
      }
    }
  }

  checkFlick(handTracker, handStates) {
    const released = [];

    for (const [id, entry] of this.caughtBalloons) {
      const hand = handStates[entry.hand];
      if (!hand) continue;

      const flick = handTracker.detectFlick(hand);
      if (flick.isFlick) {
        entry.balloon.vx = flick.direction.x * 12;
        entry.balloon.vy = flick.direction.y * 12;
        entry.balloon.state = 'thrown';
        released.push(id);
      }
    }

    for (const id of released) {
      this.caughtBalloons.delete(id);
    }

    return released.length;
  }

  reset() {
    this.caughtBalloons.clear();
  }
}
