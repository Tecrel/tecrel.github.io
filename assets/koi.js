const pond = document.querySelector('.koi-background');
const water = pond?.getContext('2d');

// Half-widths in tile units, from the base of the tail to the nose.
const bodyWidths = [
  .73, .80, .88, .97, 1.09, 1.23, 1.38, 1.54, 1.72, 1.88, 2.04, 2.19,
  2.32, 2.43, 2.50, 2.53, 2.51, 2.47, 2.39, 2.28, 2.16, 1.98, 1.65, 1.10, 0,
];
const tailBase = -11;
const tailTip = -16;
const nose = tailBase + bodyWidths.length - 1;
const columns = Array.from({ length: nose - tailTip }, (_, column) => {
  const forward = nose - .5 - column;
  const tiles = [];
  for (let side = -4; side <= 4; side++) {
    if (inKoi(forward, Math.abs(side))) {
      const shade = ((column * 19 + side * 23) & 15) / 15;
      tiles.push({ side, opacity: .16 + shade * .11 });
    }
  }
  return tiles;
});
const startingPositions = [
  [.68, .22, .22], [.26, .29, 2.95], [.89, .64, -1.8], [.11, .78, -.55],
];
const compactPositions = [[.75, .27, .27], [.25, .12, 2.82], [.71, .72, -1.3]];
const fishColor = '#555750';
const trailColor = '#ad321f';
const strokeTravel = .33;

function newFish([column, row, heading], width, height, compact) {
  const pitch = compact ? 4.2 + Math.random() * 1.25 : 7.4 + Math.random() * 2.0;
  const direction = heading + (Math.random() - .5) * .7;
  const x = (column + (Math.random() - .5) * .07) * width;
  const y = (row + (Math.random() - .5) * .07) * height;
  const cosine = Math.cos(direction);
  const sine = Math.sin(direction);
  const speed = (compact ? 23 : 33) + Math.random() * 15;
  const fish = {
    pitch,
    speed,
    velocity: speed * .89,
    heading: direction,
    turn: 0,
    stroke: Math.random() * Math.PI * 2,
    strokeRate: 2.95 + Math.random() * .6,
    wanderPhase: Math.random() * Math.PI * 2,
    wanderRate: .32 + Math.random() * .33,
    spine: columns.map((_, index) => ({
      x: x + (nose - .5 - index) * pitch * cosine,
      y: y + (nose - .5 - index) * pitch * sine,
      cosine,
      sine,
    })),
    emissionClock: 0,
    bubbles: [],
  };
  for (let i = 1; i <= 13; i++) {
    emitBubble(fish, i * .14);
  }
  return fish;
}

function tailSway(fish, index, age = 0) {
  const rear = Math.max(0, (index - 4) / (columns.length - 5));
  const phase = fish.stroke - fish.strokeRate * (age + rear * strokeTravel);
  return fish.pitch * .95 * rear * rear * Math.sin(phase);
}

function emitBubble(fish, age = 0) {
  const index = fish.spine.length - 1;
  const tail = fish.spine[index];
  const lag = fish.pitch * .56 + fish.velocity * age;
  const spread = tailSway(fish, index, age)
    + (Math.random() - .5) * fish.pitch * 1.25;
  const drift = (Math.random() - .5) * fish.pitch * 1.35;
  const wake = fish.pitch * (.12 + Math.random() * .28);
  fish.bubbles.push({
    x: tail.x - lag * tail.cosine - spread * tail.sine,
    y: tail.y - lag * tail.sine + spread * tail.cosine,
    driftX: -wake * tail.cosine - drift * tail.sine,
    driftY: -wake * tail.sine + drift * tail.cosine,
    radius: Math.max(.95, fish.pitch * (.13 + Math.random() * .32)),
    life: 1.35 + Math.random() * 1.10,
    age,
  });
}

function moveFish(fish, dt, width, height) {
  fish.stroke += fish.strokeRate * dt;
  const push = Math.cos(fish.stroke - fish.strokeRate * strokeTravel) ** 2;
  const targetSpeed = fish.speed * (.85 + .075 * push);
  fish.velocity += (targetSpeed - fish.velocity) * (1 - Math.exp(-dt * 4));

  const head = fish.spine[0];
  const aheadX = head.x + head.cosine * fish.speed * 2.8;
  const aheadY = head.y + head.sine * fish.speed * 2.8;
  const margin = Math.min(width, height) * .23;
  const edge = Math.min(aheadX, aheadY, width - aheadX, height - aheadY);
  const bias = Math.max(0, Math.min(1, 1 - edge / margin));
  const inward = Math.atan2(height / 2 - head.y, width / 2 - head.x) - fish.heading;
  const turnInward = Math.max(-.66, Math.min(.66, Math.atan2(Math.sin(inward), Math.cos(inward))));
  fish.wanderPhase += fish.wanderRate * dt;
  const wander = Math.sin(fish.wanderPhase) * .23;
  const targetTurn = wander * (1 - bias) + turnInward * bias;
  fish.turn += (targetTurn - fish.turn) * (1 - Math.exp(-dt * 3.4));
  fish.heading += fish.turn * dt;

  const cosine = Math.cos(fish.heading);
  const sine = Math.sin(fish.heading);
  const distance = fish.velocity * dt;
  head.x += cosine * distance;
  head.y += sine * distance;
  head.cosine = cosine;
  head.sine = sine;

  // Each segment follows the one ahead, so the tail follows through the turn.
  for (let index = 1; index < fish.spine.length; index++) {
    const front = fish.spine[index - 1];
    const segment = fish.spine[index];
    const angle = Math.atan2(front.y - segment.y, front.x - segment.x);
    segment.cosine = Math.cos(angle);
    segment.sine = Math.sin(angle);
    segment.x = front.x - fish.pitch * segment.cosine;
    segment.y = front.y - fish.pitch * segment.sine;
  }

  for (const bubble of fish.bubbles) bubble.age += dt;
  fish.bubbles = fish.bubbles.filter(bubble => bubble.age < bubble.life);
  fish.emissionClock += (5 + 2 * push) * dt;
  if (fish.emissionClock >= 1) {
    emitBubble(fish);
    fish.emissionClock -= 1;
  }
}

function drawFish(context, fish) {
  context.strokeStyle = trailColor;
  context.fillStyle = trailColor;
  context.lineWidth = Math.max(.65, fish.pitch * .105);
  for (const bubble of fish.bubbles) {
    const progress = bubble.age / bubble.life;
    if (progress >= 1) continue;
    const x = bubble.x + bubble.driftX * bubble.age;
    const y = bubble.y + bubble.driftY * bubble.age;
    const radius = bubble.radius * (.73 + progress * .55);
    const opacity = .62 * (1 - progress) ** 1.2 * Math.min(1, .55 + bubble.age * 6);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.globalAlpha = opacity * .12;
    context.fill();
    context.globalAlpha = opacity;
    context.stroke();
  }

  const square = fish.pitch * .70;
  context.fillStyle = fishColor;
  for (let index = 0; index < columns.length; index++) {
    const segment = fish.spine[index];
    const sway = tailSway(fish, index);
    for (const tile of columns[index]) {
      const offset = tile.side * fish.pitch + sway;
      const x = segment.x - offset * segment.sine;
      const y = segment.y + offset * segment.cosine;
      context.globalAlpha = tile.opacity;
      context.fillRect(x - square / 2, y - square / 2, square, square);
    }
  }
  context.globalAlpha = 1;
}

function inKoi(forward, cross) {
  const offset = forward - tailBase;
  if (offset >= 0) {
    const index = Math.floor(offset);
    const width = bodyWidths[index] + (bodyWidths[index + 1] - bodyWidths[index]) * (offset - index);
    if (cross < width) return true;
  }

  if (offset < 0) {
    const depth = -offset;
    const width = Math.min(.78 + depth * .69, 4.2 - depth * .38);
    return cross < width && cross >= Math.max(0, depth - 2.3) * .72;
  }

  const fin = (forward - 5.8 + (cross - 1.9) * 1.55) / 1.85;
  return cross > 1.9 && fin * fin + ((cross - 2.3) / 1.25) ** 2 < 1;
}

if (water) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopCount = 3 + Math.floor(Math.random() * 2);
  const compactCount = 2 + Math.floor(Math.random() * 2);
  let width = 0;
  let height = 0;
  let school = [];
  let inView = false;
  let animation = 0;
  let lastFrame = 0;
  function draw() {
    water.clearRect(0, 0, width, height);
    for (const fish of school) drawFish(water, fish);
  }

  function tick(timestamp) {
    animation = 0;
    const dt = lastFrame ? Math.min(timestamp - lastFrame, 50) / 1000 : 0;
    lastFrame = timestamp;
    for (const fish of school) moveFish(fish, dt, width, height);
    draw();
    sync();
  }

  function sync() {
    const playing = inView && !document.hidden && !reduceMotion.matches;
    if (playing && !animation) animation = requestAnimationFrame(tick);
    if (!playing && animation) {
      cancelAnimationFrame(animation);
      animation = 0;
      lastFrame = 0;
    }
  }

  new ResizeObserver(([entry]) => {
    width = entry.contentRect.width;
    height = entry.contentRect.height;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    pond.width = Math.round(width * ratio);
    pond.height = Math.round(height * ratio);
    water.setTransform(ratio, 0, 0, ratio, 0, 0);
    const compact = width < 620;
    school = (compact ? compactPositions : startingPositions).slice(0, compact ? compactCount : desktopCount)
      .map(position => newFish(position, width, height, compact));
    draw();
  }).observe(pond);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }).observe(pond);
  reduceMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
}
