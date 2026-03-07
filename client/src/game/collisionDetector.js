import { CONFIG } from '../config.js';

export class CollisionDetector {
  checkBodyCollision(balloon, bodyBox) {
    if (!bodyBox || bodyBox.width === 0) return null;

    const closestX = Math.max(bodyBox.x, Math.min(balloon.x, bodyBox.x + bodyBox.width));
    const closestY = Math.max(bodyBox.y, Math.min(balloon.y, bodyBox.y + bodyBox.height));

    const dx = balloon.x - closestX;
    const dy = balloon.y - closestY;

    if (dx * dx + dy * dy <= balloon.radius * balloon.radius) {
      return { x: closestX, y: closestY };
    }
    return null;
  }

  checkHandCatch(balloon, handState) {
    if (!handState.isOpen) return false;

    const dx = balloon.x - handState.palmPos.x;
    const dy = balloon.y - handState.palmPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist <= CONFIG.HAND_CATCH_RADIUS + balloon.radius;
  }
}
