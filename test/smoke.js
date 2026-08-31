const { Solar, Lunar } = require('./node_modules/lunar-javascript');
global.Solar = Solar;
global.Lunar = Lunar;
const fs = require('fs');
const code = fs.readFileSync('./saju-engine.js', 'utf8').replace('"use strict";', '');
eval(code);

const s = Solar.fromYmdHms(2005,12,23,8,37,0);
const ec = s.getLunar().getEightChar();
console.log('library sanity:', ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime());

const r1 = computeSaju({year:1990, month:5, day:15, hour:14, minute:30, hasTime:true, lng:126.98, gender:'male'});
console.log('---computeSaju with time (Seoul)---');
console.log('offsetMinutes:', r1.offsetMinutes.toFixed(2));
console.log('year:', r1.yearPillar.stem+r1.yearPillar.branch, r1.yearPillar.stemKo+r1.yearPillar.branchKo);
console.log('month:', r1.monthPillar.stem+r1.monthPillar.branch);
console.log('day:', r1.dayPillar.stem+r1.dayPillar.branch);
console.log('time:', r1.timePillar.stem+r1.timePillar.branch);
console.log('wuxing:', r1.wuxing);
console.log('yun:', r1.yun);

const r2 = computeSaju({year:1990, month:5, day:15, hasTime:false, lng:126.98, gender:'female'});
console.log('---computeSaju without time---');
console.log('year:', r2.yearPillar.stem+r2.yearPillar.branch, 'month:', r2.monthPillar.stem+r2.monthPillar.branch, 'day:', r2.dayPillar.stem+r2.dayPillar.branch, 'time:', r2.timePillar);

console.log('tenGod(甲,甲) =', tenGod('甲','甲'), '(expect 비견)');
console.log('tenGod(甲,乙) =', tenGod('甲','乙'), '(expect 겁재)');
console.log('tenGod(甲,丙) =', tenGod('甲','丙'), '(expect 식신)');
console.log('tenGod(甲,丁) =', tenGod('甲','丁'), '(expect 상관)');
console.log('tenGod(甲,戊) =', tenGod('甲','戊'), '(expect 편재)');
console.log('tenGod(甲,庚) =', tenGod('甲','庚'), '(expect 편관)');
console.log('tenGod(甲,壬) =', tenGod('甲','壬'), '(expect 편인)');

const f = computeTodayFortune(r1.dayMaster, new Date());
console.log('---today fortune---');
console.log('todayGanzhi:', f.todayStem+f.todayBranch, 'tenGod:', f.tenGod, 'element:', f.todayElement);
console.log('lucky:', f.luckyColor, f.luckyNumbers);
