// input.js — keyboard and mouse, one place. Keys are read as a held set so
// the physics can poll them every frame; edges (gear, pause, restart) fire
// once per press through the callback the main loop installs.

export function makeInput() {
  return {
    up: false,      // throttle up (W / ArrowUp)
    down: false,    // throttle down (S / ArrowDown)
    left: false,    // pitch up (A / ArrowLeft)
    right: false,   // pitch down (D / ArrowRight)
    boost: false,   // Space, edge-triggered by the main loop
    mouseActive: false,
    mouseX: 0,
    mouseY: 0,
    wheel: 0,       // accumulated wheel delta, consumed by the physics step
    onKey: null,    // (code) => void, installed by main.js for edge actions
    onClick: null,  // (x, y) => void, title-screen leg picking
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'boost',
};

export function bindInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    const field = KEYMAP[e.code];
    if (field) {
      if (field === 'boost' && !e.repeat) input.boost = true;
      else if (field !== 'boost') input[field] = true;
    }
    if (!e.repeat && input.onKey) input.onKey(e.code);
  });
  window.addEventListener('keyup', (e) => {
    const field = KEYMAP[e.code];
    if (field && field !== 'boost') input[field] = false;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.mouseActive = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
    input.mouseActive = true;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouseActive = false;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.wheel += -Math.sign(e.deltaY);
  }, { passive: false });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (input.onClick) input.onClick(e.clientX - rect.left, e.clientY - rect.top);
  });
}
