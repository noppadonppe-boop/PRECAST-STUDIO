// Geometric concrete-only mass estimate. Not a lifting design weight.
export function estimateMass(a,densityKgM3=2400){
 if(!(Number.isFinite(densityKgM3)&&densityKgM3>0))throw Error('Positive density required');
 let grossMm3,voidMm3=0;
 if(a.kind==='HALF'){
  const section=150*2425+150*1090+Math.PI/4*(400**2-250**2);
  grossMm3=section*a.length;
  if(a.opening)voidMm3=(a.opening.localY[1]-a.opening.localY[0])*(a.opening.z[1]-a.opening.z[0])*150;
 }else{
  grossMm3=a.width*a.height*a.length;
  if(a.opening)voidMm3=(a.opening.x[1]-a.opening.x[0])*(a.opening.z[1]-a.opening.z[0])*a.length;
 }
 const grossVolumeM3=grossMm3/1e9,voidVolumeM3=voidMm3/1e9,netVolumeM3=grossVolumeM3-voidVolumeM3;
 if(netVolumeM3<=0)throw Error('Invalid net concrete volume');
 return {grossVolumeM3,voidVolumeM3,netVolumeM3,densityKgM3,concreteMassKg:netVolumeM3*densityKgM3,basis:'NORMAL_CONCRETE_TRIAL_2400_NOT_SUPPLIER_VERIFIED',excluded:['REBAR','LIFTING_INSERTS','CONNECTION_STEEL','FINISHES','GLAZING','UPPER_END_INFILL'],liftingDesignMassKg:null,status:'ESTIMATE_NOT_FOR_LIFTING_SELECTION'};
}
