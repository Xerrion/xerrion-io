// A damped height-field wave equation, integrated on the GPU with CFL-safe substeps.
export const compute = /* wgsl */`
struct Params {
 grid:vec4f, pointer:vec4f, brush:vec4f, color:vec4f,
 display:vec4f, paletteA:vec4f, paletteB:vec4f, paletteC:vec4f,
}
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var field:texture_2d<f32>;
@group(0) @binding(2) var outputField:texture_storage_2d<rgba16float,write>;
@group(0) @binding(3) var smp:sampler;
fn valid(id:vec3u)->bool{return all(id.xy<vec2u(p.grid.xy));}
fn load(q:vec2i)->vec4f{return textureLoad(field,clamp(q,vec2i(0),vec2i(p.grid.xy)-1),0);}
fn drop(uv:vec2f,center:vec2f,radius:f32)->f32{
 let d=(uv-center)*vec2f(p.grid.x/p.grid.y,1.0);let r2=dot(d,d)/(radius*radius);
 return (1.0-r2)*exp(-r2);
}
@compute @workgroup_size(8,8)
fn wave(@builtin(global_invocation_id) id:vec3u){
 if(!valid(id)){return;}let q=vec2i(id.xy);let uv=(vec2f(id.xy)+.5)/p.grid.xy;
 if(p.color.w>.5){
   let h=.035*drop(uv,vec2f(.62,.48),.055)+.018*drop(uv,vec2f(.44,.68),.045);
   textureStore(outputField,q,vec4f(h,0,0,0));return;
 }
 let state=load(q);let lap=load(q+vec2i(1,0)).x+load(q-vec2i(1,0)).x+load(q+vec2i(0,1)).x+load(q-vec2i(0,1)).x-4.0*state.x;
 // c*dt <= .6, below the two-dimensional explicit wave stability limit.
 let c=min(72.0,p.grid.y*.23);
 let edge=min(min(uv.x,1.0-uv.x)*p.grid.x,min(uv.y,1.0-uv.y)*p.grid.y);
 let damping=mix(2.3,.18,p.brush.w)+exp(-edge*.16)*3.0;
 var velocity=(state.y+(c*c*lap-state.x*.12)*p.grid.z)*exp(-damping*p.grid.z);
 var h=state.x+velocity*p.grid.z;
 if(p.brush.y>.0){
   let d=(uv-p.pointer.xy)*vec2f(p.grid.x/p.grid.y,1.0);
   let r2=dot(d,d)/(p.brush.x*p.brush.x);
   h+=(1.0-r2)*exp(-r2)*p.brush.y*p.display.w*.028*p.grid.z*60.0;
 }
 textureStore(outputField,q,vec4f(clamp(h,-.16,.16),clamp(velocity,-2.0,2.0),0,0));
}
@compute @workgroup_size(8,8)
fn surface(@builtin(global_invocation_id) id:vec3u){
 if(!valid(id)){return;}let q=vec2i(id.xy);let uv=(vec2f(id.xy)+.5)/p.grid.xy;
 let world=(uv-.5)*vec2f(p.grid.x/p.grid.y,1.0)*6.0;
 let cell=6.0/p.grid.y;let h=load(q).x;
 let left=load(q-vec2i(1,0)).x;let right=load(q+vec2i(1,0)).x;
 let top=load(q-vec2i(0,1)).x;let bottom=load(q+vec2i(0,1)).x;
 var slope=vec2f(right-left,bottom-top)/(2.0*cell);
 var curvature=vec2f(right+left-2.0*h,bottom+top-2.0*h)/(cell*cell);
 var crossCurve=(load(q+vec2i(1,1)).x-load(q+vec2i(1,-1)).x-load(q+vec2i(-1,1)).x+load(q-vec2i(1,1)).x)/(4.0*cell*cell);
 var totalHeight=h;
 // Low-amplitude wind waves keep the untouched water gently alive.
 let directions=array<vec2f,4>(vec2f(.94,.34),vec2f(-.45,.89),vec2f(.72,-.69),vec2f(.25,.97));
 let frequencies=array<f32,4>(3.4,6.8,11.3,18.7);
 let amplitudes=array<f32,4>(.051,.024,.0111,.0045);
 let speeds=array<f32,4>(1.1,-1.4,1.8,-2.4);
 for(var i=0u;i<4u;i++){
   let k=directions[i]*frequencies[i];
   let phase=dot(world,k)-p.grid.w*speeds[i];
   let a=amplitudes[i]*p.brush.z;
   totalHeight+=sin(phase)*a;slope+=cos(phase)*a*k;
   curvature-=sin(phase)*a*k*k;crossCurve-=sin(phase)*a*k.x*k.y;
 }
 let depth=select(select(.95,1.8,p.display.x>.5),3.5,p.display.x>1.5);
 let focus=.24*depth;
 let determinant=(1.0-curvature.x*focus)*(1.0-curvature.y*focus)-crossCurve*crossCurve*focus*focus;
 let caustic=clamp(1.0/max(abs(determinant),.22),.3,4.0);
 textureStore(outputField,q,vec4f(slope,totalHeight,caustic));
}
`;

export const render = /* wgsl */`
struct Params {grid:vec4f,pointer:vec4f,brush:vec4f,color:vec4f,display:vec4f,paletteA:vec4f,paletteB:vec4f,paletteC:vec4f}
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var water:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
struct VertexOut{@builtin(position) position:vec4f,@location(0) uv:vec2f}
@vertex fn vertex(@builtin(vertex_index) id:u32)->VertexOut{
 let positions=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
 var out:VertexOut;out.position=vec4f(positions[id],0,1);out.uv=vec2f((positions[id].x+1.0)*.5,1.0-(positions[id].y+1.0)*.5);return out;
}
fn sky(ray:vec3f)->vec3f{
 let horizon=pow(1.0-clamp(ray.y,0.0,1.0),3.0);
 var color=mix(p.paletteA.xyz,p.paletteB.xyz,horizon);
 let cloud=sin(ray.x*7.0+sin(ray.z*5.0)*.9)*sin(ray.z*12.0-ray.x*2.0)*.5+.5;
 color=mix(color,p.paletteB.xyz,smoothstep(.55,.85,cloud)*.45);
 let foliage=smoothstep(.24,.7,sin(ray.x*13.0)*.25+sin(ray.z*17.0)*.2+(1.0-ray.y)*.65);
 color=mix(color,vec3f(.035,.105,.075),foliage*.48);
 return color;
}
@fragment fn fragment(in:VertexOut)->@location(0) vec4f{
 let uv=in.uv;let data=textureSampleLevel(water,smp,uv,0.0);
 let world=(uv-.5)*vec2f(p.display.z,1.0)*6.0;
 let normal=normalize(vec3f(-data.x,1.0,-data.y));
 let view=normalize(vec3f((uv.x-.5)*.14,1.0,.82+(.5-uv.y)*.55));
 let depth=select(select(.95,1.8,p.display.x>.5),3.5,p.display.x>1.5);
 let transmitted=refract(-view,normal,1.0/1.333);
 let pathLength=(depth+data.z)/max(-transmitted.y,.2);
 let floorPosition=world+transmitted.xz*pathLength;
 let tiles=floorPosition/.46;
 let f=fract(tiles);let edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
 let grout=1.0-smoothstep(.008,.027,edge);
 let tileVariation=.97+.03*sin(floor(tiles.x)*1.7+floor(tiles.y)*3.1);
 var floorColor=mix(vec3f(.53,.68,.62),vec3f(.43,.58,.55),grout*.65)*tileVariation;
 if(p.display.x>.5){
   let sand=.94+.035*sin(floorPosition.x*19.0+sin(floorPosition.y*8.0))+.025*cos(floorPosition.y*31.0);
   floorColor=vec3f(.72,.69,.48)*sand;
 }
 let floorUV=floorPosition/(vec2f(p.display.z,1.0)*6.0)+.5;
 let caustic=textureSampleLevel(water,smp,clamp(floorUV,vec2f(.001),vec2f(.999)),0.0).w;
 floorColor*=.45+caustic*.65;
 let absorption=select(select(vec3f(.30,.075,.038),vec3f(.48,.13,.055),p.display.x>.5),vec3f(.85,.25,.11),p.display.x>1.5);
 let transmission=exp(-absorption*pathLength);
 let scattered=vec3f(.025,.28,.31);
 var throughWater=floorColor*transmission+scattered*(vec3f(1.0)-transmission)*.65;
 throughWater*=p.paletteC.xyz;
 let reflection=reflect(-view,normal);
 let fresnel=.0204+.9796*pow(1.0-max(dot(view,normal),0.0),5.0);
 let sunDirection=normalize(vec3f(-.14,.78,-.61));
 let sun=pow(max(dot(reflection,sunDirection),0.0),680.0);
 var color=mix(throughWater,sky(reflection),fresnel);
 color+=p.paletteB.xyz*(sun*2.8+pow(max(dot(reflection,sunDirection),0.0),90.0)*.14);
 // Soft basin-wall shadows and a gentle vignette give the water visible depth.
 let wallDistance=min(min(uv.x,1.0-uv.x)*p.display.z,min(uv.y,1.0-uv.y));
 color*=.75+.25*smoothstep(.0,.10,wallDistance);
 color*=1.0-.12*smoothstep(.25,.9,length((uv-.5)*vec2f(p.display.z,1.0)));
 color=color/(vec3f(1.0)+color*.35);
 return vec4f(pow(max(color,vec3f(0)),vec3f(.92)),1.0);
}
`;
