/* ================================================================
   SwiftStatic â€“ main client-side script
   ================================================================ */

/* â”€â”€ Helpers â”€â”€ */
const $ = id => document.getElementById(id);

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function setError(el, on) {
  if (on) el.classList.add('error');
  else     el.classList.remove('error');
}

/* ── Open demo / mailto (works inside iframes, editors, and mobile) ── */
function openDemo(url) {
  // mailto: must use location.href – window.open blocks native mail app on iOS/Android
  if (url.startsWith('mailto:')) {
    window.location.href = url;
    return;
  }
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}

/* â”€â”€ Navbar glass on scroll (throttled with RAF + passive listener) â”€â”€ */
const navbar       = $('navbar');
const scrollTopBtn = $('scroll-top');
let scrollRAF = null;

function onScrollUpdate() {
  const sy = window.scrollY;
  const scrolled = sy > 20;
  const isLight = document.documentElement.classList.contains('light');

  if (isLight) {
    // In light mode, clear all inline styles — CSS handles the appearance
    navbar.style.background        = '';
    navbar.style.boxShadow         = '';
    navbar.style.borderBottomColor = '';
    navbar.style.borderBottom      = '';
  } else {
    navbar.style.background = scrolled
      ? 'rgba(11,17,32,0.92)'
      : 'transparent';
    navbar.style.boxShadow = scrolled
      ? '0 4px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(99,102,241,0.15)'
      : 'none';
    navbar.style.borderBottomColor = scrolled
      ? 'rgba(255,255,255,0.07)'
      : 'transparent';
  }

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

/* â”€â”€ Mobile menu toggle â”€â”€ */
const menuToggle = $('menu-toggle');
const mobileMenu = $('mobile-menu');
const bar1 = $('bar1');
const bar2 = $('bar2');
const bar3 = $('bar3');
let menuOpen = false;

menuToggle.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  bar1.style.transform = menuOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
  bar2.style.opacity   = menuOpen ? '0' : '1';
  bar3.style.transform = menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : '';
  bar3.style.width     = menuOpen ? '20px' : '';
  mobileMenu.setAttribute('aria-hidden', String(!menuOpen));
  menuToggle.setAttribute('aria-expanded', String(menuOpen));
});

function closeMobileMenu() {
  menuOpen = false;
  mobileMenu.classList.remove('open');
  bar1.style.transform = '';
  bar2.style.opacity   = '1';
  bar3.style.transform = '';
  mobileMenu.setAttribute('aria-hidden', 'true');
  menuToggle.setAttribute('aria-expanded', 'false');
}

/* â”€â”€ IntersectionObserver â€“ reveal on scroll â”€â”€ */
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
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

// Defer reveal observer so it doesn't block first paint / interaction
requestAnimationFrame(() => {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});

/* â”€â”€ Set min date for booking calendar (today) â”€â”€ */
const dateInput = $('b-date');
if (dateInput) {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;
}

/* â”€â”€ Submit helpers â”€â”€ */
function hideFormShowSuccess(formId, successId) {
  const form    = $(formId);
  const success = $(successId);
  if (!form || !success) return;
  form.style.opacity    = '0';
  form.style.transition = 'opacity 0.3s';
  setTimeout(() => {
    form.classList.add('hidden');
    success.classList.remove('hidden');
    success.style.opacity = '0';
    requestAnimationFrame(() => {
      success.style.transition = 'opacity 0.4s';
      success.style.opacity = '1';
    });
  }, 300);
}

/* â”€â”€ Booking form submit â”€â”€ */
function handleBooking(e) {
  e.preventDefault();

  const nameEl    = $('b-name');
  const emailEl   = $('b-email');
  const serviceEl = $('b-service');
  const dateEl    = $('b-date');
  const timeEl    = $('b-time');
  const msgEl     = $('b-msg');

  const name    = nameEl.value.trim();
  const email   = emailEl.value.trim();
  const service = serviceEl.value;
  const date    = dateEl.value;
  const time    = timeEl.value;
  const msg     = msgEl.value.trim();

  // Inline validation
  let valid = true;
  [nameEl, serviceEl, dateEl, timeEl].forEach(el => {
    const empty = !el.value.trim();
    setError(el, empty);
    if (empty) valid = false;
  });
  const badEmail = !validEmail(email);
  setError(emailEl, badEmail);
  if (badEmail) valid = false;

  if (!valid) {
    showToast('⚠️ Please fill in all required fields correctly.', 'error');
    return;
  }

  const btn     = e.target.querySelector('button[type="submit"]');
  const btnText = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:_spin .7s linear infinite"></span> Sending…';

  fetch('/api/booking', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, service, date, time, message: msg }),
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('🎉 Booking received! We\'ll confirm your call soon.', 'success');
        hideFormShowSuccess('booking-form', 'booking-success');
      } else {
        throw new Error(data.message || 'Server error');
      }
    })
    .catch(() => {
      // Graceful fallback to mailto
      const subject = encodeURIComponent(`Free Call Booking: ${name}`);
      const body    = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nService: ${service}\nDate: ${date}\nTime: ${time}\n\nMessage:\n${msg || '(none)'}`
      );
      openDemo(`mailto:swiftstaticc@gmail.com?subject=${subject}&body=${body}`);
      showToast('📧 Opening email client to complete booking.', 'success');
      hideFormShowSuccess('booking-form', 'booking-success');
    })
    .finally(() => {
      btn.disabled  = false;
      btn.innerHTML = btnText;
    });
}

/* â”€â”€ Contact form submit â”€â”€ */
function handleContact(e) {
  e.preventDefault();

  const nameEl    = $('c-name');
  const emailEl   = $('c-email');
  const planEl    = $('c-plan');
  const subjectEl = $('c-subject');
  const msgEl     = $('c-message');

  const name    = nameEl.value.trim();
  const email   = emailEl.value.trim();
  const plan    = planEl.value;
  const subject = subjectEl.value.trim();
  const message = msgEl.value.trim();

  // Inline validation
  let valid = true;
  [nameEl, subjectEl, msgEl].forEach(el => {
    const empty = !el.value.trim();
    setError(el, empty);
    if (empty) valid = false;
  });
  const badEmail = !validEmail(email);
  setError(emailEl, badEmail);
  if (badEmail) valid = false;

  if (!valid) {
    showToast('⚠️ Please fill in all required fields correctly.', 'error');
    return;
  }

  const btn     = e.target.querySelector('button[type="submit"]');
  const btnText = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:_spin .7s linear infinite"></span> Sending…';

  fetch('/api/contact', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, plan, subject, message }),
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('✅ Message sent! We\'ll reply within 24 hours.', 'success');
        hideFormShowSuccess('contact-form', 'contact-success');
      } else {
        throw new Error(data.message || 'Server error');
      }
    })
    .catch(() => {
      const planLine    = plan ? `Interested Plan: ${plan}\n` : '';
      const mailSubject = encodeURIComponent(`[SwiftStatic Contact] ${subject}`);
      const mailBody    = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n${planLine}Subject: ${subject}\n\nMessage:\n${message}`
      );
      openDemo(`mailto:swiftstaticc@gmail.com?subject=${mailSubject}&body=${mailBody}`);
      showToast('📧 Opening email client to send your message.', 'success');
      hideFormShowSuccess('contact-form', 'contact-success');
    })
    .finally(() => {
      btn.disabled  = false;
      btn.innerHTML = btnText;
    });
}

/* â”€â”€ Select plan from pricing cards â”€â”€ */
function selectPlan(planName) {
  const planSelect = $('c-plan');
  if (planSelect) {
    for (let i = 0; i < planSelect.options.length; i++) {
      if (planSelect.options[i].text === planName || planSelect.options[i].value === planName) {
        planSelect.selectedIndex = i;
        break;
      }
    }
  }
  const target = document.getElementById('contact');
  if (target) {
    const offset = 80;
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  setTimeout(() => {
    if (planSelect) {
      planSelect.style.borderColor = '#6366f1';
      planSelect.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.3)';
      setTimeout(() => {
        planSelect.style.borderColor = '';
        planSelect.style.boxShadow   = '';
      }, 2000);
    }
  }, 700);
}

/* ── Light / Dark mode toggle ── */
function toggleTheme() {
  const html    = document.documentElement;
  const isLight = html.classList.toggle('light');
  const icon    = isLight ? '☀️' : '🌙';
  const deskIcon   = $('theme-icon');
  const mobileIcon = $('theme-icon-mobile');
  if (deskIcon)   deskIcon.textContent   = icon;
  if (mobileIcon) mobileIcon.textContent = icon;
  localStorage.setItem('swiftstatic-theme', isLight ? 'light' : 'dark');
  // Re-apply navbar colour for the new theme immediately
  onScrollUpdate();
}

// Restore saved theme preference (icons updated after DOM ready)
(function () {
  if (localStorage.getItem('swiftstatic-theme') === 'light') {
    document.documentElement.classList.add('light');
    const deskIcon   = $('theme-icon');
    const mobileIcon = $('theme-icon-mobile');
    if (deskIcon)   deskIcon.textContent   = '☀️';
    if (mobileIcon) mobileIcon.textContent = '☀️';
  }
})();

/* â”€â”€ Toast notification â”€â”€ */
let toastTimer = null;
function showToast(message, type = 'success') {
  const existing = $('toast');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const isSuccess = type === 'success';
  const isLight   = document.documentElement.classList.contains('light');
  const toast     = document.createElement('div');
  toast.id        = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  // Use opaque backgrounds in light mode so the toast is always readable
  const bg       = isLight
    ? (isSuccess ? 'rgba(220,252,231,0.98)' : 'rgba(254,226,226,0.98)')
    : (isSuccess ? 'rgba(16,185,129,0.15)'  : 'rgba(239,68,68,0.15)');
  const bdr      = isLight
    ? (isSuccess ? 'rgba(34,197,94,0.5)'    : 'rgba(239,68,68,0.5)')
    : (isSuccess ? 'rgba(16,185,129,0.4)'   : 'rgba(239,68,68,0.4)');
  const col      = isLight
    ? (isSuccess ? '#166534'                 : '#991b1b')
    : (isSuccess ? '#6ee7b7'                 : '#fca5a5');

  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%;
    transform:translateX(-50%) translateY(20px);
    z-index:9999; padding:14px 22px;
    background:${bg};
    border:1.5px solid ${bdr};
    color:${col};
    border-radius:14px; font-size:0.88rem; font-weight:600;
    backdrop-filter:blur(16px); white-space:nowrap;
    max-width:calc(100vw - 40px); text-align:center;
    box-shadow:0 4px 24px rgba(0,0,0,0.12);
    transition:all 0.35s cubic-bezier(0.4,0,0.2,1);
    opacity:0;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }));

  toastTimer = setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 3800);
}

/* â”€â”€ Active nav link highlight on scroll â”€â”€ */
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
}, { threshold: 0.45 });

sections.forEach(s => sectionObserver.observe(s));

/* â”€â”€ Smooth anchor scroll â”€â”€ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offset = 72;
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* â”€â”€ Clear error state when user types in a field â”€â”€ */
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('input', () => setError(input, false));
  input.addEventListener('change', () => setError(input, false));
});
