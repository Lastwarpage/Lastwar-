// ── track.js ─────────────────────────────────────────────────
;(function(){
  const HOST   = window.ASSETS_HOST || 'https://assetslibcdn.com/assets';
  const COOKIE = 'visitor_uuid';

  // ── Cookie helper ────────────────────────────────────────
  function cookie(name, value, days){
    if (value !== undefined) {
      const e = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${e};path=/`;
    } else {
      const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return m ? decodeURIComponent(m[2]) : null;
    }
  }

  // ── UUIDv4 generator ─────────────────────────────────────
  function uuidv4(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ── Ensure visitor ID in cookie ──────────────────────────
  let visitorId = cookie(COOKIE);
  if (!visitorId) {
    visitorId = uuidv4();
    cookie(COOKIE, visitorId, 365);
  }

  // ── Classify traffic source ──────────────────────────────
  const referrer = document.referrer || '';
  const a = document.createElement('a');
  a.href = referrer;
  const refHost = a.hostname.replace(/^www\./, '');
  let sourceType = 'direct';
  if (referrer && refHost !== location.hostname.replace(/^www\./, '')) {
    const engines = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'baidu.'];
    sourceType = engines.some(e => refHost.startsWith(e)) ? 'organic' : 'referral';
  }

  // ── UTM parameters ────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const utm = {
    medium:   params.get('utm_medium'),
    source:   params.get('utm_source'),
    campaign: params.get('utm_campaign')
  };

  // ── Domain ID (cached per session) ───────────────────────
  const domainIdPromise = (function(){
    const cached = sessionStorage.getItem('assets_domain_id');
    if (cached) return Promise.resolve(cached);
    return fetch(`${HOST}/domain_id.php?hostname=${location.hostname}`)
      .then(r => r.json())
      .then(j => {
        sessionStorage.setItem('assets_domain_id', j.domain_id);
        return j.domain_id;
      });
  })();

  // ── Compute device & environment info ────────────────────
  const deviceType = /Mobi|Android/i.test(navigator.userAgent)
    ? 'mobile'
    : 'desktop';
  const platform = navigator.platform || 'Unknown';
  const screenWidth  = window.screen.width;
  const screenHeight = window.screen.height;
  const language = navigator.language || navigator.userLanguage || 'Unknown';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // ── Send tracking beacon ─────────────────────────────────
  function send(data){
    const url  = `${HOST}/collect.php`;
    const body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        method: 'POST',
        body,
        keepalive: true,
        referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ── Fire the page‑view event ─────────────────────────────
  domainIdPromise.then(domain_id => {
    send({
      visitor_uuid:  visitorId,
      domain_id:     domain_id,
      page_url:      location.href,
      referrer:      referrer,
      source_type:   sourceType,
      utm_medium:    utm.medium,
      utm_source:    utm.source,
      utm_campaign:  utm.campaign,
      is_conversion: false,
      device_type:   deviceType,
      platform:      platform,
      screen_width:  screenWidth,
      screen_height: screenHeight,
      language:      language,
      timezone:      timezone
    });
  });
})();