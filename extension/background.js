importScripts('shared/db.js','shared/stitch.js');

const DEFAULTS={hideSticky:true,wait:450};
const MAX_FRAMES=120;
let selection=null, active=null, lastCapture=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function message(tabId,type,payload={}) {
  const result=await chrome.tabs.sendMessage(tabId,{type,...payload});
  if (!result?.ok) throw new Error(result?.error || '无法连接网页，请刷新页面后重试。');
  return result;
}
async function badge(text,color='#3564eb') {
  await chrome.action.setBadgeBackgroundColor({color});
  await chrome.action.setBadgeText({text});
}
async function select(tabId) {
  if (active) throw new Error('正在截图，请等待完成，或返回原网页按 Esc 取消。');
  const tab=await chrome.tabs.get(tabId);
  if (!/^(https?:|file:)/.test(tab.url || '')) throw new Error('请在普通网页中使用，浏览器设置页和扩展页不支持截图。');
  if (selection) await message(selection.tabId,'SHOT_CANCEL_SELECT').catch(()=>{});
  const {settings={}}=await chrome.storage.local.get('settings');
  const options={...DEFAULTS,...settings};
  const id=crypto.randomUUID();
  await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
  selection={tabId,id,options};
  await message(tabId,'SHOT_SELECT',{id,options});
  return {ok:true};
}
async function visibleTab(tabId,windowId) {
  const tabs=await chrome.tabs.query({active:true,windowId});
  if (tabs[0]?.id!==tabId) throw new Error('截图期间切换了标签页，已取消并恢复页面。请保持目标标签页打开。');
  const window=await chrome.windows.get(windowId);
  if (window.state==='minimized') throw new Error('浏览器已最小化，请恢复窗口后重新截图。');
}

async function capture(tab,id,options) {
  active={id,tabId:tab.id,windowId:tab.windowId,cancelled:false,count:0,stage:'准备截图'};
  selection=null;
  let prepared=false,finished=false;
  try {
    await ShotDB.prune();
    await visibleTab(tab.id,tab.windowId);
    let meta=await message(tab.id,'SHOT_PREPARE',{id,options});prepared=true;
    const record={id,title:tab.title||'滚动截图',createdAt:Date.now(),status:'capturing',target:meta.label};
    await ShotDB.put('captures',record);
    const frames=[];
    let reason='';
    while (true) {
      if (active.cancelled) throw new Error('已取消截图。');
      active.stage='正在截图';
      await visibleTab(tab.id,tab.windowId);
      await pause(Math.max(0,650-(Date.now()-lastCapture)));
      if (active.cancelled) throw new Error('已取消截图。');
      await visibleTab(tab.id,tab.windowId);
      const png=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});
      lastCapture=Date.now();
      await visibleTab(tab.id,tab.windowId);
      if (active.cancelled) throw new Error('已取消截图。');
      const frame={captureId:id,index:frames.length,meta,...await ShotImage.crop(png,meta)};
      frames.push(frame);await ShotDB.put('frames',frame);
      active.count=frames.length;await badge(String(frames.length));
      await message(tab.id,'SHOT_PROGRESS',{id,count:frames.length});
      const estimatedPixels=frame.width*(meta.start+meta.rect.height)*frame.scaleY;
      if (frames.length>=MAX_FRAMES || estimatedPixels>140000000) {
        reason='内容较长，已达到本次截图长度上限，下面展示已捕获的部分。';break;
      }
      if (Date.now()-record.createdAt>180000) {reason='已达到本次截图时间上限，下面展示已捕获的部分。';break;}
      meta=await message(tab.id,'SHOT_NEXT',{id,options});
      if (meta.done) break;
    }
    active.stage='正在拼接';await badge('…');
    await message(tab.id,'SHOT_FINISH',{id,text:'截图已完成，正在拼接…'});prepared=false;
    const dimensions=await ShotImage.stitch(frames,part=>ShotDB.put('outputs',{...part,captureId:id}));
    if (active.cancelled) throw new Error('已取消截图。');
    await ShotDB.put('captures',{...record,...dimensions,status:'ready',frameCount:frames.length,partial:!!reason,notice:reason,finishedAt:Date.now()});
    await ShotDB.clearFrames(id);
    await ShotDB.prune();
    await chrome.tabs.create({url:chrome.runtime.getURL('preview.html')+'?id='+encodeURIComponent(id)});
    finished=true;
  } catch (error) {
    await ShotDB.remove(id).catch(()=>{});
    if (prepared) {await message(tab.id,'SHOT_FINISH',{id,text:error.message,error:true}).catch(()=>{});prepared=false;}
    else await message(tab.id,'SHOT_NOTIFY',{text:error.message,error:true}).catch(()=>{});
    await chrome.storage.session.set({lastError:{message:error.message,at:Date.now()}});
  } finally {
    if (prepared) await message(tab.id,'SHOT_FINISH',{id,text:finished?'完成':'截图已结束'}).catch(()=>{});
    active=null;await badge('');
  }
}

chrome.runtime.onMessage.addListener((request,sender,respond)=>{
  const handle=async()=>{
    if (request.type==='SHOT_START') return select(request.tabId);
    if (request.type==='SHOT_STATUS') return {ok:true,active:active?{count:active.count,stage:active.stage}:null};
    if (request.type==='SHOT_AREA_SELECTED') {
      if (!selection || sender.tab?.id!==selection.tabId || request.id!==selection.id || active) return {ok:false,error:'选择已过期，请重新开始。'};
      const {id,options}=selection;
      void capture(sender.tab,id,options);
      return {ok:true};
    }
    if (request.type==='SHOT_CANCEL') {
      if (active && sender.tab?.id===active.tabId && request.id===active.id) active.cancelled=true;
      if (selection && sender.tab?.id===selection.tabId && request.id===selection.id) selection=null;
      return {ok:true};
    }
    return {ok:false,error:'未知请求。'};
  };
  handle().then(respond,error=>respond({ok:false,error:error.message}));
  return true;
});
chrome.commands.onCommand.addListener(async command=>{
  if (command!=='select-area') return;
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  try {await select(tab.id);} catch(error) {await chrome.storage.session.set({lastError:{message:error.message,at:Date.now()}});}
});
chrome.tabs.onRemoved.addListener(tabId=>{if(active?.tabId===tabId) active.cancelled=true;if(selection?.tabId===tabId)selection=null;});
