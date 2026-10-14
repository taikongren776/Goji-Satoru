import test from 'node:test';
import assert from 'node:assert/strict';
import { EyeTransition } from '../src/appearance.ts';

test('interrupting before hand contact retains the covered appearance',()=>{
  const state=new EyeTransition();assert.equal(state.start(true),true);
  state.advance(.5);state.cancel();assert.equal(state.visible,false);assert.equal(state.active,false);
  assert.equal(state.start(true),true);assert.equal(state.elapsed,0);
});
test('interrupting after contact retains the revealed eyes and permits cover replay',()=>{
  const state=new EyeTransition();state.start(true);state.advance(1.4);state.cancel();
  assert.equal(state.visible,true);assert.equal(state.start(false),true);assert.equal(state.clip,'CoverEyes');
  assert.equal(state.advance(10),true);state.finish();assert.equal(state.visible,false);assert.equal(state.active,false);
});
test('an appearance transition rejects conflicting input and invalid time deltas',()=>{
  const state=new EyeTransition();assert.equal(state.start(false),false);state.start(true);
  assert.equal(state.start(false),false);state.advance(.2);
  for(const delta of [-1,NaN,Infinity])assert.equal(state.advance(delta),false);
  assert.equal(state.elapsed,.2);assert.equal(state.clip,'RevealEyes');
});
