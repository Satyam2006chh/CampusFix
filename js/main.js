// ============================================================
//  CampusFix — Main JS (Landing Page)
//  File: js/main.js
// ============================================================

// ─── NAVBAR SCROLL EFFECT ────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ─── HAMBURGER MENU ──────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close nav when a link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// ─── SMOOTH ACTIVE NAV LINK ON SCROLL ────────────────────────
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  const scrollY = window.pageYOffset;
  sections.forEach(sec => {
    const offset = sec.offsetTop - 100;
    const height = sec.offsetHeight;
    const id = sec.getAttribute('id');
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) {
      if (scrollY >= offset && scrollY < offset + height) {
        document.querySelectorAll('.nav-link').forEach(l => l.style.color = '');
        link.style.color = '#6c63ff';
      }
    }
  });
});

// ─── INTERSECTION OBSERVER — FADE IN ON SCROLL ───────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Apply fade-in to cards
document.querySelectorAll(
  '.problem-card, .about-feature-card, .flow-step, .role-card, .stat-item'
).forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// ─── CONTACT FORM HANDLER ─────────────────────────────────────
function handleContactSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const success = document.getElementById('contactSuccess');

  btn.textContent = 'Sending...';
  btn.disabled = true;

  // Simulate sending (will be replaced with Flask API call in CE-2)
  setTimeout(() => {
    btn.textContent = 'Send Message →';
    btn.disabled = false;
    success.style.display = 'block';
    e.target.reset();
    setTimeout(() => { success.style.display = 'none'; }, 5000);
  }, 1200);
}

// ─── TYPING EFFECT FOR HERO BADGE ────────────────────────────
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  heroTitle.style.animation = 'fadeInUp 0.8s ease forwards';
}

// Inject keyframe animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);
