from pathlib import Path
import sys,json,time,shutil
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/video/python-packages'))
from gradio_client import Client,handle_file
OUT=ROOT/'deliverables/PPE_Cafe/video-realistic'
(OUT/'clips').mkdir(exist_ok=True)
src=sys.argv[1] if len(sys.argv)>1 else 'zerogpu-aoti/wan2-2-fp8da-aoti-faster'
client=Client(src,token=False,download_files=str(OUT/'clips'),analytics_enabled=False)
api=client.view_api(return_format='dict',print_info=False)
(OUT/'service-api.json').write_text(json.dumps(api,indent=2),encoding='utf8')
if '--generate' not in sys.argv:
    for name,d in api.get('named_endpoints',{}).items():
        print(name,json.dumps({'parameters':[{k:p.get(k) for k in ['parameter_name','label','python_type','parameter_has_default','parameter_default']} for p in d.get('parameters',[])],'returns':d.get('returns',[])},ensure_ascii=True),flush=True)
else:
    shot=sys.argv[sys.argv.index('--shot')+1] if '--shot' in sys.argv else 'exterior'
    specs={
      'exterior':('01-exterior-orbit-start.png',3.5,62817,'A stabilized cinematic camera slowly arcs clockwise around the front corner of the small concrete cafe toward the front glass facade, keeping the whole building in view. Real spatial parallax, the solid architecture remains unchanged. The seated woman lifts her white cup and takes a sip while the man turns his head toward her naturally. The barista works inside. Leaves sway gently in the breeze. Real live-action architecture documentary, warm afternoon sunlight, smooth continuous camera movement.'),
      'entry':('02-walkthrough-entry.png',5,62818,'Continuous cinematic walkthrough: the camera physically moves forward three meters through the open doorway and into the small cafe along the clear central aisle. The nearby doorway and potted plants pass behind the camera and leave the frame. Strong spatial parallax as the oak counter on the left and seated customers on the right pass alongside. The camera gently looks toward the barista, who is preparing coffee. The seated woman takes a small sip from her white cup, the man smiles at her. Uninterrupted forward dolly movement, real documentary footage, stable architecture, natural warm light.'),
      'barista':('03-barista-latte.png',5,62819,'Realistic live-action cafe documentary. The barista slowly pours milk from his stainless steel pitcher into the white coffee cup, watching the cup attentively. The thin stream of milk moves naturally. He then stops pouring and gently raises the pitcher upright while holding the cup steady. Realistic precise hands, subtle breathing and blinking. The customer in the background lifts her coffee cup. Very gentle camera slide to the right, warm sunlight, continuous fluid natural motion.'),
      'guests':('02-walkthrough-entry.png',5,62820,'The camera slowly dollies forward through the open cafe doorway and pans to the seated customers on the right. The woman naturally lifts her white cup, takes a relaxed sip, lowers the cup onto the saucer and smiles at her companion. The man nods gently and makes a small hand gesture in response. The barista continues preparing coffee in the background. Real cafe atmosphere, natural breathing and blinking, stable geometry, photorealistic documentary footage, warm afternoon light.'),
      'orbit':('01-exterior-orbit-start.png',5,62821,'The camera makes a clear wide clockwise orbit around the small cafe, moving from this three-quarter service-side view to a straight-on view of the arched glass entrance and onward toward the opposite front corner. The cafe remains stationary and rigid while the camera travels around it with pronounced three-dimensional parallax. The background garden shifts behind the building. Customers are seated calmly, occasionally sipping coffee. Smooth elegant architectural video, continuous camera travel, stable roof shape and black glazing, realistic light, not a static zoom.')
    }
    filename,duration,seed,prompt=specs[shot]
    steps=int(sys.argv[sys.argv.index('--steps')+1]) if '--steps' in sys.argv else 6
    if '--duration' in sys.argv:duration=float(sys.argv[sys.argv.index('--duration')+1])
    image_path=OUT/'keyframes'/filename
    (OUT/('request-'+shot+'.json')).write_text(json.dumps({'source':src,'image':str(image_path),'prompt':prompt,'duration':duration,'seed':seed},indent=2),encoding='utf8')
    job=client.submit(input_image=handle_file(str(image_path)),prompt=prompt,steps=steps,duration_seconds=duration,seed=seed,randomize_seed=False,api_name='/generate_video')
    start=time.time()
    while not job.done():
        s=job.status();print('STATUS',str(s),flush=True)
        if time.time()-start>900:
            job.cancel();raise TimeoutError('Public video generation exceeded 15-minute wait')
        time.sleep(10)
    result=job.result();print('RESULT',repr(result),flush=True)
    (OUT/('hf-result-'+shot+'.json')).write_text(json.dumps(result,default=str,indent=2),encoding='utf8')
    source=result[0] if isinstance(result,(tuple,list)) else result
    if isinstance(source,dict):source=source.get('path')
    target=OUT/'clips'/(shot+'.mp4');shutil.copy2(source,target)
    print('SAVED',target,flush=True)
