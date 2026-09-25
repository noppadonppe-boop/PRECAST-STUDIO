const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const webRequire = Module.createRequire(path.join(root, 'apps/web/package.json'));
function loadTs(relative, overrides={}) {
  const filename=path.join(root,relative);
  const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const m=new Module(filename,module);
  m.filename=filename;
  m.require=(name)=>overrides[name] ?? webRequire(name);
  m._compile(output,filename);
  return m.exports;
}
const classifier=loadTs('apps/web/src/bim/precast.ts');
const {parseIfc}=loadTs('apps/web/src/bim/parseIfc.ts',{'./precast':classifier});
const out=path.join(root,'deliverables/PPE_Senior_Home_P02_IFC');
const ifc=path.join(out,'PPE_Engineering_Senior_Home_P02_IsPrecast_R2026.ifc');
(async()=>{
  const bytes=new Uint8Array(fs.readFileSync(ifc));
  const result=await parseIfc(bytes);
  const w=webRequire('web-ifc'); const api=new w.IfcAPI();await api.Init();
  const mid=api.OpenModel(bytes);
  const detailed=[];
  const rels=api.GetLineIDsWithType(mid,w.IFCRELDEFINESBYPROPERTIES);
  const byElement=new Map();
  for(let i=0;i<rels.size();i++){
    const rel=api.GetLine(mid,rels.get(i));
    const pset=api.GetLine(mid,rel.RelatingPropertyDefinition.value);
    const props=(pset.HasProperties??[]).map(r=>api.GetLine(mid,r.value)).filter(p=>p.NominalValue).map(p=>({name:p.Name.value,value:p.NominalValue.value,datatype:p.NominalValue.constructor.name,pset:pset.Name?.value}));
    for(const obj of rel.RelatedObjects??[])byElement.set(obj.value,[...(byElement.get(obj.value)??[]),...props]);
  }
  for(const e of result.elements){
    const props=byElement.get(e.id)??[];
    const line=api.GetLine(mid,e.id);
    detailed.push({...e,revitId:line.Tag?.value,predefinedType:line.PredefinedType?.value,properties:props.filter(p=>['IsPrecast','PPE_System_Code','PPE_Element_Role','PPE_Construction_Method','Mark'].includes(p.name))});
  }
  const counts={}; const byType={};
  for(const e of detailed){counts[e.precast.status]=(counts[e.precast.status]??0)+1;byType[e.type]=(byType[e.type]??0)+1;}
  const materials=api.GetLineIDsWithType(mid,w.IFCMATERIAL).size();
  const audit={schema:result.schema,totalElements:result.elements.length,counts,byType,meshes:result.meshes.length,triangleCount:result.triangleCount,materials,duplicateGuids:result.duplicateGuids,missingGuids:result.missingGuids,levels:result.levels,lengthUnits:result.lengthUnits,warnings:result.warnings,hasBoolean:detailed.filter(e=>e.properties.some(p=>p.name==='IsPrecast')).length,elements:detailed};
  fs.writeFileSync(path.join(out,'IFC_Web_Classification_Audit.json'),JSON.stringify(audit,null,2));
  console.log(JSON.stringify({...audit,elements:undefined},null,2));
  api.CloseModel(mid);api.Dispose();
})().catch(e=>{console.error(e);process.exitCode=1;});
