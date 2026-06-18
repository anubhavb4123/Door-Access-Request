// ============================================
// Door Access Request — Application Logic
// ============================================

import firebaseConfig from './firebase-config.js';

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const requestsRef = db.ref('doorRequests');

// --- DOM Elements ---
const requestCard  = document.getElementById('requestCard');
const successCard  = document.getElementById('successCard');
const nameInput    = document.getElementById('nameInput');
const reasonInput  = document.getElementById('reasonInput');
const holdButton   = document.getElementById('holdButton');
const holdLabel    = document.getElementById('holdButtonLabel');
const progressCircle = document.getElementById('progressCircle');
const errorMessage = document.getElementById('errorMessage');
const bgParticles  = document.getElementById('bgParticles');

// --- Constants ---
const HOLD_DURATION = 2000;                   // 2 seconds
const CIRCUMFERENCE = 2 * Math.PI * 54;       // matches SVG circle r=54
const DUPLICATE_COOLDOWN = 30000;             // 30 seconds cooldown
const STORAGE_KEY = 'doorAccess_lastSubmit';

// --- State ---
let holdTimer = null;
let holdStart = null;
let animFrame = null;
let isSubmitting = false;
let hasSubmitted = false;

// --- Background Particles ---
function createParticles() {
  const count = window.innerWidth < 480 ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.opacity = Math.random() * 0.3 + 0.1;
    bgParticles.appendChild(particle);
  }
}

// --- Duplicate Prevention ---
function canSubmit() {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > DUPLICATE_COOLDOWN;
}

function markSubmitted() {
  localStorage.setItem(STORAGE_KEY, Date.now().toString());
}

// --- Error Display ---
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('visible');
  setTimeout(() => errorMessage.classList.remove('visible'), 4000);
}

function clearError() {
  errorMessage.classList.remove('visible');
}

// --- Progress Animation ---
function updateProgress() {
  if (!holdStart) return;

  const elapsed = Date.now() - holdStart;
  const progress = Math.min(elapsed / HOLD_DURATION, 1);
  const offset = CIRCUMFERENCE * (1 - progress);
  progressCircle.style.strokeDashoffset = offset;

  if (progress < 1) {
    animFrame = requestAnimationFrame(updateProgress);
  }
}

function resetProgress() {
  progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
  holdStart = null;
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  holdButton.classList.remove('holding');
}

// --- Submit Request ---
async function submitRequest() {
  if (isSubmitting || hasSubmitted) return;
  isSubmitting = true;

  holdButton.classList.add('loading');
  clearError();

  const name = nameInput.value.trim();
  const reason = reasonInput.value.trim();

  const requestData = {
    name: name,
    reason: reason,
    timestamp: Date.now(),
    status: 'pending'
  };

  try {
    await requestsRef.push(requestData);
    markSubmitted();
    hasSubmitted = true;

    // Transition to success
    requestCard.style.animation = 'none';
    requestCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    requestCard.style.opacity = '0';
    requestCard.style.transform = 'translateY(-20px) scale(0.96)';

    setTimeout(() => {
      requestCard.classList.add('hidden');
      successCard.classList.remove('hidden');
    }, 300);
  } catch (err) {
    console.error('Firebase write error:', err);
    showError('Failed to send request. Please try again.');
    holdButton.classList.remove('loading');
    isSubmitting = false;
    resetProgress();
  }
}

// --- Haptic Feedback Helpers ---
function triggerLightHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(15);
  }
}

function triggerStrongHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate([80, 50, 150]);
  }
}

// --- Hold Handlers ---
function onHoldStart(e) {
  e.preventDefault();
  if (isSubmitting || hasSubmitted) return;

  if (!canSubmit()) {
    showError('A request was recently sent. Please wait before trying again.');
    return;
  }

  clearError();
  holdStart = Date.now();
  holdButton.classList.add('holding');
  triggerLightHaptic();
  animFrame = requestAnimationFrame(updateProgress);

  holdTimer = setTimeout(() => {
    // Hold completed
    triggerStrongHaptic();
    submitRequest();
  }, HOLD_DURATION);
}

function onHoldEnd(e) {
  e.preventDefault();
  if (isSubmitting) return;

  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  resetProgress();
}

// --- Event Listeners ---
// Mouse
holdButton.addEventListener('mousedown', onHoldStart);
holdButton.addEventListener('mouseup', onHoldEnd);
holdButton.addEventListener('mouseleave', onHoldEnd);

// Touch
holdButton.addEventListener('touchstart', onHoldStart, { passive: false });
holdButton.addEventListener('touchend', onHoldEnd, { passive: false });
holdButton.addEventListener('touchcancel', onHoldEnd, { passive: false });

// Prevent context menu on long press (mobile)
holdButton.addEventListener('contextmenu', (e) => e.preventDefault());

// --- Init ---
createParticles();

// Check if already submitted recently
if (!canSubmit()) {
  holdButton.classList.add('submitted');
  holdLabel.innerHTML = `
    <svg class="hold-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    Recently Submitted
  `;
}
