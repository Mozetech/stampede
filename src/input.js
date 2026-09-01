// Keyboard, swipe and tap input. Emits direction strings: 'up' | 'down' | 'left' | 'right'.
export class Input {
  constructor(el, onDir, onAny) {
    this.onDir = onDir; this.onAny = onAny;
    const keys = { ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) && e.code !== 'Escape') return;
      const d = keys[e.code];
      onAny?.(e);
      if (d && !e.repeat) { e.preventDefault(); onDir(d); }
    });
    let start = null;
    el.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; onAny?.(e); }, { passive: true });
    const end = (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      start = null;
      if (dist < 18) return onDir('up');
      if (Math.abs(dx) > Math.abs(dy)) onDir(dx > 0 ? 'right' : 'left'); else onDir(dy > 0 ? 'down' : 'up');
    };
    el.addEventListener('pointerup', end, { passive: true });
    el.addEventListener('pointercancel', () => { start = null; }, { passive: true });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
