"""Independent 2-D Timoshenko cantilever reference for a 3-D STAAD constraint test.
Artificial benchmark only. No proposed product joint stiffness or capacity.
"""
import json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'.local-engineering-runtime/mesh-p112'))
import numpy as np
euler='--euler' in sys.argv
out=root/('output/staad-p7-p116/eb' if euler else 'output/staad-p7-p116')
out.mkdir(parents=True,exist_ok=True)
E=30_000_000.; nu=.2; G=E/(2*(1+nu)); A=.4*.25; I=.25*.4**3/12
L=3.; offset=.2; kappa=5/6
phi=0 if euler else 12*E*I/(kappa*G*A*L**2)
Ktip=np.array([[12*E*I/(L**3*(1+phi)),0,6*E*I/(L**2*(1+phi))],
               [0,E*A/L,0],
               [6*E*I/(L**2*(1+phi)),0,(4+phi)*E*I/(L*(1+phi))]])
K=np.zeros((6,6));K[:3,:3]=Ktip;K[3:,3:]=Ktip
references={}
for case,command in [('TRANSLATIONS','FX FY FZ'),('RIGID','RIGID')]:
    # global top DOFs [u2,v2,theta2,u3,v3,theta3]; small-rotation offset retained.
    T=np.zeros((6,4 if case=='TRANSLATIONS' else 3))
    T[:3,:3]=np.eye(3);T[3,0]=1;T[4,1]=1;T[4,2]=offset
    T[5,3 if case=='TRANSLATIONS' else 2]=1
    refs=[]
    for load in (np.array([0,0,0,10,0,0.]),np.array([0,0,0,0,0,10.])):
        u=T@np.linalg.solve(T.T@K@T,T.T@load)
        q=K@u
        reactions=[]
        for i in (0,3):
            fx,fy,m=q[i:i+3]
            reactions.append([-fx,-fy,L*fx-m])
        residual=np.array([sum(r[0] for r in reactions)+load[3],sum(r[1] for r in reactions)+load[4],
            reactions[0][2]+reactions[1][2]+offset*reactions[1][1]+offset*load[4]-L*load[3]+load[5]])
        assert np.linalg.norm(residual)<1e-8
        assert np.linalg.norm(T.T@(q-load))<1e-8
        refs.append({'topDisplacementsMrad':u.tolist(),'baseReactionsKN_KNm':reactions,'globalEquilibriumResidual':residual.tolist()})
    references[case]=refs
    shear_command='SET SHEAR\n' if euler else ''
    text=f'''STAAD SPACE
{shear_command}START JOB INFORMATION
JOB NAME ARTIFICIAL CONSTRAINT BENCHMARK NOT PRODUCT
END JOB INFORMATION
UNIT METER KN
JOINT COORDINATES
1 0 0 0; 2 0 3 0; 3 0.2 3 0; 4 0.2 0 0
MEMBER INCIDENCES
1 1 2; 2 4 3
MEMBER PROPERTY
1 2 PRIS YD 0.4 ZD 0.25
CONSTANTS
E 30000000 ALL
POISSON 0.2 ALL
SUPPORTS
1 4 FIXED
DEPENDENT {command} CONTROL 2 JOINT 3
LOAD 1 LOADTYPE None TITLE TIP FX 10 KN
JOINT LOAD
3 FX 10
LOAD 2 LOADTYPE None TITLE TIP MZ 10 KNM
JOINT LOAD
3 MZ 10
PERFORM ANALYSIS PRINT STATICS CHECK
PRINT SUPPORT REACTION
PRINT JOINT DISPLACEMENTS ALL
PRINT MEMBER FORCES ALL
FINISH
'''
    (out/f'{case}.STD').write_text(text,encoding='ascii')
data={'status':'REFERENCE_ONLY_NOT_NATIVE_VERIFIED','beamTheory':'Euler-Bernoulli SET SHEAR' if euler else 'Timoshenko','acceptanceTolerances':{'forceKN':.0051,'momentKNm':.0051,'translationM':.00000051,'rotationRad':.0000501},'E_KNm2':E,'nu':nu,'A_m2':A,'I_m4':I,'shearFactor':kappa,'lengthM':L,'offsetM':offset,'reference':references,
      'limitations':['Linear elastic artificial cantilevers, not a product joint design.','No nonlinear bearing/opening/slip/contact test.','Native rounded displacement tolerance must be recorded separately.']}
(out/'reference.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(data,indent=2))
