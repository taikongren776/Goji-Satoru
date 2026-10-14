import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillTimeline, SKILLS } from '../src/timeline.ts';

test('a running technique rejects competing triggers without losing its position',()=>{
  const timeline=new SkillTimeline();
  assert.equal(timeline.start('purple'),true);timeline.advance(2.5);
  assert.equal(timeline.start('red'),false);assert.equal(timeline.active,'purple');assert.equal(timeline.elapsed,2.5);
});

test('all techniques move through the phases and end exactly at clip duration',()=>{
  for(const id of ['blue','red','purple'] as const){
    const timeline=new SkillTimeline(),config=SKILLS[id];timeline.start(id);
    assert.equal(timeline.phase,'charge');
    timeline.advance(config.chargeUntil);assert.equal(timeline.phase,'release');
    timeline.advance(config.releaseUntil-config.chargeUntil);assert.equal(timeline.phase,'recover');
    assert.equal(timeline.advance(100),true);assert.equal(timeline.elapsed,config.duration);assert.equal(timeline.progress,1);
  }
});

test('cancellation permits immediate replay and discards the previous clock',()=>{
  const timeline=new SkillTimeline();timeline.start('blue');timeline.advance(3);timeline.reset();
  assert.equal(timeline.active,null);assert.equal(timeline.phase,null);assert.equal(timeline.progress,0);
  assert.equal(timeline.start('red'),true);assert.equal(timeline.elapsed,0);
});

test('invalid frame deltas cannot corrupt a running technique',()=>{
  const timeline=new SkillTimeline();timeline.start('blue');timeline.advance(1);
  for(const delta of [-1,NaN,Infinity])assert.equal(timeline.advance(delta),false);
  assert.equal(timeline.elapsed,1);
});
