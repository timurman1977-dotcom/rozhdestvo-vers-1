/*
 * Турсалон: отметка сайта в сообщении WhatsApp и подсчёт нажатий.
 * Клиенту ничего не нужно заполнять: кнопка работает как раньше,
 * в конец готового текста добавляется код сайта, например [xmas],
 * а в базу (таблица wa_clicks) пишется факт нажатия без личных данных.
 * Подключение: <script src="/wa-track.js" defer data-site="xmas"></script>
 * UTM-метки (utm_source, utm_medium, utm_campaign, utm_content, utm_term) запоминаются
 * на 30 дней при заходе с рекламы и уходят в CRM: вместе с нажатием WhatsApp и с анкетой сайта.
 */
(function () {
  "use strict";
  var SB_URL = "https://gqnxqnmbvkbmheqwbxgy.supabase.co/rest/v1/wa_clicks";
  var SB_KEY = "sb_publishable_SdlxHd7MsiHwvdKxF13tQQ_nFRP6BE4";
  var me = document.currentScript;
  var site = ((me && me.getAttribute("data-site")) || location.hostname.split(".")[0] || "site").slice(0, 40);

  /* UTM: последняя реклама, с которой пришёл посетитель, хранится 30 дней */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var utm = {};
  try {
    var q = new URLSearchParams(location.search), fresh = {};
    UTM_KEYS.forEach(function (k) { var v = q.get(k); if (v) fresh[k] = v.slice(0, 200); });
    if (Object.keys(fresh).length) localStorage.setItem("tursalon_utm", JSON.stringify({ t: Date.now(), v: fresh }));
    var saved = JSON.parse(localStorage.getItem("tursalon_utm") || "null");
    if (saved && Date.now() - saved.t < 30 * 864e5) utm = saved.v || {};
  } catch (e) {}
  window.tursalonUtm = function () { var o = {}; for (var k in utm) o[k] = utm[k]; return o; };

  var tag = "[" + site + (utm.utm_source ? " · " + utm.utm_source : "") + (utm.utm_campaign ? " · " + utm.utm_campaign : "") + "]";

  function isWa(url) {
    return typeof url === "string" && /(wa\.me\/|api\.whatsapp\.com\/)/i.test(url);
  }

  function tagUrl(url) {
    try {
      var u = new URL(url, location.href);
      var t = u.searchParams.get("text") || "";
      if (t.indexOf(tag) !== -1) return url;
      var rest = [];
      u.searchParams.forEach(function (v, k) { if (k !== "text") rest.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); });
      rest.push("text=" + encodeURIComponent((t ? t + "\n\n" : "") + tag));
      return u.origin + u.pathname + "?" + rest.join("&");
    } catch (e) {
      return url;
    }
  }

  function log(label) {
    try {
      fetch(SB_URL, {
        method: "POST",
        keepalive: true,
        headers: { apikey: SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(Object.assign({
          site: site,
          page: (location.pathname + location.hash).slice(0, 300),
          button: (label || "").replace(/\s+/g, " ").trim().slice(0, 200)
        }, utm))
      }).catch(function () {});
    } catch (e) {}
  }

  /* анкета сайта: к заявке в CRM добавляются UTM-метки и код лендинга */
  var nativeFetch = window.fetch;
  if (nativeFetch) window.fetch = function (input, init) {
    try {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (init && /\/rest\/v1\/leads(\?|$)/.test(url) && String(init.method || "").toUpperCase() === "POST" && typeof init.body === "string") {
        var add = function (row) { if (!row || typeof row !== "object") return row; var r = Object.assign({}, utm, row); if (!r.landing) r.landing = site; return r; };
        var data = JSON.parse(init.body);
        init = Object.assign({}, init, { body: JSON.stringify(Array.isArray(data) ? data.map(add) : add(data)) });
      }
    } catch (e) {}
    return nativeFetch.call(this, input, init);
  };

  /* обычные ссылки-кнопки */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || !isWa(a.href)) return;
    a.href = tagUrl(a.href);
    log(a.getAttribute("aria-label") || a.textContent);
  }, true);

  /* кнопки, которые открывают WhatsApp через window.open */
  var nativeOpen = window.open;
  window.open = function (url, target, features) {
    if (isWa(String(url))) {
      url = tagUrl(String(url));
      log("window.open");
    }
    return nativeOpen.call(window, url, target, features);
  };
})();
