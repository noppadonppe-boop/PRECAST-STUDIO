from pathlib import Path
import json,subprocess,argparse
from PIL import Image,ImageOps,ImageDraw
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2];WORK=ROOT/'output/revit-p61-batch'
OUT=ROOT/'deliverables/PM_ARC_48_P104'
poppler=Path(r'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe')
ids=json.loads((WORK/'selection.json').read_text()) if (WORK/'selection.json').exists() else [m['id'] for m in json.loads((WORK/'input.json').read_text())['models']]
parser=argparse.ArgumentParser();parser.add_argument('--ids');args=parser.parse_args()
if args.ids:ids=args.ids.split(',')
reports=[]
for pid in ids:
    pdf=OUT/pid/(pid+'_ARC_A1_P104.pdf')
    if not pdf.exists():continue
    folder=WORK/'visual-review'/pid;folder.mkdir(parents=True,exist_ok=True)
    r=PdfReader(pdf);assert len(r.pages)==7
    expected=['A001','A101','A201','A301','A401','A601','A701']
    for i,p in enumerate(r.pages):
        assert abs(float(p.mediabox.width)*25.4/72-841)<2 and abs(float(p.mediabox.height)*25.4/72-594)<2
        assert pid in p.extract_text() and expected[i] in p.extract_text()
    subprocess.run([str(poppler),'-scale-to','1400','-png',str(pdf),str(folder/'sheet')],check=True,capture_output=True)
    board=Image.new('RGB',(1240,1820),'#e9edf2');draw=ImageDraw.Draw(board);draw.text((20,10),pid+' / P104 / 7 native sheets - VISUAL REVIEW REQUIRED',fill='black')
    for i,p in enumerate(sorted(folder.glob('sheet-*.png'))):
        img=Image.open(p).convert('RGB');img.thumbnail((600,424));board.paste(img,(20+(i%2)*610,40+(i//2)*440));draw.text((20+(i%2)*610,40+(i//2)*440+425),expected[i],fill='black')
    board.save(folder/'contact.png')
    native=sorted((OUT/pid).glob('*.png'));assert len(native)==4
    board2=Image.new('RGB',(1820,1440),'#e9edf2');draw2=ImageDraw.Draw(board2)
    for i,p in enumerate(native):
        img=Image.open(p).convert('RGB');img.thumbnail((880,650))
        x=20+(i%2)*900;y=45+(i//2)*700
        board2.paste(img,(x+(880-img.width)//2,y));draw2.text((x,y-25),pid+' | '+p.name,fill='black')
    board2.save(folder/'native-contact.png')
    reports.append({'id':pid,'pages':7,'format':'A1','pageTitlesAndProductId':'PASS','visualReview':'PENDING','contact':str(folder/'contact.png')})
(WORK/'pdf-content-audit.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
print(json.dumps({'rendered':len(reports),'visualReview':'PENDING'}))
