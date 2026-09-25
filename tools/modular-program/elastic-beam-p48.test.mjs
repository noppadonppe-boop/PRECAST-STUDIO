import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simpleBeam,rhs} from './elastic-beam-p48.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('uniform load: reactions, moment, displacement',()=>{const L=1000,q=2,E=200000,I=1e6,r=simpleBeam({L,I,E,patches:[{a:0,b:L,q}]});close(r.reactionsN[0],q*L/2);close(r.maxAbsMomentNmm,q*L*L/8);close(r.maxAbsDeflectionMm,5*q*L**4/(384*E*I));});
test('midpoint load',()=>{const L=1000,P=1000,E=200000,I=1e6,r=simpleBeam({L,I,E,points:[{x:L/2,P}]});close(r.maxAbsMomentNmm,P*L/4);close(r.maxAbsDeflectionMm,P*L**3/(48*E*I));});
test('overhang produces uplift and hogging; support displacement zero',()=>{const r=simpleBeam({L:1000,min:-200,I:1e6,points:[{x:-200,P:1000}]});close(r.reactionsN[0],1200);close(r.reactionsN[1],-200);close(r.maxAbsMomentNmm,200000);r.supportDisplacementsMm.forEach(x=>close(x,0));});
test('patch is statically identical to centroid load for reactions',()=>{const a=simpleBeam({L:1000,I:1e6,patches:[{a:200,b:600,q:3}]}),b=simpleBeam({L:1000,I:1e6,points:[{x:400,P:1200}]});a.reactionsN.forEach((x,i)=>close(x,b.reactionsN[i]));});
test('RHS sharp-corner area',()=>close(rhs(100,50,4).area,1136));
