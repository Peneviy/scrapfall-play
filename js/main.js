// Точка входа: поднимаем SDK, читаем сейв, показываем меню.
(function () {
  var fill = document.getElementById('loadFill');
  var step = 0;
  function progress(p) {
    step = Math.max(step, p);
    fill.style.width = Math.round(step * 100) + '%';
  }
  progress(0.1);

  function boot() {
    progress(0.4);

    Save.load(function () {
      progress(0.7);

      // язык: сначала выбор игрока, иначе то, что отдала площадка
      I18N.set(Save.data.set.lang || PF.lang);

      var canvas = document.getElementById('game');
      Game.init(canvas);
      Input.init(canvas);
      UI.init();

      Snd.setSfx(Save.data.set.sfx);
      Snd.setMusic(Save.data.set.music);

      // на время рекламы игра встает на паузу и глохнет, иначе модерация ругается
      PF.onAdStart = function () {
        if (Game.running && !Game.paused) { Game.wasPausedByAd = true; Game.pause(true); }
      };
      PF.onAdSound = function (on) { Snd.mute(!on); };
      PF.onMuteAudio = function (m) { Snd.pfMute(m); };
      Snd.pfMute(PF.muteAudio);
      PF.onAdsOff = function (why) {
        if (why === 'adblock') UI.toast(I18N.t('adBlocked'));
        // рекламы нет вообще - и метка AD на кнопках только путает
        if (why === 'free' || why === 'basic') document.body.classList.add('no-ads');
        UI.syncAdButtons();
      };
      PF.onAdEnd = function () {
        if (Game.wasPausedByAd && !Game.over) {
          Game.wasPausedByAd = false;
          // если открыт экран выбора карт или пауза - остаемся на паузе
          var overlayOpen = !document.getElementById('scrLevel').classList.contains('hidden') ||
            !document.getElementById('scrPause').classList.contains('hidden');
          if (!overlayOpen) Game.pause(false);
        }
        Game.wasPausedByAd = false;
      };
      // блокировщик мог найтись раньше, чем мы повесили обработчик
      if (PF.adsOff) PF.onAdsOff(PF.adsOff);

      // Звук разрешен только после касания. Слушатели не снимаем: Safari и
      // Firefox могут усыпить контекст позже, и поднять его можно только
      // из жеста. unlock дешевый, когда звук уже идет.
      var unlock = function () { Snd.unlock(); };
      ['pointerdown', 'pointerup', 'touchend', 'keydown'].forEach(function (ev) {
        window.addEventListener(ev, unlock, { passive: true, capture: true });
      });
      window.addEventListener('focus', unlock);
      window.addEventListener('pageshow', unlock);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) unlock(); });

      progress(1);
      setTimeout(function () {
        // Первый запуск - сразу в бой, меню игрок увидит после первого забега.
        // Так понятнее, что за игра, и CrazyGames этого требует: геймплей не
        // дальше одного клика.
        if (!Save.data.runs) {
          UI.startRun();
        } else {
          UI.show('scrMenu');
          UI.refreshMenu();
          PF.banner(true);
        }
        PF.loadingDone();
        Game.run();
      }, 250);
    });
  }

  PF.init(boot);

  // подстраховка: если SDK висит, через 6 секунд стартуем без него
  setTimeout(function () {
    if (!Save.data) {
      PF.kind = 'local';
      boot();
    }
  }, 6000);
})();
