var Shop = {
  on: false,
  price: {},
  busy: false,
  from: 'scrMenu',

  pack: function (id) {
    var P = CFG.shop.packs;
    for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i];
    return null;
  },

  total: function (pack) { return Math.round(pack.coins * (1 + (pack.bonus || 0) / 100)); },

  fmt: function (n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+$)/g, ' '); },

  init: function () {
    var self = this, st = PF.store();
    this.bind();
    if (Save.data.noAds) PF.noAds = true;
    this.sync();
    if (!st) return;
    st.catalog(function (list) {
      for (var i = 0; i < list.length; i++) {
        var id = list[i].id;
        if (self.pack(id) || id === CFG.shop.noAds) { self.price[id] = list[i].price; self.on = true; }
      }
      self.sync();
      st.owned(function (own) {
        var coins = 0;
        for (var j = 0; j < own.length; j++) coins += self.grant(own[j], st);
        self.sync();
        if (coins) UI.toast(I18N.t('rewardCoins', { n: self.fmt(coins) }));
      });
    });
  },

  grant: function (p, st) {
    var d = Save.data, pack = this.pack(p.id);
    if (p.id === CFG.shop.noAds) {
      if (!d.noAds) { d.noAds = 1; Save.flush(true); }
      PF.noAds = true;
      PF.banner(false);
      return 0;
    }
    if (!pack) return 0;
    var coins = 0;
    if (!Array.isArray(d.paid)) d.paid = [];
    if (d.paid.indexOf(p.token) < 0) {
      d.paid.push(p.token);
      if (d.paid.length > 40) d.paid.shift();
      coins = this.total(pack);
      d.coins = Math.max(0, Math.floor(d.coins + coins));
      Save.flush(true);
    }
    st.consume(p.token);
    return coins;
  },

  buy: function (id) {
    var self = this, st = PF.store();
    if (!st || this.busy || PF.adRunning) return;
    if (id === CFG.shop.noAds && Save.data.noAds) return;
    this.busy = true;
    this.render();
    PF.payStart();
    var held = true;
    var release = function () {
      if (!held) return;
      held = false;
      self.busy = false;
      PF.payEnd();
      self.sync();
    };
    if (PF.pkb) PF._backInGame(release);
    st.buy(id, function (p, why) {
      release();
      if (!p) {
        if (why === 'NON_CONSUMABLE_ALREADY_OWNED') { self.grant({ id: id }, st); UI.toast(I18N.t('buyNoAdsDone')); }
        else if (why !== 'USER_CANCELLED') UI.toast(I18N.t('buyFail'));
        self.sync();
        return;
      }
      var coins = self.grant(p, st);
      Snd.play('coin');
      if (p.id === CFG.shop.noAds) UI.toast(I18N.t('buyNoAdsDone'));
      else if (coins) UI.toast(I18N.t('rewardCoins', { n: self.fmt(coins) }));
      self.sync();
    });
  },

  open: function (from) {
    if (!this.on) return;
    this.from = from || 'scrMenu';
    UI.show('scrBuy');
    this.render();
  },

  back: function () {
    if (this.from === 'scrShop') UI.openShop();
    else { UI.show('scrMenu'); UI.refreshMenu(); }
  },

  bind: function () {
    var self = this;
    UI.el('menuCoinsRow').onclick = function () { self.open('scrMenu'); };
    UI.el('shopCoinsBox').onclick = function () { self.open('scrShop'); };
    UI.el('buyBack').onclick = function () { self.back(); };
  },

  card: function (cls, title, body, price, onclick) {
    var el = document.createElement('div');
    el.className = 'item buy' + cls + (this.busy ? ' busy' : '');
    var h = document.createElement('h4'); h.textContent = title; el.appendChild(h);
    el.appendChild(body);
    var pr = document.createElement('span'); pr.className = 'price'; pr.textContent = price; el.appendChild(pr);
    if (onclick) el.onclick = onclick;
    return el;
  },

  render: function () {
    var list = UI.el('buyList'), self = this, P = CFG.shop.packs;
    UI.el('buyCoins').textContent = U.num(Save.data.coins);
    list.innerHTML = '';
    var shown = P.filter(function (q) { return !!self.price[q.id]; });
    for (var i = 0; i < shown.length; i++) {
      (function (pk, odd) {
        var box = document.createElement('div'); box.className = 'buy-box';
        var n = document.createElement('p'); n.className = 'buy-n'; n.textContent = self.fmt(self.total(pk));
        box.appendChild(n);
        if (pk.bonus) {
          var bn = document.createElement('span'); bn.className = 'buy-bonus';
          bn.textContent = I18N.t('buyBonus', { n: pk.bonus });
          box.appendChild(bn);
        }
        list.appendChild(self.card(odd ? ' odd' : '', I18N.t(pk.name), box, self.price[pk.id], function () { self.buy(pk.id); }));
      })(shown[i], i === shown.length - 1 && shown.length % 2 === 1);
    }
    var na = CFG.shop.noAds;
    if (this.price[na] || Save.data.noAds) {
      var txt = document.createElement('p'); txt.textContent = I18N.t('buyNoAdsDesc');
      var own = !!Save.data.noAds;
      list.appendChild(this.card(own ? ' wide owned' : ' wide', I18N.t('buyNoAds'), txt, own ? I18N.t('buyOwned') : this.price[na],
        own ? null : function () { self.buy(na); }));
    }
  },

  sync: function () {
    document.body.classList.toggle('shop-on', this.on);
    var c = U.num(Save.data.coins);
    UI.el('menuCoins').textContent = c;
    UI.el('shopCoins').textContent = c;
    if (!UI.el('scrBuy').classList.contains('hidden')) this.render();
    if (!UI.el('scrMenu').classList.contains('hidden')) UI.renderQuickUp();
  }
};
