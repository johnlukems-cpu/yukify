(function () {
  'use strict';

  /* ---------- Mobiel menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- Header-schaduw bij scrollen ---------- */
  var header = document.querySelector('.site-header');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  if (header) { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); }

  /* ---------- Subtiele onthulling ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Contactformulieren ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()0-9\s.-]{6,25}$/;
  var messages = {
    naam: 'Vul je naam in.',
    bedrijf: 'Vul de naam van je bedrijf of kantoor in.',
    email: 'Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl.',
    telefoon: 'Vul een geldig telefoonnummer in, of laat dit veld leeg.',
    organisatie: 'Kies het type organisatie.',
    ondersteuning: 'Kies de gewenste ondersteuning.',
    bericht: 'Vertel kort waar je ondersteuning bij zoekt (minimaal 10 tekens).',
  };

  function validateField(el) {
    var v = (el.value || '').trim();
    var name = el.name;
    var ok = true;
    if (el.required && !v) ok = false;
    else if (name === 'email' && v && !EMAIL_RE.test(v)) ok = false;
    else if (name === 'telefoon' && v && !PHONE_RE.test(v)) ok = false;
    else if (name === 'bericht' && v.length < 10) ok = false;
    var err = document.getElementById(el.id + '-error');
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (err) { err.textContent = ok ? '' : messages[name] || 'Controleer dit veld.'; err.classList.toggle('is-visible', !ok); }
    return ok;
  }

  function showStatus(box, type, html) {
    box.className = 'form-status is-visible form-status--' + type;
    box.innerHTML = html;
    box.focus();
  }

  var params = new URLSearchParams(window.location.search);

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var started = Date.now();
    var fields = form.querySelectorAll('input:not([type=hidden]):not([name=website]), select, textarea');
    var status = form.querySelector('.form-status');
    var btn = form.querySelector('button[type=submit]');
    var btnLabel = btn.querySelector('.btn-label');
    var originalLabel = btnLabel.textContent;

    form.elements.pagina.value = window.location.pathname;

    // Voorinvullen vanuit links zoals /contact/?dienst=btw of ?organisatie=mkb
    var dienst = params.get('dienst');
    var org = params.get('organisatie');
    var onderwerp = params.get('onderwerp');
    var sel = form.querySelector('select[name=ondersteuning]');
    if (sel && dienst && sel.querySelector('option[value="' + CSS.escape(dienst) + '"]')) sel.value = dienst;
    var orgSel = form.querySelector('select[name=organisatie]');
    if (orgSel && org && orgSel.querySelector('option[value="' + CSS.escape(org) + '"]')) orgSel.value = org;
    var msg = form.querySelector('textarea[name=bericht]');
    if (msg && onderwerp === 'offerte' && !msg.value) msg.placeholder = 'Ik ontvang graag een voorstel voor…';

    fields.forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value || el.getAttribute('aria-invalid') === 'true') validateField(el); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') validateField(el); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (el) { if (!validateField(el) && !firstInvalid) firstInvalid = el; });
      if (firstInvalid) {
        showStatus(status, 'error', '<p>Niet alle velden zijn juist ingevuld. Controleer de gemarkeerde velden.</p>');
        firstInvalid.focus();
        return;
      }

      form.elements.t.value = String(Math.round((Date.now() - started) / 1000));
      var data = new URLSearchParams(new FormData(form));
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btnLabel.textContent = 'Bezig met verzenden…';

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data.toString(),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) { return { ok: res.ok, json: json }; });
        })
        .then(function (r) {
          if (r.ok && r.json && r.json.ok === true) {
            form.querySelectorAll('.form-grid, .form-consent, .form-actions, .field-hint').forEach(function (el) { el.hidden = true; });
            showStatus(status, 'success',
              '<h3>Bedankt, je bericht is verzonden.</h3><p>We hebben je aanvraag ontvangen en nemen zo snel mogelijk contact met je op.</p>');
            form.reset();
          } else {
            var reason = (r.json && r.json.message) || 'Er ging iets mis bij het verzenden.';
            if (r.json && r.json.errors) {
              Object.keys(r.json.errors).forEach(function (name) {
                var el = form.elements[name];
                if (el && el.id) {
                  el.setAttribute('aria-invalid', 'true');
                  var err = document.getElementById(el.id + '-error');
                  if (err) { err.textContent = r.json.errors[name]; err.classList.add('is-visible'); }
                }
              });
            }
            showStatus(status, 'error',
              '<p><strong>Je bericht is niet verzonden.</strong> ' + escapeHtml(reason) + '</p>' +
              '<p>Probeer het later opnieuw of mail direct naar <a href="mailto:info@yukify.nl">info@yukify.nl</a>.</p>');
          }
        })
        .catch(function () {
          showStatus(status, 'error',
            '<p><strong>Je bericht is niet verzonden.</strong> Er kon geen verbinding worden gemaakt.</p>' +
            '<p>Controleer je internetverbinding en probeer het opnieuw, of mail direct naar <a href="mailto:info@yukify.nl">info@yukify.nl</a>.</p>');
        })
        .then(function () {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
          btnLabel.textContent = originalLabel;
        });
    });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
