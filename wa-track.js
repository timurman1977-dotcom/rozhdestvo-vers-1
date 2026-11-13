/*
 * Турсалон: отметка сайта в сообщении WhatsApp и подсчёт нажатий.
 * Клиенту ничего не нужно заполнять: кнопка работает как раньше,
 * в конец готового текста добавляется код сайта, например [xmas],
 * а в базу (таблица wa_clicks) пишется факт нажатия без личных данных.
 * Подключение: <script src="/wa-track.js" defer data-site="xmas"></script>
 */
(function () {
  "use strict";
  var SB_URL = "https://gqnxqnmbvkbmheqwbxgy.supabase.co/rest/v1/wa_clicks";
  var SB_KEY = "sb_publishable_SdlxHd7MsiHwvdKxF13tQQ_nFRP6BE4";
  var me = document.currentScript;
  var site = ((me && me.getAttribute("data-site")) || location.hostname.split(".")[0] || "site").slice(0, 40);
  var tag = "[" + site + "]";

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
        body: JSON.stringify({
          site: site,
          page: (location.pathname + location.hash).slice(0, 300),
          button: (label || "").replace(/\s+/g, " ").trim().slice(0, 200)
        })
      }).catch(function () {});
    } catch (e) {}
  }

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
