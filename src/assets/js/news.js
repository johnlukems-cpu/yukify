(function () {
  'use strict';

  // Zoeken in Nieuws & Inzichten: laadt de zoekindex pas bij de eerste zoekopdracht.
  var form = document.querySelector('[data-news-search]');
  var results = document.querySelector('[data-news-results]');
  var defaultView = document.querySelector('[data-news-default]');
  if (!form || !results || !defaultView) return;

  var input = form.querySelector('input[type=search]');
  var status = results.querySelector('.news-search-status');
  var list = results.querySelector('[data-news-results-list]');
  var index = null;
  var loading = null;
  var timer = null;

  form.hidden = false;
  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 150); });

  function normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch('/nieuws/zoekindex.json', { headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('index'); return r.json(); })
        .then(function (data) {
          index = data.map(function (a) {
            return { a: a, title: normalize(a.title), all: normalize([a.title, a.intro, a.category, a.text].join(' ')) };
          });
          return index;
        });
    }
    return loading;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function card(a) {
    var art = el('article', 'news-card');
    var media = el('a', 'news-card-media');
    media.href = a.url; media.tabIndex = -1; media.setAttribute('aria-hidden', 'true');
    var img = el('img'); img.src = a.image; img.alt = ''; img.width = 1200; img.height = 630; img.loading = 'lazy';
    media.appendChild(img);
    var body = el('div', 'news-card-body');
    var meta = el('p', 'news-meta');
    var chip = el('a', 'news-chip', a.category); chip.href = a.categoryUrl;
    var time = el('time', null, a.dateLabel); time.dateTime = a.date;
    meta.append(chip, time, el('span', null, a.minutes + ' min lezen'));
    var h = el('h3', 'news-card-title');
    var link = el('a', null, a.title); link.href = a.url;
    h.appendChild(link);
    body.append(meta, h, el('p', 'news-card-intro', a.intro));
    art.append(media, body);
    return art;
  }

  function run() {
    var q = normalize(input.value).trim();
    if (!q) {
      results.hidden = true;
      defaultView.hidden = false;
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    loadIndex().then(function (idx) {
      var hits = idx
        .filter(function (x) { return terms.every(function (t) { return x.all.indexOf(t) !== -1; }); })
        .sort(function (x, y) {
          var sx = terms.filter(function (t) { return x.title.indexOf(t) !== -1; }).length;
          var sy = terms.filter(function (t) { return y.title.indexOf(t) !== -1; }).length;
          return sy - sx || (y.a.date > x.a.date ? 1 : -1);
        });
      list.replaceChildren.apply(list, hits.map(function (h) { return card(h.a); }));
      status.textContent = hits.length
        ? hits.length + (hits.length === 1 ? ' artikel gevonden' : ' artikelen gevonden') + ' voor “' + input.value.trim() + '”.'
        : 'Geen artikelen gevonden voor “' + input.value.trim() + '”. Probeer een ander zoekwoord of kies een onderwerp.';
      defaultView.hidden = true;
      results.hidden = false;
    }).catch(function () {
      status.textContent = 'Zoeken is op dit moment niet beschikbaar. Kies een onderwerp om artikelen te bekijken.';
      results.hidden = false;
    });
  }
})();
