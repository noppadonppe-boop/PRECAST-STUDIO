import test from 'node:test';import assert from 'node:assert/strict';import {uniqueIntegrityPins} from './mould-data.mjs';
test('identical repeated pins still require one actual file check',()=>{assert.equal(uniqueIntegrityPins(process.cwd(),[{path:'output/a.json',sha256:'a'},{path:'output/./a.json',sha256:'a'}]).length,1);});
test('different files with equal content hashes remain separate checks',()=>{assert.equal(uniqueIntegrityPins(process.cwd(),[{path:'output/a.json',sha256:'a'},{path:'output/b.json',sha256:'a'}]).length,2);});
test('conflicting revisions for one path fail closed, not last-write-wins',()=>{assert.throws(()=>uniqueIntegrityPins(process.cwd(),[{path:'output/a.json',sha256:'a'},{path:'output/a.json',sha256:'b'}]),/Conflicting/);});
