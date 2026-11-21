// Short-time spectrum of the actual sound buffer. A column is one Hann-windowed
// transform. Its vertical position is frequency and its brightness is magnitude.
(() => {
  const size=512, columns=440, rows=94, floorDb=-62;
  const windowWeights=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(size-1)));
  const reversed=Uint16Array.from({length:size},(_,i)=>{
    let value=0;
    for(let bit=1;bit<size;bit*=2){value=value*2+(i&1);i>>=1;}
    return value;
  });
  function transform(real,imag){
    for(let width=2;width<=size;width*=2){
      const half=width/2,angle=-2*Math.PI/width;
      const stepR=Math.cos(angle),stepI=Math.sin(angle);
      for(let offset=0;offset<size;offset+=width){
        let wr=1,wi=0;
        for(let j=offset;j<offset+half;j++){
          const other=j+half, r=wr*real[other]-wi*imag[other], im=wr*imag[other]+wi*real[other];
          real[other]=real[j]-r;imag[other]=imag[j]-im;
          real[j]+=r;imag[j]+=im;
          const next=wr*stepR-wi*stepI;wi=wr*stepI+wi*stepR;wr=next;
        }
      }
    }
  }
  window.makePitchMap=signal=>{
    const canvas=document.createElement('canvas');canvas.width=columns;canvas.height=rows;
    const ctx=canvas.getContext('2d'), pixels=ctx.createImageData(columns,rows);
    const real=new Float64Array(size),imag=new Float64Array(size);
    for(let x=0;x<columns;x++){
      const start=Math.round(x*(signal.samples.length-size)/(columns-1));
      for(let i=0;i<size;i++){real[reversed[i]]=signal.samples[start+i]*windowWeights[i];}
      imag.fill(0);transform(real,imag);
      for(let y=0;y<rows;y++){
        const bin=Math.round((rows-1-y)*4000*size/((rows-1)*signal.rate));
        const db=20*Math.log10(Math.max(1e-8,Math.hypot(real[bin],imag[bin])*4/size));
        const v=Math.max(0,Math.min(1,(db-floorDb)/(-floorDb)));
        const pos=4*(y*columns+x);
        pixels.data[pos]=22+204*v*v;
        pixels.data[pos+1]=40+174*v;
        pixels.data[pos+2]=35+115*v;
        pixels.data[pos+3]=255;
      }
    }
    ctx.putImageData(pixels,0,0);return canvas;
  };
})();
