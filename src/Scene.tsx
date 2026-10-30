import { memo, Suspense, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { stageAt, type Stage } from './data';

export type Playback = { time: number; playing: boolean };
const clamp = THREE.MathUtils.clamp;
const smooth = (a: number) => { const t = clamp(a, 0, 1); return t*t*(3-2*t); };

function Glass({ playback, timeline }: { playback: MutableRefObject<Playback>; timeline:Stage[] }) {
  const mobileQuality=useThree(state=>state.size.width<600);
  const liquid = useRef<THREE.Mesh>(null!);
  const top = useRef<THREE.Mesh>(null!);
  const stream = useRef<THREE.Mesh>(null!);
  const particles = useRef<THREE.InstancedMesh>(null!);
  const bubbles = useRef<THREE.InstancedMesh>(null!);
  const splashes = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const meniscus=useRef<THREE.Mesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const targetColor=useMemo(()=>new THREE.Color('#e7b645'),[]);
  const cameraTarget=useMemo(()=>new THREE.Vector3(),[]);
  const glassGeometry = useMemo(() => {
    // A continuous cross-section: underside, curved heel, exterior, rolled lip, interior, thick base.
    const points = [[0,0.035],[.38,.035],[.51,.04],[.57,.075],[.59,.14],[.602,.25],[.62,.7],[.66,1.35],[.705,2.12],[.711,2.2],[.705,2.228],[.69,2.235],[.678,2.22],[.677,2.17],[.632,1.36],[.593,.7],[.575,.28],[.56,.19],[.52,.16],[.38,.155],[0,.155]];
    const curve=new THREE.SplineCurve(points.map(p=>new THREE.Vector2(p[0],p[1])));
    return new THREE.LatheGeometry(curve.getPoints(240), 160);
  }, []);
  const streamGeometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(.055,.062,1,24,80,true);
    g.translate(0,.5,0);
    return g;
  }, []);
  const surfaceGeometry = useMemo(() => {
    const geometry=new THREE.BufferGeometry();const positions=[0,0,0];const indices:number[]=[];
    const rings=32,segments=96;
    for(let ring=1;ring<=rings;ring++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,r=ring/rings;positions.push(Math.cos(a)*r,0,Math.sin(a)*r);}
    for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
    for(let ring=1;ring<rings;ring++)for(let i=0;i<segments;i++){const a=1+(ring-1)*segments+i,b=1+(ring-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  }, []);
  const liquidGeometry = useMemo(() => new THREE.CylinderGeometry(.649,.555,1,96,1,true), []);
  const liquidBase = useMemo(() => Float32Array.from(liquidGeometry.attributes.position.array), [liquidGeometry]);
  const streamBase = useMemo(() => Float32Array.from(streamGeometry.attributes.position.array), [streamGeometry]);
  const seeds = useMemo(() => Array.from({length: 360}, (_,i) => ({a: i*2.39996, r: Math.sqrt(((i*73)%359)/359), speed: .65+((i*17)%100)/100, offset: ((i*37)%359)/359})), []);
  useFrame((state, delta) => {
    const t = playback.current.time;
    const stage = stageAt(t,timeline);
    const chapter=timeline[stage];
    const kind=chapter.kind;
    const water = smooth((t-.7)/8.6);
    const level = .19+water*1.62;
    const finalStart=timeline[timeline.length-1].start;
    const mixing = smooth((t-(finalStart-9))/15);
    color.set('#edf8fa').lerp(targetColor,mixing);
    const mat = liquid.current.material as THREE.MeshPhysicalMaterial;
    mat.color.set('#ffffff'); mat.attenuationColor.copy(color);
    liquid.current.visible = water > .002;
    liquid.current.scale.set(1,(level-.17),1);
    liquid.current.position.y = .17+(level-.17)/2;
    const surfaceRadius = .563+(level/2.2)*.102;
    const liquidPos = liquidGeometry.attributes.position;
    for (let i=0;i<liquidPos.count;i++) {
      const ratio=liquidBase[i*3+1]>0 ? surfaceRadius/.649 : 1;
      liquidPos.setXYZ(i,liquidBase[i*3]*ratio,liquidBase[i*3+1],liquidBase[i*3+2]*ratio);
    }
    liquidPos.needsUpdate=true;
    liquidGeometry.computeVertexNormals();
    top.current.visible = water > .002;
    top.current.position.y = level;
    top.current.scale.setScalar(.563+(level/2.2)*.102);
    const surfacePositions=surfaceGeometry.attributes.position;
    const energy=kind==='water'?(t<10?1.3:.4):kind==='final'?.18:.55;
    for(let i=0;i<surfacePositions.count;i++){
      const x=surfacePositions.getX(i),z=surfacePositions.getZ(i),r=Math.sqrt((x-.15)**2+z*z);
      const edge=Math.pow(Math.hypot(x,z),14)*.014;
      const ripple=(Math.sin(r*31-t*8)*.015*Math.exp(-r*1.2)+Math.sin(x*15+t*3)*Math.cos(z*12-t*2)*.006)*energy;
      surfacePositions.setY(i,ripple+edge);
    }
    surfacePositions.needsUpdate=true;surfaceGeometry.computeVertexNormals();
    (top.current.material as THREE.MeshPhysicalMaterial).color.set('#ffffff');
    meniscus.current.visible=water>.002;meniscus.current.position.y=level+.006;meniscus.current.scale.setScalar(surfaceRadius);
    const pouring = t>.7 && t<10.5;
    stream.current.visible = pouring;
    const height = Math.max(.01,3.7-level);
    stream.current.position.set(.10,level,0);
    stream.current.scale.set(1,height,1);
    const pos = streamGeometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=streamBase[i*3], y=streamBase[i*3+1], z=streamBase[i*3+2];
      const wave=1+.19*Math.sin(y*37-t*14)+.08*Math.sin(y*67+t*23);
      pos.setXYZ(i,x*wave+Math.sin(y*8+t*4)*.013,y,z*wave+Math.cos(y*13-t*3)*.009);
    }
    pos.needsUpdate=true; streamGeometry.computeVertexNormals();
    const ingredientActive = kind!=='water' && kind!=='final';
    const stageStart = chapter.start;
    const local = t-stageStart;
    for(let i=0;i<360;i++){
      const s=seeds[i]; const cycle=(local*s.speed*.48+s.offset)%1;
      const y=3.65-cycle*4.3;
      const dissolve=clamp((y-(level-.42))/.42,0,1);
      const spread=y>level ? (kind==='sugar'?.12:kind==='taurine'?.19:.23) : .15+(level-y)*.65;
      const spiral=kind==='taurine'?Math.sin(y*7+t*2)*.06:kind==='ginseng'?Math.sin(y*4+t)*.11:0;
      dummy.position.set(Math.cos(s.a+t*.3)*s.r*spread+.1+spiral,y,Math.sin(s.a+t*.3)*s.r*spread);
      const size=(kind==='sugar'?.021:kind==='caffeine'?.009:kind==='taurine'?.016:.013)*dissolve;
      const visible=ingredientActive && local>.15 && local<chapter.duration-.5 && y>.2;
      dummy.scale.set(visible?size:0,visible?size*(kind==='ginseng'?2.5:kind==='taurine'?1.7:1):0,visible?size:0);
      dummy.rotation.set(t*s.speed+i,i*.7,t+i); dummy.updateMatrix(); particles.current.setMatrixAt(i,dummy.matrix);
    }
    particles.current.instanceMatrix.needsUpdate=true;
    (particles.current.material as THREE.MeshStandardMaterial).color.set(kind==='sugar'?'#fff9e9':chapter.color);
    for(let i=0;i<100;i++){
      const s=seeds[i]; const p=(t*(.16+s.speed*.12)+s.offset)%1;
      dummy.position.set(Math.cos(s.a)*s.r*.52,.2+p*(level-.23),Math.sin(s.a)*s.r*.52);
      dummy.scale.setScalar(water>.05?(.006+.009*s.offset)*Math.sin(p*Math.PI):0);
      dummy.updateMatrix(); bubbles.current.setMatrixAt(i,dummy.matrix);
    }
    bubbles.current.instanceMatrix.needsUpdate=true;
    for(let i=0;i<42;i++){
      const s=seeds[i];const p=(t*1.9+s.offset)%1;const radius=p*.46;
      dummy.position.set(.1+Math.cos(s.a)*radius,level+Math.sin(p*Math.PI)*.27,Math.sin(s.a)*radius);
      dummy.scale.set(pouring?.012*(1-p):0,pouring?.022*(1-p):0,pouring?.012*(1-p):0);
      dummy.updateMatrix();splashes.current.setMatrixAt(i,dummy.matrix);
    }
    splashes.current.instanceMatrix.needsUpdate=true;
    const mobile=state.size.width<600;
    const targetX=Math.sin(t*.08)*(kind==='final'?.7:.25);
    cameraTarget.set(targetX,mobile?2.55:2.7,mobile?6.9:6.5-(smooth(t/11)*.45));
    state.camera.position.lerp(cameraTarget,Math.min(delta*2,1));
    state.camera.lookAt(0,1.45,0);
    group.current.rotation.y=Math.sin(t*.13)*.07;
  });
  return <group ref={group}>
    <mesh geometry={glassGeometry} castShadow receiveShadow><MeshTransmissionMaterial backside samples={mobileQuality?4:8} resolution={mobileQuality?256:768} backsideResolution={mobileQuality?128:384} color="#ffffff" roughness={.012} transmission={1} thickness={.065} backsideThickness={.09} ior={1.5} chromaticAberration={.009} anisotropicBlur={.015} distortion={0} temporalDistortion={0} envMapIntensity={1.1} clearcoat={1} /></mesh>
    <mesh position={[0,.092,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.53,96]}/><meshPhysicalMaterial color="#d8e3e8" metalness={.3} roughness={.15} transparent opacity={.22}/></mesh>
    <mesh ref={liquid} geometry={liquidGeometry}><meshPhysicalMaterial color="#edf8fa" transmission={.96} thickness={.55} ior={1.333} roughness={.025} attenuationDistance={.9} side={THREE.DoubleSide}/></mesh>
    <mesh ref={top} geometry={surfaceGeometry}><meshPhysicalMaterial color="#edf8fa" transmission={.94} roughness={.025} thickness={.12} ior={1.333} envMapIntensity={1.6} side={THREE.DoubleSide}/></mesh>
    <mesh ref={meniscus} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1,.008,8,96]}/><meshPhysicalMaterial color="#fff" transmission={.85} roughness={.03} thickness={.015} ior={1.333}/></mesh>
    <mesh ref={stream} geometry={streamGeometry}><meshPhysicalMaterial color="#dcf5fc" transmission={.91} thickness={.14} roughness={.06} ior={1.333} envMapIntensity={2}/></mesh>
    <instancedMesh ref={particles} args={[undefined,undefined,360]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial metalness={.18} roughness={.24} color="#fff5de"/></instancedMesh>
    <instancedMesh ref={bubbles} args={[undefined,undefined,100]} frustumCulled={false}><sphereGeometry args={[1,8,8]}/><meshPhysicalMaterial color="#fff" metalness={.25} roughness={.05} transparent opacity={.6}/></instancedMesh>
    <instancedMesh ref={splashes} args={[undefined,undefined,42]} frustumCulled={false}><sphereGeometry args={[1,8,8]}/><meshPhysicalMaterial color="#d4efff" metalness={.15} roughness={.05} transmission={.7} thickness={.05}/></instancedMesh>
    <ContactShadows position={[0,.012,0]} opacity={.38} scale={7} blur={2.5} far={3.5} resolution={512} frames={1}/>
  </group>;
}

function Scene({playback,timeline}:{playback: MutableRefObject<Playback>;timeline:Stage[]}) {
  return <Canvas dpr={[1,1.8]} camera={{position:[0,2.7,6.5],fov:36}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} fallback={<div className="canvas-message">3D requires WebGL. Ingredient guides remain available.</div>}>
    <color attach="background" args={['#f3f5f7']}/>
    <ambientLight intensity={.4}/><directionalLight position={[3,6,4]} intensity={1.6}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.012,0]}><planeGeometry args={[200,200]}/><meshBasicMaterial color="#f3f5f7" toneMapped={false}/></mesh>
    <Suspense fallback={null}><Environment resolution={256}>
      <Lightformer form="rect" intensity={5} position={[-3,2,2]} scale={[.6,5,1]} rotation={[0,Math.PI/4,0]}/>
      <Lightformer form="rect" intensity={3} position={[3,2,1]} scale={[.45,4,1]} rotation={[0,-Math.PI/3,0]}/>
      <Lightformer form="rect" intensity={1.5} position={[0,4,-3]} scale={[5,4,1]}/>
      <Lightformer form="rect" intensity={.45} color="#c1d6ef" position={[-4,3,-2]} scale={[3,5,1]} rotation={[0,Math.PI/2,0]}/>
      <Lightformer form="rect" intensity={2} position={[0,5,0]} scale={[3,3,1]} rotation={[Math.PI/2,0,0]}/>
    </Environment><Glass playback={playback} timeline={timeline}/></Suspense>
  </Canvas>;
}

export default memo(Scene);
