// landing/ssukssuk/ssuk-store.js — 최고 점수·모은 도감 카드·소리 설정 저장.
// localStorage가 막혀도(시크릿 창, file://) 메모리로 대체해서 게임은 계속 동작.
// 브라우저: 전역 SsukStore(바로 쓰는 인스턴스) / Node: { createStore }
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    var ls = null;
    try { ls = root.localStorage; } catch (e) { ls = null; }
    root.SsukStore = api.createStore(ls);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STAGE_COUNT = 11;

  function isStage(n) {
    return typeof n === 'number' && n % 1 === 0 && n >= 0 && n < STAGE_COUNT;
  }

  function createStore(storage) {
    var mem = {};
    function get(k) {
      if (Object.prototype.hasOwnProperty.call(mem, k)) return mem[k];
      try { if (storage) { var v = storage.getItem(k); if (v !== null && v !== undefined) return v; } } catch (e) {}
      return null;
    }
    function set(k, v) {
      mem[k] = String(v);
      try { if (storage) storage.setItem(k, String(v)); } catch (e) {}
    }
    function cards() {
      var arr;
      try { arr = JSON.parse(get('ssuk.cards') || '[]'); } catch (e) { return []; }
      if (!Array.isArray(arr)) return [];
      return arr.filter(isStage);
    }
    return {
      best: function () { var n = Number(get('ssuk.best') || 0); return isFinite(n) && n > 0 ? n : 0; },
      saveBest: function (v) { set('ssuk.best', v); },
      cards: cards,
      hasCard: function (i) { return cards().indexOf(i) !== -1; },
      addCard: function (i) {
        if (!isStage(i)) return false;
        var a = cards();
        if (a.indexOf(i) !== -1) return false;
        a.push(i); a.sort(function (x, y) { return x - y; });
        set('ssuk.cards', JSON.stringify(a));
        return true;
      },
      soundOn: function () { return get('ssuk.sound') !== 'off'; },
      saveSound: function (on) { set('ssuk.sound', on ? 'on' : 'off'); },
    };
  }

  return { createStore: createStore };
}));
