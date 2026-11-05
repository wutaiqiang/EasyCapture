globalThis.ShotImage = (() => {
  const MAX_PART_HEIGHT = 32760;
  const MAX_PART_PIXELS = 64000000;
  const MAX_TOTAL_PIXELS = 180000000;

  async function crop(dataUrl, meta) {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    try {
      const dpr=meta.viewport.devicePixelRatio;
      // PNG edges are rounded to whole pixels. Dividing a rounded height by
      // innerHeight creates a false scale at Windows 125% / 150% settings.
      const nativeScale=Number.isFinite(dpr) && Math.abs(bitmap.width-meta.viewport.width*dpr)<=1 && Math.abs(bitmap.height-meta.viewport.height*dpr)<=1;
      const sx = nativeScale?dpr:bitmap.width/meta.viewport.width;
      const sy = nativeScale?dpr:bitmap.height/meta.viewport.height;
      const left = Math.round(meta.rect.left*sx), top = Math.round(meta.rect.top*sy);
      const width = Math.min(bitmap.width-left, Math.round(meta.rect.width*sx));
      const height = Math.min(bitmap.height-top, Math.round(meta.rect.height*sy));
      if (width<1 || height<1 || width>16384 || height>32760) throw new Error('截图区域尺寸超出支持范围，请缩小浏览器缩放比例后重试。');
      const canvas = new OffscreenCanvas(width,height);
      const ctx = canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
      ctx.drawImage(bitmap,left,top,width,height,0,0,width,height);
      const blob = await canvas.convertToBlob({type:'image/png'});
      canvas.width=1;canvas.height=1;
      return {blob,width,height,scaleX:sx,scaleY:sy};
    } finally {bitmap.close();}
  }

  function plan(frames) {
    if (!frames.length) throw new Error('没有可拼接的截图。');
    const first=frames[0],width=first.width,scale=first.scaleY,base=first.meta.start;
    let covered=base;
    const usable=[];
    for (const frame of frames) {
      if (Math.abs(frame.width-width)>1 || Math.abs(frame.scaleY-scale)>.01) throw new Error('截图期间浏览器尺寸或缩放发生变化，请重新截图。');
      const start=frame.meta.start, end=start+frame.meta.rect.height;
      if (start>covered+1) throw new Error('滚动内容出现间隙，已停止拼接。请用慢速模式重试。');
      if (end<=covered+.1) continue;
      usable.push(frame);covered=end;
    }
    const slices=[];
    let from=base;
    for (let i=0;i<usable.length;i++) {
      const frame=usable[i],start=frame.meta.start,end=start+frame.meta.rect.height;
      // Join in the middle of the overlap, avoiding the clipped/antialiased
      // viewport edges on fractional display scales and scroll containers.
      const to=i+1<usable.length?(end+usable[i+1].meta.start)/2:end;
      const destinationTop=Math.round((from-base)*scale);
      const destinationBottom=Math.round((to-base)*scale);
      const sourceTop=Math.round((from-start)*scale);
      const height=Math.min(frame.height-sourceTop,destinationBottom-destinationTop);
      if (height>0) slices.push({index:frame.index,sourceTop,destinationTop,height});
      from=to;
    }
    const height=Math.round((covered-base)*scale);
    if (width*height>MAX_TOTAL_PIXELS) throw new Error('长图过大，请缩小浏览器缩放比例后重试。');
    const partHeight=Math.min(MAX_PART_HEIGHT,Math.floor(MAX_PART_PIXELS/width));
    return {width,height,slices,partHeight,parts:Math.ceil(height/partHeight)};
  }

  async function stitch(frames, savePart, progress = () => {}) {
    const layout=plan(frames);
    for (let part=0;part<layout.parts;part++) {
      const offset=part*layout.partHeight;
      const height=Math.min(layout.partHeight,layout.height-offset);
      const canvas=new OffscreenCanvas(layout.width,height);
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      for (const slice of layout.slices) {
        const top=Math.max(offset,slice.destinationTop);
        const bottom=Math.min(offset+height,slice.destinationTop+slice.height);
        if (bottom<=top) continue;
        const frame=frames.find(f=>f.index===slice.index);
        const bitmap=await createImageBitmap(frame.blob);
        try {
          const sourceY=slice.sourceTop+top-slice.destinationTop;
          ctx.drawImage(bitmap,0,sourceY,bitmap.width,bottom-top,0,top-offset,layout.width,bottom-top);
        } finally {bitmap.close();}
      }
      await savePart({index:part,blob:await canvas.convertToBlob({type:'image/png'}),width:layout.width,height,offset});
      canvas.width=1;canvas.height=1;
      progress(part+1,layout.parts);
    }
    return {width:layout.width,height:layout.height,parts:layout.parts};
  }
  return {crop,plan,stitch,MAX_TOTAL_PIXELS};
})();
