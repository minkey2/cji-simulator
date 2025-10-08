// Game settings
const WIN_SCORE = 5; // hardcoded win target
const TARGET_SPEED = 120; // base pixels per second
const BLAST_DURATION = 100; // ms

// DOM
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const bulletTpl = document.getElementById('bullet-template');
const target = document.getElementById('target');
const blast = document.getElementById('blast');
const scoreValue = document.getElementById('score-value');
const winSplash = document.getElementById('win-splash');

let score = 0;
// single-bullet mode
let isBulletFired = false;
let currentBullet = null;
let lastTime = null;
let targetX = null;
let targetDir = 1; // 1 = moving right, -1 = moving left
let currentTargetSpeed = TARGET_SPEED;
let startTimestamp = null;
let runTime = 0;
let reloadTimer = null;
let reloadCountdown = 5;

function init(){
  // Place target offscreen to the right
  resetTarget();
  bindInput();
  // ensure idle bullet visible and positioned
  positionIdleBullet();
  startTimestamp = performance.now();
  reloadCountdown = 5;
  requestAnimationFrame(loop);
}

function positionIdleBullet(){
  if(!bulletTpl) return;
  // position the template above the player's center
  const pRect = player.getBoundingClientRect();
  const gRect = gameArea.getBoundingClientRect();
  const startX = pRect.left - gRect.left + pRect.width/2;
  const startY = pRect.top - gRect.top - 8;
  bulletTpl.style.left = startX + 'px';
  bulletTpl.style.top = startY + 'px';
}

function resetTarget(){
  // start just off the left side and move right
  target.style.transition = 'none';
  // place target roughly centered horizontally
  const gW = gameArea.clientWidth || 600;
  targetX = Math.max(20, (gW - target.offsetWidth) / 2);
  target.style.left = targetX + 'px';
  // randomize vertical
  // upper half: 8% - 36%
  const top = 8 + Math.random()*28; // percent
  target.style.top = top + '%';
  // small random speed variation per pass
  currentTargetSpeed = TARGET_SPEED * (0.8 + Math.random()*0.8);
}

function bindInput(){
  // click / tap on game area
  gameArea.addEventListener('click', shoot);
  // touch
  gameArea.addEventListener('touchstart', (e)=>{ e.preventDefault(); shoot(); }, {passive:false});
  // spacebar
  window.addEventListener('keydown', (e)=>{ if(e.code==='Space'){ e.preventDefault(); shoot(); } });
}

function shoot(){
  // only allow one bullet at a time
  if(isBulletFired) return;
  // create bullet element from template
  const b = bulletTpl.cloneNode(true);
  b.removeAttribute('id');
  // ensure cloned bullet has the bullet class for styling
  b.classList.add('bullet');
  b.style.display = 'block';
  // position bullet at player's nose (approx center-right of player)
  const pRect = player.getBoundingClientRect();
  const gRect = gameArea.getBoundingClientRect();
  // spawn at top-center of player
  const startX = pRect.left - gRect.left + pRect.width/2;
  const startY = pRect.top - gRect.top - 8; // slightly above the player
  b.style.left = startX + 'px';
  b.style.top = startY + 'px';
  b.speed = 200; // px/s (vertical speed now)
  isBulletFired = true;
  currentBullet = b;
  gameArea.appendChild(b);
}

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = (ts - lastTime)/100;
  lastTime = ts;

  // update runtime
  if(startTimestamp){
    runTime = (ts - startTimestamp)/1000;
    const tv = document.getElementById('time-value');
    if(tv) tv.textContent = runTime.toFixed(2);
  }

  // move target
  moveTarget(dt);

  // move bullets
  updateBullets(dt);

  // collision
  checkCollisions();

  requestAnimationFrame(loop);
}

function moveTarget(dt){
  if(targetX === null) targetX = 0;
  // move horizontally and bounce at edges
  const gW = gameArea.clientWidth;
  targetX += currentTargetSpeed * dt * targetDir;
  // bounce when hitting edges (keep target fully onscreen)
  if(targetX <= 0){
    targetX = 0;
    targetDir = 1;
  } else if(targetX + target.offsetWidth >= gW){
    targetX = Math.max(0, gW - target.offsetWidth);
    targetDir = -1;
  }
  target.style.left = targetX + 'px';
}

function updateBullets(dt){
  if(!isBulletFired || !currentBullet) return;
  const b = currentBullet;
  const y = parseFloat(b.style.top || 0);
  // store previous top so we can detect crossing the target center
  b.prevTop = y;
  const ny = y - b.speed*dt; // move up (decrease top)
  b.style.top = ny + 'px';
  // remove if out of bounds (above the top)
  if(ny < -50){
  b.remove();
  currentBullet = null;
  isBulletFired = false;
  }
}

function rect(el){
  const r = el.getBoundingClientRect();
  const g = gameArea.getBoundingClientRect();
  return {left: r.left - g.left, top: r.top - g.top, right: r.right - g.left, bottom: r.bottom - g.top, width: r.width, height: r.height};
}

function checkCollisions(){
  if(!isBulletFired || !currentBullet) return;
  const tRect = rect(target);
  const bRect = rect(currentBullet);

  // horizontal check: bullet center x inside target horizontal bounds
  const bCenterX = bRect.left + bRect.width/2;
  const horizOverlap = (bCenterX >= tRect.left && bCenterX <= tRect.right);

  // vertical: detect when bullet center crosses the target's vertical center line
  const tCenterY = tRect.top + tRect.height/2;
  const bPrevTop = (currentBullet.prevTop !== undefined) ? currentBullet.prevTop : bRect.top;
  const bPrevCenterY = bPrevTop + bRect.height/2;
  const bCurrCenterY = bRect.top + bRect.height/2;

  const crossedCenter = (bPrevCenterY > tCenterY && bCurrCenterY <= tCenterY) || (bCurrCenterY <= tCenterY && bPrevCenterY === bCurrCenterY);

  if(horizOverlap && crossedCenter){
    // hit
    currentBullet.remove();
    currentBullet = null;
    isBulletFired = false;
  handleHit((bRect.left + bRect.width/2), (tCenterY));
  }
}

function overlap(a,b){
  return !(a.left > b.right || a.right < b.left || a.top > b.bottom || a.bottom < b.top);
}

function handleHit(x,y){
  // show blast at x,y
  blast.style.left = x + 'px';
  blast.style.top = y + 'px';
  blast.style.display = 'block';
  setTimeout(()=>{ blast.style.display = 'none'; }, BLAST_DURATION);

  // increment score and reset target
  score += 1;
  scoreValue.textContent = score;
  if(score >= WIN_SCORE){
    showWin();
  }

  // optionally nudge the target direction after a hit
  targetDir = targetDir || 1;
}

function showWin(){
  // show splash and fill times
  const runEl = document.getElementById('run-time');
  const bestEl = document.getElementById('fastest-time');
  const fastestKey = 'spaceship_fastest_time';
  const current = runTime || 0;
  // read previous fastest
  const prev = parseFloat(localStorage.getItem(fastestKey) || '0') || 0;
  // update fastest if current is faster (smaller) or if none
  if(prev === 0 || current < prev){
    localStorage.setItem(fastestKey, current.toFixed(2));
  }
  const newBest = parseFloat(localStorage.getItem(fastestKey)).toFixed(2);
  if(runEl) runEl.textContent = current.toFixed(2) + 's';
  if(bestEl) bestEl.textContent = (newBest === 'NaN' ? '—' : newBest + 's');

  // show and start countdown to reload
  winSplash.style.display = 'flex';
  const countdownEl = document.getElementById('reload-countdown');
  if(countdownEl) countdownEl.textContent = String(reloadCountdown);
  // clear any existing timer
  if(reloadTimer) clearInterval(reloadTimer);
  reloadTimer = setInterval(()=>{
    reloadCountdown -= 1;
    if(countdownEl) countdownEl.textContent = String(reloadCountdown);
    if(reloadCountdown <= 0){
      clearInterval(reloadTimer);
      // reload the page
      location.reload();
    }
  },1000);
}

// start
window.addEventListener('load', ()=>{
  // hide templates
  bulletTpl.style.display = 'none';
  blast.style.display = 'none';
  init();
});

// restart on win-splash click
winSplash.addEventListener('click', ()=>{
  // immediate reload when user clicks
  location.reload();
});
