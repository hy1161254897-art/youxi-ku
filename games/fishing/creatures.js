/* Original creature art skinned by anatomical meshes, cached as smooth cycles. */
(function () {
  'use strict';
  const atlasFiles = ['assets/creatures-a.png','assets/creatures-b.png','assets/creatures-c.png'];
  // atlas, quadrant column, quadrant row, display width / body half-length.
  const sprites = {
    whale:[0,0,0,2.7], goldshark:[0,1,0,3.1], lobster:[0,0,1,2.8], octopus:[0,1,1,2.75],
    ray:[1,0,0,3.0], seahorse:[1,1,0,2.8], crab:[1,0,1,2.65], dragonfish:[1,1,1,3.25],
    clownfish:[2,0,0,2.55], tang:[2,1,0,2.55], butterfly:[2,0,1,2.55], turtle:[2,1,1,2.7],
  };
  const TAU=Math.PI*2, PAD=.14, sequences=new Map();
  const compact=window.innerWidth<700 || (matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth,window.innerHeight)<800) || (navigator.deviceMemory && navigator.deviceMemory<=4);
  const resolutions={whale:384,goldshark:360,lobster:288,octopus:320,ray:320,seahorse:240,crab:288,dragonfish:384,clownfish:192,tang:192,butterfly:208,turtle:288};
  const stats={renderer:'loading',frames:compact?24:32,ready:0,total:Object.keys(sprites).length,buildMs:0,memoryMiB:0};
  const canvas=(w=1,h=1)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const atlases = atlasFiles.map(src=>{const image=new Image();image.decoding='async';image.src=src;return image;});
  function imageReady(image){return new Promise(resolve=>{if(image.complete)return resolve(image.naturalWidth>0);image.onload=()=>resolve(true);image.onerror=()=>resolve(false);});}
  const deform=(id,u,v,phase)=>window.FishRigs?window.FishRigs.deform(id,u,v,phase):[u,v];
  function lattice(cols,rows){
    const points=[],indices=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)points.push([x/cols,y/rows]);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;indices.push(a,b,c,b,d,c);
    }
    return {points,indices};
  }
  function gpuRenderer(){
    const surface=canvas(),gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false});
    if(!gl)throw new Error('WebGL unavailable');
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const vs=shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 tex;void main(){tex=uv;gl_Position=vec4(position,0.,1.);}');
    const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D art;void main(){gl_FragColor=texture2D(art,tex);}');
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);
    const mesh=lattice(28,20),vertices=new Float32Array(mesh.points.length*4);
    const buffer=gl.createBuffer(),index=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength,gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.indices),gl.STATIC_DRAW);
    for(const [name,offset] of [['position',0],['uv',8]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,16,offset);}
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    const textures=atlases.map(image=>{
      if(!image.naturalWidth)return null;
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return texture;
    });
    return {surface,kind:'webgl',pose(id,phase,w,h){
      if(gl.isContextLost())throw new Error('WebGL context lost');
      if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
      const sprite=sprites[id];
      mesh.points.forEach(([u,v],i)=>{const p=deform(id,u,v,phase),k=i*4;vertices[k]=2*(p[0]+PAD)/(1+2*PAD)-1;vertices[k+1]=1-2*(p[1]+PAD)/(1+2*PAD);vertices[k+2]=(sprite[1]+u)/2;vertices[k+3]=(sprite[2]+v)/2;});
      gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindTexture(gl.TEXTURE_2D,textures[sprite[0]]);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
    },dispose(){textures.forEach(t=>t&&gl.deleteTexture(t));gl.deleteBuffer(buffer);gl.deleteBuffer(index);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);surface.width=surface.height=1;gl.getExtension('WEBGL_lose_context')?.loseContext();}};
  }
  // The affine triangle path also works for local file URLs without WebGL image permissions.
  function canvasRenderer(){
    const surface=canvas(),ctx=surface.getContext('2d'),mesh=lattice(24,16);
    function triangle(image,s,d){
      const sx1=s[1][0]-s[0][0],sy1=s[1][1]-s[0][1],sx2=s[2][0]-s[0][0],sy2=s[2][1]-s[0][1],det=sx1*sy2-sx2*sy1;
      const dx1=d[1][0]-d[0][0],dy1=d[1][1]-d[0][1],dx2=d[2][0]-d[0][0],dy2=d[2][1]-d[0][1];
      const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det,e=(dy2*sx1-dy1*sx2)/det;
      const cx=(d[0][0]+d[1][0]+d[2][0])/3,cy=(d[0][1]+d[1][1]+d[2][1])/3;
      ctx.save();ctx.beginPath();
      d.forEach(([x,y],i)=>{const length=Math.hypot(x-cx,y-cy)||1;x+=(x-cx)/length*.42;y+=(y-cy)/length*.42;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
      ctx.closePath();ctx.clip();ctx.globalCompositeOperation='copy';ctx.setTransform(a,b,c,e,d[0][0]-a*s[0][0]-c*s[0][1],d[0][1]-b*s[0][0]-e*s[0][1]);ctx.drawImage(image,0,0);ctx.restore();
    }
    return {surface,kind:'canvas',pose(id,phase,w,h){
      if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
      ctx.clearRect(0,0,w,h);const sprite=sprites[id],image=atlases[sprite[0]],cw=image.naturalWidth/2,ch=image.naturalHeight/2;
      const source=mesh.points.map(([u,v])=>[(sprite[1]+u)*cw,(sprite[2]+v)*ch]);
      const target=mesh.points.map(([u,v])=>{const p=deform(id,u,v,phase);return [(p[0]+PAD)*w/(1+2*PAD),(p[1]+PAD)*h/(1+2*PAD)];});
      for(let i=0;i<mesh.indices.length;i+=3){const t=mesh.indices.slice(i,i+3);triangle(image,t.map(k=>source[k]),t.map(k=>target[k]));}
    },dispose(){surface.width=surface.height=1;}};
  }
  async function buildAnimations(){
    const start=performance.now();let renderer;
    try{
      if(new URLSearchParams(location.search).get('renderer')==='canvas')throw new Error('Canvas compatibility preview');
      renderer=gpuRenderer();
    }catch(_){renderer=canvasRenderer();stats.frames=24;}
    stats.renderer=renderer.kind;
    let sliceStart=performance.now();
    for(const id of Object.keys(sprites)){
      if(!atlases[sprites[id][0]].naturalWidth)continue;
      const scale=compact?.75:(renderer.kind==='canvas'?.86:1);
      const w=Math.ceil(resolutions[id]*scale*(1+2*PAD)),h=Math.ceil(w*2/3),strideX=w+2,strideY=h+2;
      const sheet=canvas(strideX*8,strideY*Math.ceil(stats.frames/8)),ctx=sheet.getContext('2d');
      for(let frame=0;frame<stats.frames;frame++){
        const phase=frame/stats.frames*TAU;
        try{renderer.pose(id,phase,w,h);}catch(error){
          if(renderer.kind!=='webgl')throw error;
          renderer.dispose();renderer=canvasRenderer();stats.renderer='canvas';renderer.pose(id,phase,w,h);
        }
        ctx.drawImage(renderer.surface,(frame%8)*strideX+1,Math.floor(frame/8)*strideY+1);
        if(performance.now()-sliceStart>12){await new Promise(resolve=>setTimeout(resolve,0));sliceStart=performance.now();}
      }
      sequences.set(id,{sheet,w,h,strideX,strideY,frames:stats.frames});stats.ready++;
      stats.memoryMiB+=sheet.width*sheet.height*4/1048576;
    }
    renderer.dispose();stats.buildMs=Math.round(performance.now()-start);stats.memoryMiB=Math.round(stats.memoryMiB);
    window.dispatchEvent(new CustomEvent('fish-animation-ready',{detail:stats}));
  }
  const ready=Promise.all(atlases.map(imageReady)).then(async results=>{
    try{await buildAnimations();}catch(error){stats.renderer='static-fallback';console.warn('Creature animation cache unavailable:',error);}
    window.dispatchEvent(new CustomEvent('fish-assets-ready',{detail:{loaded:results.filter(Boolean).length}}));return results;
  });
  function draw(ctx, species, x, y, size, time=0, angle=0, motion=null) {
    const sprite=sprites[species.id];if(!sprite)return false;
    const atlas=atlases[sprite[0]];if(!atlas.complete||!atlas.naturalWidth)return false;
    const cw=atlas.naturalWidth/2,ch=atlas.naturalHeight/2;
    const w=size*sprite[3],h=w*ch/cw;
    const left=Math.cos(angle)<0;
    ctx.save();ctx.translate(x,y);ctx.rotate(left?angle-Math.PI:angle);ctx.scale(left?-1:1,1);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const sequence=!motion?.static&&sequences.get(species.id);
    if(sequence){
      const phase=Number.isFinite(motion?.phase)?motion.phase:time*(window.FishRigs?.frequencies[species.id]||1)*TAU;
      const frame=Math.floor(((phase%TAU+TAU)%TAU)/TAU*sequence.frames)%sequence.frames;
      ctx.drawImage(sequence.sheet,(frame%8)*sequence.strideX+1,Math.floor(frame/8)*sequence.strideY+1,sequence.w,sequence.h,-w*(.5+PAD),-h*(.5+PAD),w*(1+2*PAD),h*(1+2*PAD));
    }else ctx.drawImage(atlas,sprite[1]*cw,sprite[2]*ch,cw,ch,-w/2,-h/2,w,h);
    ctx.restore();return true;
  }
  window.FishSprites={draw,ready,stats};
})();
