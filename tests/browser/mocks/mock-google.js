// A stand-in for Google's api.js (gapi + Picker) and gsi/client (sign-in), for the Google Drive tests.
// window.__gd.pick = the documents the picker "returns" (or 'cancel'); window.__gd.deny = refuse sign-in.
(() => {
  const st = window.__gd = window.__gd || { pick: [], log: [] };
  window.gapi = window.gapi || { load(name, o) { st.log.push('gapi.load:' + name); setTimeout(() => (o.callback || o)(), 0); } };
  const g = window.google = window.google || {};
  g.accounts = g.accounts || { oauth2: { initTokenClient(c) { st.log.push('init:' + c.client_id + ':' + c.scope);
    const cl = { callback: c.callback, requestAccessToken(o) { st.log.push('token'); setTimeout(() => st.deny ? cl.callback({ error: 'access_denied' }) : cl.callback({ access_token: 'TOKEN123', expires_in: 3600 }), 0); } };
    return cl; } } };
  const Builder = function () { const b = { feats: [] }; const me = {
    setOAuthToken(t) { b.token = t; return me; }, setDeveloperKey(k) { b.key = k; return me; }, setAppId(a) { b.app = a; return me; },
    addView() { return me; }, setOrigin(o) { b.origin = o; return me; }, setTitle() { return me; },
    setCallback(f) { b.cb = f; return me; }, enableFeature(f) { b.feats.push(f); return me; },
    build() { return { setVisible() { st.built = { token: b.token, key: b.key, app: b.app, origin: b.origin, multi: b.feats.includes('multi') };
      setTimeout(() => b.cb(st.pick === 'cancel' ? { action: 'cancel' } : { action: 'picked', docs: st.pick }), 0); } }; } };
    return me; };
  const View = function () { const v = { setIncludeFolders() { return v; }, setSelectFolderEnabled() { return v; }, setMode() { return v; } }; return v; };
  g.picker = g.picker || { PickerBuilder: Builder, DocsView: View, ViewId: { DOCS: 'docs' }, DocsViewMode: { LIST: 'list' },
    Feature: { MULTISELECT_ENABLED: 'multi' }, Action: { PICKED: 'picked', CANCEL: 'cancel' }, Response: { ACTION: 'action', DOCUMENTS: 'docs' } };
})();
