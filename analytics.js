/*
 * Google Analytics for every page on the site, with a per-browser opt-out.
 *
 *   https://sifonaniefiok.github.io/?track=off   stop counting this browser
 *   https://sifonaniefiok.github.io/?track=on    count it again
 *
 * Open the "off" link once on each of your own devices so your visits don't
 * inflate the numbers. The choice is stored in this browser only.
 *
 * Load it as a normal (not async) script in <head>: it defines gtag()
 * immediately, so inline code can call gtag() before Google's script arrives.
 */
(function () {
  var GA_ID = 'G-2Y1MTQWW3W';
  var KEY = 'sifon-analytics-off';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var choice = null;
  try {
    var url = new URL(window.location.href);
    choice = url.searchParams.get('track');
    if (choice === 'off' || choice === 'on') {
      if (choice === 'off') localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
      // Drop the parameter so it isn't recorded or shared by accident.
      url.searchParams.delete('track');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  } catch (e) { /* storage blocked: fall through and track normally */ }

  var off = false;
  try { off = localStorage.getItem(KEY) === '1'; } catch (e) {}

  if (choice === 'off' || choice === 'on') {
    var message = off
      ? 'Analytics is off for this browser. Your visits won’t be counted.'
      : 'Analytics is on for this browser.';
    var show = function () {
      var note = document.createElement('div');
      note.setAttribute('role', 'status');
      note.textContent = message;
      note.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
        'z-index:99999;max-width:calc(100% - 32px);padding:12px 18px;background:#1a1a1a;' +
        'color:#fff;font:13px/1.4 system-ui,sans-serif;border-radius:6px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.2);';
      document.body.appendChild(note);
      setTimeout(function () { note.remove(); }, 4000);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }

  if (off) {
    // Google's documented opt-out switch; nothing is loaded or sent.
    window['ga-disable-' + GA_ID] = true;
    return;
  }

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
})();
