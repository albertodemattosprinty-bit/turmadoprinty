import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_ASPECTS, qualityTagIndex } from '../public/200/quality-data.js';
import { validateQualityValues, qualityRollingAverage } from '../src/project200-quality.js';
const baseline = Object.fromEntries(QUALITY_ASPECTS.map(({id})=>[id,50]));
test('all 12 aspects have 20 distinct descriptions and cover both endpoints',()=>{
  assert.equal(QUALITY_ASPECTS.length,12);
  for(const aspect of QUALITY_ASPECTS){assert.equal(aspect.tags.length,20);assert.equal(new Set(aspect.tags).size,20);}
  assert.equal(qualityTagIndex(0),0);assert.equal(qualityTagIndex(5),0);assert.equal(qualityTagIndex(6),1);assert.equal(qualityTagIndex(100),19);
});
test('rejects incomplete, invalid and coerced assessments; accepts zero and 100',()=>{
  assert.deepEqual(validateQualityValues({...baseline,sono:0,aspecto:100}),{...baseline,sono:0,aspecto:100});
  for(const invalid of [{}, {...baseline,sono:null},{...baseline,sono:'50'},{...baseline,sono:101},{...baseline,sono:-1},{...baseline,sono:2.5},{...baseline,extra:1}]) assert.throws(()=>validateQualityValues(invalid));
});
test('90-day average preserves baseline without records and equally weights calendar days',()=>{
  assert.deepEqual(qualityRollingAverage(baseline,[]),baseline);
  assert.equal(qualityRollingAverage(baseline,[{category_id:'sono',planned:420,completed:420}]).sono,50.6);
  assert.equal(qualityRollingAverage(baseline,[{category_id:'sono',planned:420,completed:0}]).sono,49.4);
  assert.equal(qualityRollingAverage(baseline,Array.from({length:90},()=>({category_id:'sono',planned:420,completed:840}))).sono,100);
  assert.equal(qualityRollingAverage(baseline,[{category_id:'sono',planned:0,completed:100}]).sono,50);
});
