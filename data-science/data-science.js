// Data science checker. Runs entirely in the browser; nothing is sent anywhere.
(function () {
  'use strict';

  var CONTACT = 'dan@cardiffdatasystems.co.uk';

  // ---- Scored questions about the raw material (each option scores 0-3) ----
  var FOUNDATIONS = [
    { id: 'history', label: 'How long have you kept records digitally?',
      hint: 'Forecasting and trend-spotting need a steady history.',
      short: 'History',
      options: [
        ['Less than a year', 0], ['1–3 years', 1], ['3–10 years', 2], ['More than 10 years', 3]
      ],
      fix: 'Start capturing the key events consistently now. Each month of reliable, dated records makes forecasting more trustworthy later.' },
    { id: 'volume', label: 'Roughly how many records are in your main system?',
      hint: 'Clients, cases, jobs or transactions, whichever matters most.',
      short: 'Volume',
      options: [
        ['Fewer than 200', 0], ['200–2,000', 1], ['2,000–20,000', 2], ['More than 20,000', 3], ['Not sure', 1]
      ],
      fix: 'With a small number of records, statistical models are limited. Clear charts and simple analysis usually give you more, and they are cheaper to build.' },
    { id: 'where', label: 'Where does the data live?',
      hint: 'The fewer places, the easier it is to use.',
      short: 'Where it lives',
      options: [
        ['Paper, or in people\'s heads', 0], ['Spreadsheets and email', 1],
        ['Several separate systems', 2], ['One main system or database', 3]
      ],
      fix: 'Bring the records together first. Joining your systems, or moving the spreadsheets into a proper database, is usually the biggest single step towards useful analysis.' },
    { id: 'consistent', label: 'How consistently is it recorded?',
      hint: 'Do people fill things in the same way every time?',
      short: 'Consistency',
      options: [
        ['Mostly free text and notes', 0], ['Patchy, with gaps', 1],
        ['Mostly consistent', 2], ['Structured and reliable', 3]
      ],
      fix: 'Agree how the key fields are filled in, and tidy the history. Models learn from whatever is there, so messy records mean unreliable answers.' },
    { id: 'outcomes', label: 'Do you record how things turned out?',
      hint: 'For example which enquiries became work, which invoices were paid late, how long jobs took.',
      short: 'Outcomes',
      options: [
        ['No', 0], ['Sometimes, or from memory', 1], ['In some systems', 2], ['Yes, consistently', 3]
      ],
      fix: 'Start recording outcomes alongside activity (the result of each enquiry, the date each invoice was paid, how long each job took). Without them it is hard to learn what works.' }
  ];

  var GOALS = [
    { value: 'forecast', label: 'What happens next (forecasting)',
      text: 'You said you most want to know what is likely to happen next. Forecasting depends on a steady, dated history, so your answers on history and consistency matter most.' },
    { value: 'why', label: 'Why it keeps happening',
      text: 'You said you most want to understand why something keeps happening. That needs outcomes recorded alongside the details, so it is worth checking that results are captured as well as activity.' },
    { value: 'prioritise', label: 'What to prioritise',
      text: 'You said you most want to prioritise better. That is usually a scoring approach built on past outcomes, so recorded results matter most.' },
    { value: 'lose', label: 'Where we lose time or money',
      text: 'You said you most want to find where you lose time or money. That is often the quickest win: bringing time, cost and outcome records together to see where effort really goes.' },
    { value: 'unknown', label: 'I don\'t know yet',
      text: 'You are not sure yet what you would like to know, which is normal. A short discovery would start from what you hold and the decisions that matter to you.' }
  ];

  // ---- Kinds of data an organisation might hold ----
  var TYPES = [
    { id: 'clients', pick: 'Client or customer records', weight: 1.0,
      label: 'Client or customer records',
      hint: 'Who they are, when they joined, what they buy or use.',
      tells: 'Which clients are most valuable, which are drifting away, and how your clients naturally group together.',
      check: 'Duplicates and inconsistent names, and whether each client has a reliable identifier.' },
    { id: 'invoices', pick: 'Invoices and payments', weight: 1.2,
      label: 'Invoices and payments',
      hint: 'What was billed, when, and when it was paid.',
      tells: 'Likely cash flow, which invoices tend to be paid late, and unusual transactions worth a look.',
      check: 'That both the invoice date and the date paid are recorded.' },
    { id: 'cases', pick: 'Cases, matters or jobs', weight: 1.3,
      label: 'Cases, matters or jobs, with dates and outcomes',
      hint: 'When work started and finished, and how it ended.',
      tells: 'How long new work is likely to take, where work stalls, and what separates the jobs that go well from those that don\'t.',
      check: 'That statuses, end dates and outcomes are recorded the same way each time.' },
    { id: 'enquiries', pick: 'Enquiries and their outcomes', weight: 1.2,
      label: 'Enquiries and what happened to them',
      hint: 'Where they came from and whether they became work.',
      tells: 'Which sources and kinds of enquiry turn into paying work, and which are worth chasing.',
      check: 'That the source and the result of each enquiry are written down.' },
    { id: 'time', pick: 'Timesheets or time records', weight: 1.1,
      label: 'Timesheets or time records',
      hint: 'Hours spent, by person, client or type of work.',
      tells: 'Real profitability by client and type of work, and better pricing and capacity planning.',
      check: 'That time is recorded against the right client or job, and recorded promptly.' },
    { id: 'documents', pick: 'Documents, emails and notes', weight: 0.8,
      label: 'Documents, emails and notes',
      hint: 'Free text rather than neat fields.',
      tells: 'Common topics and recurring issues, and a way to find and group similar documents.',
      check: 'Confidentiality, and whether the text can be used where it sits.' },
    { id: 'feedback', pick: 'Surveys, reviews or feedback', weight: 0.7,
      label: 'Surveys, reviews or feedback',
      hint: 'What clients, members or staff say about you.',
      tells: 'The themes behind the comments, and how they change over time.',
      check: 'Whether there are enough responses, and whether they can be linked to the client.' },
    { id: 'usage', pick: 'Website, app or system usage', weight: 0.8,
      label: 'Website, app or system usage',
      hint: 'Logs of how people use the tools you run.',
      tells: 'How your tools are really used, where people get stuck, and early signs of failure.',
      check: 'Whether the logs are kept, and for how long.' }
  ];

  var SENSITIVITY = [
    { label: 'Mostly personal or confidential', key: 'high' },
    { label: 'Some of it is', key: 'some' },
    { label: 'Little of it is', key: 'low' }
  ];

  var form = document.getElementById('checker');
  var foundList = document.getElementById('found-list');
  var resultsSection = document.getElementById('results');
  var resultsBody = document.getElementById('results-body');
  if (!form || !foundList) return;

  function addRow(id, label, hint, optionsHtml) {
    var li = document.createElement('li');
    li.className = 'task';
    li.innerHTML =
      '<div><label class="task-name" for="' + id + '">' + label + '</label>' +
      '<p class="task-desc">' + hint + '</p></div>' +
      '<select id="' + id + '" aria-label="' + label.replace(/"/g, '&quot;') + '">' + optionsHtml + '</select>';
    foundList.appendChild(li);
  }
  function opts(labels, selected) {
    return labels.map(function (l, i) {
      return '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + l.replace(/"/g, '&quot;') + '</option>';
    }).join('');
  }

  // Five scored questions about the raw material.
  FOUNDATIONS.forEach(function (q) {
    addRow('found-' + q.id, q.label, q.hint, opts(q.options.map(function (o) { return o[0]; })));
  });
  // Richest kind of data (shapes the "where to look first" card).
  addRow('main-type', 'What is the richest data you hold?', 'The kind of record you would most like to learn from.',
    opts(TYPES.map(function (t) { return t.pick; }).concat(['Not sure, or none of these']), TYPES.length));
  // Goal.
  addRow('goal', 'What would you most like to know?', 'The one question you wish your records could answer.',
    opts(GOALS.map(function (g) { return g.label; }), GOALS.length - 1));
  // Sensitivity (shapes the confidentiality note, not the score).
  addRow('sensitive', 'How much of it is personal or confidential?', 'Client details, case files, financial records.',
    opts(SENSITIVITY.map(function (x) { return x.label; }), 1));

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function statusFor(score) { return score >= 3 ? 'Strong' : score === 2 ? 'Good' : score === 1 ? 'Patchy' : 'Weak'; }

  function compute() {
    var found = FOUNDATIONS.map(function (q) {
      var sel = document.getElementById('found-' + q.id);
      var opt = q.options[parseInt(sel.value, 10)];
      return { q: q, answer: opt[0], score: opt[1] };
    });
    var total = found.reduce(function (n, f) { return n + f.score; }, 0);
    var ti = parseInt(document.getElementById('main-type').value, 10);
    return {
      found: found, total: total,
      type: TYPES[ti] || null,
      goal: GOALS[parseInt(document.getElementById('goal').value, 10)],
      sensitive: SENSITIVITY[parseInt(document.getElementById('sensitive').value, 10)].key
    };
  }

  function band(total) {
    if (total >= 11) return { heading: 'Your data looks <em>promising.</em>',
      lead: 'The raw material is in good shape. A focused piece of work could turn it into answers fairly quickly.' };
    if (total >= 7) return { heading: 'There is something to work with, <em>with some preparation.</em>',
      lead: 'You hold useful records, but a few gaps would limit what data science can reliably tell you today. The good news is that they are fixable.' };
    return { heading: 'It\'s <em>early days</em> for your data, and that is fixable.',
      lead: 'Data science would struggle with what you hold today, and anyone who says otherwise is selling. A few practical steps would change that, and some of them cost very little.' };
  }

  function renderResults() {
    var r = compute();
    var b = band(r.total);
    var html = '';

    html += '<h2 id="results-title">' + b.heading + '</h2>';
    html += '<p class="large-copy">' + b.lead + ' This is a rough, indicative view. A short look at your actual records would confirm it.</p>';

    html += '<h3 class="results-heading">The raw material</h3><ul class="later-list">';
    r.found.forEach(function (f) {
      html += '<li>' + esc(f.q.short) + ': ' + esc(f.answer) + ' <span>' + statusFor(f.score) + '</span></li>';
    });
    html += '</ul>';

    if (r.type) {
      html += '<h3 class="results-heading">Where to look first</h3>' +
        '<article class="result-card"><span class="result-rank">01</span><div>' +
        '<h4>' + esc(r.type.label) + '</h4>' +
        '<p><strong>It could tell you:</strong> ' + esc(r.type.tells) + '</p>' +
        '<p class="result-human"><strong>Check first:</strong> ' + esc(r.type.check) + '</p>' +
        '</div></article>';
    }

    // Weakest foundations first, up to three fixes.
    var gaps = r.found.filter(function (f) { return f.score <= 1; }).sort(function (a, b2) { return a.score - b2.score; }).slice(0, 3);
    if (gaps.length) {
      html += '<h3 class="results-heading">What to fix first</h3>';
      gaps.forEach(function (f, i) {
        html += '<article class="result-card"><span class="result-rank">' + String(i + 1).padStart(2, '0') + '</span><div>' +
          '<h4>' + esc(f.q.short) + ': ' + esc(statusFor(f.score).toLowerCase()) + '</h4><p>' + esc(f.q.fix) + '</p></div></article>';
      });
    }

    html += '<p class="results-honest">' + esc(r.goal.text) + '</p>';
    html += '<p class="results-honest"><strong>Not every problem needs data science.</strong> Sometimes the right answer is a clean spreadsheet and a good chart, and we will say so.</p>';
    html += '<div class="callout"><h3>Worth knowing: personal and confidential data</h3><p>' +
      (r.sensitive === 'high'
        ? 'Because most of your data is personal or confidential, how the work is done matters as much as what it finds. Analysis can usually stay inside your own systems, or use anonymised data.'
        : 'Business data is often more sensitive than it looks. Analysis can usually be done inside your own systems, or on anonymised data, so this shapes how the work is done rather than whether it can be.') +
      '</p></div>';

    html += '<div class="results-cta"><h3>Let\'s talk about your data.</h3>' +
      '<p>A short call is the quickest way to find out what your records could do for you. No obligation and no sales sequence.</p>' +
      '<p><a class="button" href="../your-jobs/index.html#tell-us">Get in touch for a call <span aria-hidden="true">→</span></a> ' +
      '<button type="button" class="button button-outline" data-action="back">Change my answers</button></p>' +
      '<p class="results-email">Or email <a href="mailto:' + CONTACT + '">' + CONTACT + '</a></p></div>';

    resultsBody.innerHTML = html;
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultsSection.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); renderResults(); });
  resultsBody.addEventListener('click', function (e) {
    if (e.target.closest('[data-action="back"]')) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
