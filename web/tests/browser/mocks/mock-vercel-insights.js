// Stand-in for Vercel's /_vercel/insights/script.js (only served on Vercel). Like the real script it reports a
// page view on load and whenever the address changes, sending the page address and referrer.
(function () {
  function send() {
    var body = JSON.stringify({ o: location.href, r: document.referrer, ts: Date.now() });
    fetch('/_vercel/insights/view', { method: 'POST', body: body, keepalive: true }).catch(function () {});
  }
  send();
  window.addEventListener('hashchange', send);
  window.addEventListener('popstate', send);
  (window.vaq || []).forEach(function () {});
})();
