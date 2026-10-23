(function () {
  'use strict';

  /* ---------- Mobiel menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  var mobileMq = window.matchMedia('(max-width: 1100px)');
  function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
  function focusables() {
    return [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a[href], button:not([disabled])')));
  }
  function setMenu(open, opts) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (open) {
      nav.scrollTop = 0;
      var first = nav.querySelector('a[href]');
      if (first) first.focus();
    } else if (opts && opts.returnFocus) {
      toggle.focus();
    }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!isOpen(), { returnFocus: true }); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false, { returnFocus: true }); return; }
      if (e.key === 'Tab') {
        // Houd de focus binnen het geopende menu (hamburger/sluitknop + menu-items).
        var items = focusables().filter(function (el) { return el.offsetParent !== null; });
        var idx = items.indexOf(document.activeElement);
        var next = e.shiftKey ? (idx <= 0 ? items.length - 1 : idx - 1) : (idx === -1 || idx === items.length - 1 ? 0 : idx + 1);
        e.preventDefault();
        items[next].focus();
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && isOpen()) setMenu(false);
    });
    var onMq = function () { if (!mobileMq.matches && isOpen()) setMenu(false); };
    if (mobileMq.addEventListener) mobileMq.addEventListener('change', onMq); else mobileMq.addListener(onMq);
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
    var email = escapeHtml(form.getAttribute('data-email') || '');
    var mailLink = '<a href="mailto:' + email + '">' + email + '</a>';

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
              '<p>Probeer het later opnieuw of mail direct naar ' + mailLink + '.</p>');
          }
        })
        .catch(function () {
          showStatus(status, 'error',
            '<p><strong>Je bericht is niet verzonden.</strong> Er kon geen verbinding worden gemaakt.</p>' +
            '<p>Controleer je internetverbinding en probeer het opnieuw, of mail direct naar ' + mailLink + '.</p>');
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
