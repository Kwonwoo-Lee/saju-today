const { Solar, Lunar } = require('../node_modules/lunar-javascript');
global.Solar = Solar;
global.Lunar = Lunar;
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '../saju-engine.js'), 'utf8').replace('"use strict";', '');
eval(code);

const s = Solar.fromYmdHms(2005,12,23,8,37,0);
const ec = s.getLunar().getEightChar();
console.log('library sanity:', ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime());
if (ec.getYear() !== '乙酉' || ec.getTime() !== '壬辰') throw new Error('library sanity check failed');

// Seoul (utcOffset 9, lng 126.98), with time
const r1 = computeSaju({year:1990, month:5, day:15, hour:14, minute:30, hasTime:true, lng:126.98, utcOffset:9, dst:false, gender:'male'});
console.log('---computeSaju Seoul, with time---');
console.log('offsetMinutes:', r1.offsetMinutes.toFixed(2));
console.log('year:', r1.yearPillar.stem+r1.yearPillar.branch);
console.log('month:', r1.monthPillar.stem+r1.monthPillar.branch);
console.log('day:', r1.dayPillar.stem+r1.dayPillar.branch);
console.log('time:', r1.timePillar.stem+r1.timePillar.branch);
console.log('wuxing:', r1.wuxing);
console.log('yun:', r1.yun);

// New York (utcOffset -5, lng -74.01), with time, DST applied
const r2 = computeSaju({year:1990, month:7, day:4, hour:14, minute:30, hasTime:true, lng:-74.01, utcOffset:-5, dst:true, gender:'female'});
console.log('---computeSaju New York, DST, with time---');
console.log('offsetMinutes:', r2.offsetMinutes.toFixed(2));
console.log('day:', r2.dayPillar.stem+r2.dayPillar.branch, 'time:', r2.timePillar.stem+r2.timePillar.branch);

// "other/unknown" region -> zero correction
const r3 = computeSaju({year:1990, month:5, day:15, hour:14, minute:30, hasTime:true, lng:null, utcOffset:null, dst:false, gender:'female'});
console.log('---computeSaju unknown region---');
console.log('offsetMinutes (expect 0):', r3.offsetMinutes, 'correctionApplied (expect false):', r3.correctionApplied);

// without time
const r4 = computeSaju({year:1990, month:5, day:15, hasTime:false, lng:126.98, utcOffset:9, dst:false, gender:'female'});
console.log('---computeSaju without time---');
console.log('year:', r4.yearPillar.stem+r4.yearPillar.branch, 'time:', r4.timePillar);

// tenGod sanity (now returns neutral codes)
const cases = [['甲','甲','biJian'], ['甲','乙','jieCai'], ['甲','丙','shiShen'], ['甲','丁','shangGuan'],
  ['甲','戊','pianCai'], ['甲','己','zhengCai'], ['甲','庚','qiSha'], ['甲','辛','zhengGuan'],
  ['甲','壬','pianYin'], ['甲','癸','zhengYin']];
let allOk = true;
cases.forEach(([d,t,expect]) => {
  const got = tenGod(d,t);
  const ok = got === expect;
  if (!ok) allOk = false;
  console.log(`tenGod(${d},${t}) = ${got} (expect ${expect}) ${ok ? 'OK' : 'FAIL'}`);
});
if (!allOk) throw new Error('tenGod table mismatch');

// today fortune
const f = computeTodayFortune(r1.dayMaster, new Date());
console.log('---today fortune---');
console.log('todayGanzhi:', f.todayStem+f.todayBranch, 'tenGodKey:', f.tenGodKey, 'element:', f.todayElement, 'lucky numbers:', f.luckyNumbers);

console.log('\nALL SMOKE CHECKS PASSED');
