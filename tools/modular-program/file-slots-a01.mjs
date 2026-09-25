import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,root} from './build-r02.mjs';
export function fileSlots(){return {schemaVersion:1,addendum:'R02-A01',slots:build().products.flatMap(p=>['RVT','STD'].map(kind=>({id:`${p.id}-${kind}-PRIMARY`,productId:p.id,productRevisionId:p.currentRevisionId,kind,dueStage:kind==='RVT'?'P6':'P7',artifactId:null,intakeStatus:'NOT_CREATED',nativeValidationStatus:'NOT_CHECKED',visibility:'INTERNAL_TEAM',tab:kind==='RVT'?'BIM':'ENGINEERING'})))};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dest=path.join(root,'data/modular-program/r02/file-slots-a01.json');const value=JSON.stringify(fileSlots(),null,2)+'\n';
 if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8')!==value)throw Error('Issue a new supplement; do not overwrite');
 if(!fs.existsSync(dest))fs.writeFileSync(dest,value,{flag:'wx'});
 console.log('96 planned slots: 48 RVT + 48 STD; no file falsely registered as delivered.');
}
