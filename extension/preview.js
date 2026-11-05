'use strict';
const $=id=>document.getElementById(id);
const id=new URL(location.href).searchParams.get('id');
let record=null,parts=[],urls=[];
function error(text) {$('error').hidden=false;$('error').textContent=text;$('loading').hidden=true;}
function zoom(value) {
  if(!record)return;
  const scale=Math.max(.1,Math.min(2,value));
  $('images').style.width=Math.round(record.width*scale)+'px';$('zoom').value=Math.round(scale*100);$('zoom-value').value=Math.round(scale*100)+'%';
}
function fit(){zoom(Math.min(1,($('viewer').clientWidth-56)/record.width));}
function filename(){return (record.title||'scrollshot').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^\.+/,'').trim().slice(0,80)||'scrollshot';}
async function load(){
  if(!id)throw new Error('缺少截图编号。请点击扩展图标重新截图。');
  record=await ShotDB.get('captures',id);
  if(!record || record.status!=='ready')throw new Error('这张截图已被清理，或尚未完成。请从扩展图标重新截图。');
  parts=(await ShotDB.forCapture('outputs',id)).sort((a,b)=>a.index-b.index);
  if(parts.length!==record.parts)throw new Error('截图文件不完整，请重新截图。');
  $('title').textContent=record.title;document.title=record.title+' · 长截图';
  $('meta').textContent=`${record.width.toLocaleString()} × ${record.height.toLocaleString()} px · ${record.frameCount} 屏拼接 · ${new Date(record.createdAt).toLocaleString('zh-CN')}`;
  const notices=[];if(record.partial)notices.push(record.notice);if(parts.length>1)notices.push(`截图较长，已连续分为 ${parts.length} 张；下载时将按顺序打包为 ZIP。`);
  if(notices.length){$('notice').hidden=false;$('notice').textContent=notices.join(' ');}
  for(const part of parts){const url=URL.createObjectURL(part.blob);urls.push(url);const image=document.createElement('img');image.src=url;image.alt=`长截图第 ${part.index+1} 部分`;image.width=part.width;image.height=part.height;image.loading='lazy';$('images').appendChild(image);}
  $('loading').hidden=true;
  for(const name of ['fit','zoom','download','delete'])$(name).disabled=false;
  $('download').textContent=parts.length>1?'下载全部 ZIP':'下载 PNG';fit();
}
$('fit').addEventListener('click',fit);$('zoom').addEventListener('input',e=>zoom(Number(e.target.value)/100));
$('download').addEventListener('click',async()=>{
  $('download').disabled=true;
  try{
    const base=filename();
    const blob=parts.length===1?parts[0].blob:await ShotZip.create(parts.map((part,i)=>({name:base+'-'+String(i+1).padStart(2,'0')+'.png',blob:part.blob})));
    const url=URL.createObjectURL(blob);
    try {await chrome.downloads.download({url,filename:base+(parts.length===1?'.png':'.zip'),saveAs:true,conflictAction:'uniquify'});}
    finally {setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }catch(e){if(!/cancel/i.test(e.message))error('下载未完成：'+e.message);}
  finally{$('download').disabled=false;}
});
$('delete').addEventListener('click',async()=>{
  if(!confirm('删除这张截图的本机缓存？已经下载的文件不受影响。'))return;
  await ShotDB.remove(id);for(const url of urls)URL.revokeObjectURL(url);urls=[];$('images').replaceChildren();
  $('loading').hidden=false;$('loading').textContent='本机截图已删除。';
  for(const name of ['fit','zoom','download','delete'])$(name).disabled=true;
});
window.addEventListener('beforeunload',()=>{for(const url of urls)URL.revokeObjectURL(url);});
load().catch(e=>error(e.message));
