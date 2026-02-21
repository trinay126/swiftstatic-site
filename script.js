/* ================================================================
   SwiftStatic – main client-side script
   ================================================================ */

/* ── Navbar glass on scroll (throttled with RAF + passive listener) ── */
const navbar     = document.getElementById('navbar');
const scrollTopBtn = document.getElementById('scroll-top');
let scrollRAF = null;

function onScrollUpdate() {
  const sy = window.scrollY;
  const scrolled = sy > 20;
  navbar.style.background = scrolled
    ? 'rgba(11,17,32,0.92)'
    : 'transparent';
  navbar.style.boxShadow = scrolled
    ? '0 4px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(99,102,241,0.15)'
    : 'none';
  navbar.style.borderBottomColor = scrolled
    ? 'rgba(255,255,255,0.07)'
    : 'transparent';

  if (sy > 500) {
    scrollTopBtn.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    scrollTopBtn.classList.add('opacity-100', 'translate-y-0');
  } else {
    scrollTopBtn.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    scrollTopBtn.classList.remove('opacity-100', 'translate-y-0');
  }
  scrollRAF = null;
}

window.addEventListener('scroll', () => {
  if (!scrollRAF) scrollRAF = requestAnimationFrame(onScrollUpdate);
}, { passive: true });

/* ── Mobile menu toggle ── */
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const bar1 = document.getElementById('bar1');
const bar2 = document.getElementById('bar2');
const bar3 = document.getElementById('bar3');
let menuOpen = false;

menuToggle.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  bar1.style.transform = menuOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
  bar2.style.opacity   = menuOpen ? '0' : '1';
  bar3.style.transform = menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : '';
  bar3.style.width     = menuOpen ? '20px' : '';
});

function closeMobileMenu() {
  menuOpen = false;
  mobileMenu.classList.remove('open');
  bar1.style.transform = '';
  bar2.style.opacity   = '1';
  bar3.style.transform = '';
}

/* ── IntersectionObserver – reveal on scroll ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      entry.target.addEventListener('transitionend', () => {
        entry.target.style.willChange = 'auto';
      }, { once: true });
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Set min date for booking calendar ── */
const dateInput = document.getElementById('b-date');
if (dateInput) {
  dateInput.min = new Date().toISOString().split('T')[0];
}

/* ── Booking form submit ── */
function handleBooking(e) {
  e.preventDefault();
  const name    = document.getElementById('b-name').value.trim();
  const email   = document.getElementById('b-email').value.trim();
  const service = document.getElementById('b-service').value;
  const date    = document.getElementById('b-date').value;
  const time    = document.getElementById('b-time').value;
  const msg     = document.getElementById('b-msg').value.trim();

  if (!name || !email || !service || !date || !time) {
    showToast('⚠️ Please fill in all required fields.', 'error');
    return;
  }

  // Try API first; fallback to mailto
  fetch('/api/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, service, date, time, message: msg }),
  })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(() => {
      showToast('🎉 Booking received! We\'ll confirm your call soon.', 'success');
    })
    .catch(() => {
      // Server not available – fallback to mailto
      const subject = encodeURIComponent(`Free Call Booking: ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nService: ${service}\nDate: ${date}\nTime: ${time}\n\nMessage:\n${msg || '(none)'}`
      );
      window.location.href = `mailto:swiftstaticc@gmail.com?subject=${subject}&body=${body}`;
      showToast('🎉 Email client opened! We\'ll confirm your call soon.', 'success');
    });

  const form    = document.getElementById('booking-form');
  const success = document.getElementById('booking-success');
  form.style.opacity = '0';
  form.style.transition = 'opacity 0.3s';
  setTimeout(() => {
    form.classList.add('hidden');
    success.classList.remove('hidden');
  }, 300);
}

/* ── Contact form submit ── */
function handleContact(e) {
  e.preventDefault();
  const name    = document.getElementById('c-name').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const plan    = document.getElementById('c-plan').value;
  const subject = document.getElementById('c-subject').value.trim();
  const message = document.getElementById('c-message').value.trim();

  if (!name || !email || !subject || !message) {
    showToast('⚠️ Please fill in all fields.', 'error');
    return;
  }

  fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, plan, subject, message }),
  })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(() => {
      showToast('✅ Message sent! We\'ll reply within 24 hours.', 'success');
    })
    .catch(() => {
      const planLine = plan ? `Interested Plan: ${plan}\n` : '';
      const mailSubject = encodeURIComponent(`[SwiftStatic Contact] ${subject}`);
      const mailBody = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n${planLine}Subject: ${subject}\n\nMessage:\n${message}`
      );
      window.location.href = `mailto:swiftstaticc@gmail.com?subject=${mailSubject}&body=${mailBody}`;
      showToast('✅ Email client opened! We\'ll reply within 24 hours.', 'success');
    });

  const form    = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  form.style.opacity = '0';
  form.style.transition = 'opacity 0.3s';
  setTimeout(() => {
    form.classList.add('hidden');
    success.classList.remove('hidden');
  }, 300);
}

/* ── Select plan from pricing cards ── */
function selectPlan(planName) {
  const planSelect = document.getElementById('c-plan');
  if (planSelect) {
    for (let i = 0; i < planSelect.options.length; i++) {
      if (planSelect.options[i].value === planName) {
        planSelect.selectedIndex = i;
        break;
      }
    }
  }
  const target = document.getElementById('contact');
  if (target) {
    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  setTimeout(() => {
    if (planSelect) {
      planSelect.style.borderColor = '#6366f1';
      planSelect.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.3)';
      setTimeout(() => {
        planSelect.style.borderColor = '';
        planSelect.style.boxShadow = '';
      }, 1800);
    }
  }, 650);
}

/* ── Light / Dark mode toggle ── */
function toggleTheme() {
  const html    = document.documentElement;
  const isLight = html.classList.toggle('light');
  const icon    = isLight ? '☀️' : '🌙';
  const desktopIcon = document.getElementById('theme-icon');
  const mobileIcon  = document.getElementById('theme-icon-mobile');
  if (desktopIcon) desktopIcon.textContent = icon;
  if (mobileIcon)  mobileIcon.textContent  = icon;
  localStorage.setItem('swiftstatic-theme', isLight ? 'light' : 'dark');
}

// Restore saved theme preference
(function () {
  const saved = localStorage.getItem('swiftstatic-theme');
  if (saved === 'light') {
    document.documentElement.classList.add('light');
    const desktopIcon = document.getElementById('theme-icon');
    const mobileIcon  = document.getElementById('theme-icon-mobile');
    if (desktopIcon) desktopIcon.textContent = '☀️';
    if (mobileIcon)  mobileIcon.textContent  = '☀️';
  }
})();

/* ── Toast notification ── */
function showToast(message, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px);
    z-index: 9999; padding: 14px 22px;
    background: ${type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};
    border: 1.5px solid ${type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'};
    color: ${type === 'success' ? '#6ee7b7' : '#fca5a5'};
    border-radius: 14px; font-size: 0.88rem; font-weight: 600;
    backdrop-filter: blur(16px); white-space: nowrap;
    transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
    opacity: 0;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* ── Active nav link highlight on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${entry.target.id}` ? '#818cf8' : '';
      });
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => sectionObserver.observe(s));

/* ── Smooth anchor scroll (override default) ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
