const test = require('node:test');
const assert = require('node:assert');
const { Solar } = require('../landing/byeol/lib/lunar.js');

test('lunar.js: 양력 2000-01-01의 일간 천간을 구한다', () => {
  const lunar = Solar.fromYmd(2000, 1, 1).getLunar();
  const gan = lunar.getDayGan();
  assert.ok(typeof gan === 'string' && gan.length >= 1, '일간 천간이 문자열로 나와야 함');
});

test('lunar.js: 음력→양력 변환이 동작한다', () => {
  const solar = Lunar_fromYmd(2000, 1, 1);
  assert.ok(solar.getYear() >= 1999 && solar.getYear() <= 2001);
});

function Lunar_fromYmd(y, m, d) {
  const { Lunar } = require('../landing/byeol/lib/lunar.js');
  return Lunar.fromYmd(y, m, d).getSolar();
}
