import test from 'node:test';import assert from 'node:assert/strict';import {initial,valid,estimate,plan} from './model.mjs';
test('паспорт и границы',()=>{assert.ok(valid(initial()));for(const diff of [{width:0},{date:'2027-02-30'},{beds:[9,1,2]},{tasks:[null]}])assert.equal(valid({...initial(),...diff}),false)});
test('свободные грядки и оценка вместимости',()=>{assert.equal(estimate({...initial(),beds:[0,0,0]}),0);assert.equal(estimate(initial()),16)});
test('переход между годами',()=>assert.equal(plan({...initial(),date:'2027-01-01'})[0][0],'2026-12-18'));
