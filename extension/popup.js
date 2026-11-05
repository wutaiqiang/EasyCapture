'use strict';
const $=id=>document.getElementById(id);
function error(text) {$('error').textContent=text;$('error').hidden=false;}
async function save() {await chrome.storage.local.set({settings:{hideSticky:$('sticky').checked,wait:Number($('speed').value)}});}
async function init() {
  const {settings={}}=await chrome.storage.local.get('settings');
  $('sticky').checked=settings.hideSticky!==false;$('speed').value=String(settings.wait||450);
  const state=await chrome.runtime.sendMessage({type:'SHOT_STATUS'});
  if (state?.active) {$('start').disabled=true;$('status').textContent=`${state.active.stage}，已截取 ${state.active.count} 屏。返回网页按 Esc 可取消。`;}
  const {lastError}=await chrome.storage.session.get('lastError');
  if (lastError && Date.now()-lastError.at<120000 && !state?.active) error(lastError.message);
  const records=(await ShotDB.list('captures')).filter(x=>x.status==='ready').sort((a,b)=>b.createdAt-a.createdAt).slice(0,3);
  if (records.length) {
    $('recent-wrap').hidden=false;
    for (const record of records) {
      const button=document.createElement('button');button.className='recent';
      const title=document.createElement('span');title.textContent=record.title;
      const date=document.createElement('small');date.textContent=new Date(record.createdAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
      button.append(title,date);button.addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('preview.html')+'?id='+encodeURIComponent(record.id)}));
      $('recent').appendChild(button);
    }
  }
}
$('sticky').addEventListener('change',save);$('speed').addEventListener('change',save);
$('start').addEventListener('click',async()=>{
  $('error').hidden=true;$('start').disabled=true;
  try {
    await save();await chrome.storage.session.remove('lastError');
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const result=await chrome.runtime.sendMessage({type:'SHOT_START',tabId:tab.id});
    if (!result?.ok) throw new Error(result?.error||'无法开始截图。');
    window.close();
  } catch(e) {error(e.message);$('start').disabled=false;}
});
init().catch(e=>error(e.message));
