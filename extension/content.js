(() => {
  if (globalThis.__scrollshotInstalled) return;
  globalThis.__scrollshotInstalled=true;
  let state=null,host=null,shadow=null,highlight=null,tip=null,selected=null,notifyTimer=null;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const raf=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const parent=element=>element.parentElement || element.getRootNode()?.host || null;
  const pageRoot=()=>document.scrollingElement || document.documentElement;
  const isPage=element=>element===pageRoot() || element===document.documentElement || element===document.body;

  function mount(selecting) {
    unmount();
    host=document.createElement('div');
    host.setAttribute('data-scrollshot-ui','');
    host.style.cssText=`position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:${selecting?'auto':'none'}!important;display:block!important;visibility:visible!important;`;
    shadow=host.attachShadow({mode:'closed'});
    shadow.innerHTML=`<style>:host{all:initial}.cover{position:absolute;inset:0;cursor:crosshair}.highlight{position:fixed;box-sizing:border-box;border:3px solid #4674ff;border-radius:7px;background:#4674ff0d;box-shadow:0 0 0 99999px #0a173a26;pointer-events:none;display:none}.bar{position:fixed;top:16px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 32px);box-sizing:border-box;padding:13px 17px;border-radius:12px;background:#172644;color:#fff;font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;box-shadow:0 6px 28px #0003;display:flex;align-items:center;gap:18px;pointer-events:auto}.bar strong{display:block;font-size:14px}.bar small{display:block;color:#bfcde5;font-size:11px}.bar button{border:1px solid #7184a5;color:#fff;background:transparent;border-radius:7px;padding:6px 11px;cursor:pointer;white-space:nowrap;font:inherit}.bar.error{background:#7c2e35}</style><div class="${selecting?'cover':''}"></div><div class="highlight"></div><div class="bar"><div id="text"></div><button id="cancel">${selecting?'取消':'停止'}</button></div>`;
    document.documentElement.appendChild(host);
    highlight=shadow.querySelector('.highlight');tip=shadow.querySelector('#text');
    shadow.querySelector('#cancel').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();cancel();});
    if (selecting) {
      host.addEventListener('mousemove',move,true);
      host.addEventListener('click',choose,true);
      setTip('点击一个可滚动区域','蓝框会选中整页、表格或侧栏。按 Esc 取消；按住 Alt 选择外层。');
    }
  }
  function unmount() {clearTimeout(notifyTimer);host?.remove();host=shadow=highlight=tip=null;}
  function setTip(title,detail='') {
    if (!tip) return;
    tip.replaceChildren();const strong=document.createElement('strong');strong.textContent=title;tip.appendChild(strong);
    if (detail) {const small=document.createElement('small');small.textContent=detail;tip.appendChild(small);}
  }
  function notify(text,error=false) {
    if (!host) mount(false);
    host.style.setProperty('visibility','visible','important');
    shadow.querySelector('.bar').classList.toggle('error',error);
    shadow.querySelector('#cancel').style.display='none';
    setTip(text);
    clearTimeout(notifyTimer);notifyTimer=setTimeout(unmount,5000);
  }
  function below(x,y) {
    if (host) host.style.setProperty('pointer-events','none','important');
    let element=document.elementFromPoint(x,y);
    while (element?.shadowRoot?.elementFromPoint) {
      const deeper=element.shadowRoot.elementFromPoint(x,y);
      if (!deeper || deeper===element) break;element=deeper;
    }
    if (host) host.style.setProperty('pointer-events','auto','important');
    return element;
  }
  function candidates(element) {
    const result=[];
    for (let current=element;current && current!==document.documentElement;current=parent(current)) {
      if (isPage(current)) continue;
      const style=getComputedStyle(current);
      if (/(auto|scroll|overlay)/.test(style.overflowY) && current.clientHeight>=70 && current.clientWidth>=80 && current.scrollHeight>current.clientHeight+4) result.push(current);
    }
    const root=pageRoot();
    if (root.scrollHeight>innerHeight+4 || !result.length) result.push(root);
    return result;
  }
  function rawRect(target) {
    if (isPage(target)) return {left:0,top:0,width:document.documentElement.clientWidth,height:innerHeight};
    const rect=target.getBoundingClientRect();
    const computed=getComputedStyle(target);
    const borderLeft=parseFloat(computed.borderLeftWidth)||0,borderTop=parseFloat(computed.borderTopWidth)||0;
    const leftInset=target.clientLeft>borderLeft+2?target.clientLeft:borderLeft;
    return {left:rect.left+leftInset,top:rect.top+borderTop,width:target.clientWidth,height:target.clientHeight};
  }
  function visibleRect(target) {
    const original=rawRect(target);
    let left=Math.max(0,original.left),top=Math.max(0,original.top),right=Math.min(innerWidth,original.left+original.width),bottom=Math.min(innerHeight,original.top+original.height);
    if (!isPage(target)) for(let p=parent(target);p && !isPage(p);p=parent(p)) {
      const style=getComputedStyle(p),r=rawRect(p);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {top=Math.max(top,r.top);bottom=Math.min(bottom,r.top+r.height);}
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {left=Math.max(left,r.left);right=Math.min(right,r.left+r.width);}
    }
    return {left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top),clipTop:Math.max(0,top-original.top)};
  }
  function move(event) {
    if (!state || state.phase!=='selecting' || event.composedPath().some(x=>x===shadow?.querySelector('.bar') || x===shadow?.querySelector('#cancel'))) return;
    const element=below(event.clientX,event.clientY);
    if (!element) return;
    if (element.tagName==='IFRAME' || element.tagName==='FRAME') {
      selected=null;highlight.style.display='none';setTip('此处是嵌入的网页','请把嵌入页面在独立标签中打开，再选择它的滚动区域。');return;
    }
    const list=candidates(element);selected=list[event.altKey && list.length>1?1:0];
    const rect=visibleRect(selected);
    Object.assign(highlight.style,{display:'block',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    const full=isPage(selected);
    setTip(full?'点击截取整个网页':'点击截取这个滚动区域',`${Math.round(rect.width)} × ${Math.round(selected.scrollHeight)} · 当前可见宽度 · Esc 取消`);
  }
  function choose(event) {
    if (event.composedPath().some(x=>x===shadow?.querySelector('.bar') || x===shadow?.querySelector('#cancel'))) return;
    if (!state || state.phase!=='selecting' || !selected) return;
    event.preventDefault();event.stopImmediatePropagation();
    state.target=selected;state.phase='selected';
    host.style.setProperty('pointer-events','none','important');
    chrome.runtime.sendMessage({type:'SHOT_AREA_SELECTED',id:state.id}).then(result=>{
      if (!result?.ok) {const text=result?.error||'无法开始截图。';cleanup();notify(text,true);}
    }).catch(error=>{cleanup();notify(error.message,true);});
  }
  function cancel() {
    if (!state) {unmount();return;}
    const id=state.id,phase=state.phase;
    state.cancelled=true;
    chrome.runtime.sendMessage({type:'SHOT_CANCEL',id}).catch(()=>{});
    if (phase==='selecting' || phase==='selected') {cleanup();notify('已取消选择。');}
    else {setTip('正在停止…','页面位置将在结束后恢复。');}
  }
  document.addEventListener('keydown',event=>{
    if (state && event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();cancel();}
  },true);

  function style(element,property,value) {
    if (!state.styles.has(element)) state.styles.set(element,new Map());
    const saved=state.styles.get(element);
    if (!saved.has(property)) saved.set(property,[element.style.getPropertyValue(property),element.style.getPropertyPriority(property)]);
    element.style.setProperty(property,value,'important');
  }
  function rememberScroll(element) {
    if (!state.positions.has(element)) state.positions.set(element,{top:element.scrollTop,left:element.scrollLeft});
  }
  function cleanup() {
    const previous=state;
    if (previous?.styles) {
      for (const [element,properties] of previous.styles) for (const [property,[value,priority]] of properties) {
        if (value) element.style.setProperty(property,value,priority);else element.style.removeProperty(property);
      }
      // Keep smooth scrolling disabled while restoring the saved positions.
      for (const [element,position] of previous.positions) {
        const old=element.style.getPropertyValue('scroll-behavior'),priority=element.style.getPropertyPriority('scroll-behavior');
        element.style.setProperty('scroll-behavior','auto','important');
        element.scrollLeft=position.left;element.scrollTop=position.top;
        if (old) element.style.setProperty('scroll-behavior',old,priority);else element.style.removeProperty('scroll-behavior');
      }
    }
    previous?.pauseStyle?.remove();state=null;selected=null;unmount();
  }
  function metadata() {
    if (!state || state.cancelled) throw new Error('已取消截图。');
    const target=state.target;
    if (!target?.isConnected) throw new Error('滚动区域已被网页替换，请重新选择。');
    const rect=visibleRect(target);
    if (rect.width<50 || rect.height<50) throw new Error('滚动区域太小或不在屏幕内，请先把它完整移到屏幕中。');
    if (state.initial && (Math.abs(rect.width-state.initial.rect.width)>1 || innerWidth!==state.initial.viewport.width || innerHeight!==state.initial.viewport.height)) throw new Error('截图期间窗口或区域宽度改变，请重新截图。');
    return {rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},start:target.scrollTop+rect.clipTop,scrollHeight:target.scrollHeight,clientHeight:target.clientHeight,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio||1},label:isPage(target)?'整个网页':(target.getAttribute('aria-label')||target.tagName.toLowerCase()+' 滚动区域')};
  }
  async function settle(wait) {
    await pause(wait);await raf();
    const target=state?.target;
    if (target) {
      const pending=[...target.querySelectorAll('img')].filter(image=>!image.complete && (()=>{const r=image.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;})());
      if (pending.length) await Promise.race([Promise.all(pending.map(image=>image.decode().catch(()=>{}))),pause(1000)]);
    }
    if (host) host.style.setProperty('visibility','hidden','important');
    await raf();
  }
  function repeatedElements() {
    const target=state.target;
    return [...(isPage(target)?document:target).querySelectorAll('*')].filter(element=>{
      if (element===host || element===target || element.contains(host)) return false;
      const computed=getComputedStyle(element),position=computed.position;
      if (position!=='fixed'&&position!=='sticky') return false;
      if (position==='sticky' && computed.top==='auto' && computed.bottom==='auto') return false;
      const r=element.getBoundingClientRect();
      return r.height>0 && r.width>0 && r.height<state.initial.rect.height*.65;
    });
  }
  async function prepare(request) {
    if (!state || request.id!==state.id || !state.target) throw new Error('选择已过期，请重新开始。');
    state.phase='capturing';state.options=request.options;state.positions=new Map();state.styles=new Map();
    try {
      const target=state.target;
      for (let p=target;p;p=parent(p)) {rememberScroll(p);style(p,'scroll-behavior','auto');style(p,'scroll-snap-type','none');style(p,'overflow-anchor','none');}
      rememberScroll(pageRoot());
      state.pauseStyle=document.createElement('style');
      state.pauseStyle.textContent='*{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';document.documentElement.appendChild(state.pauseStyle);
      if (!isPage(target)) {
        target.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});await raf();
        const visible=visibleRect(target);
        if (visible.height<target.clientHeight-2) {
          const border=target.offsetHeight-target.clientHeight;
          const outerWidth=target.getBoundingClientRect().width;
          style(target,'box-sizing','border-box');style(target,'min-height','0');
          style(target,'width',outerWidth+'px');
          style(target,'height',Math.max(80,visible.height+border)+'px');
          style(target,'max-height',Math.max(80,visible.height+border)+'px');
        }
      }
      target.scrollTop=0;await raf();
      if (!isPage(target)) {
        const area=visibleRect(target);
        for (const element of document.querySelectorAll('*')) {
          if (element===host || target.contains(element) || element.contains(target)) continue;
          const position=getComputedStyle(element).position;
          if (position!=='fixed' && position!=='sticky') continue;
          const r=element.getBoundingClientRect();
          if (r.width>0 && r.height>0 && r.height<innerHeight*.65 && r.left<area.left+area.width && r.right>area.left && r.top<area.top+area.height && r.bottom>area.top) style(element,'visibility','hidden');
        }
      }
      mount(false);setTip('正在准备截图…','保持当前标签页打开；按 Esc 可取消。');
      await settle(request.options.wait);
      state.initial=metadata();
      if (state.initial.start>1) throw new Error('区域顶部被外层容器裁切，请先将它完整移入屏幕再试。');
      state.repeated=repeatedElements();state.lastTop=target.scrollTop;state.frames=0;
      return {ok:true,...state.initial};
    } catch(error) {cleanup();throw error;}
  }
  async function next(request) {
    if (!state || state.id!==request.id || state.cancelled) throw new Error('已取消截图。');
    const target=state.target;state.frames++;
    const current=metadata();
    if (target.scrollTop>=target.scrollHeight-target.clientHeight-1) {
      await pause(Math.max(500,request.options.wait));
      if (target.scrollTop>=target.scrollHeight-target.clientHeight-1) return {ok:true,done:true};
    }
    if (request.options.hideSticky && state.frames===1) {
      for (const element of state.repeated) if (element.isConnected) style(element,'visibility','hidden');
    }
    const overlap=Math.min(64,Math.floor(current.rect.height*.15));
    const wanted=Math.min(target.scrollHeight-target.clientHeight,target.scrollTop+Math.max(32,current.rect.height-overlap));
    target.scrollTop=wanted;await settle(request.options.wait);
    if (target.scrollTop<=state.lastTop+.5) return {ok:true,done:true};
    state.lastTop=target.scrollTop;
    return {ok:true,...metadata()};
  }

  chrome.runtime.onMessage.addListener((request,sender,respond)=>{
    const run=async()=>{
      if (request.type==='SHOT_SELECT') {cleanup();state={id:request.id,phase:'selecting',cancelled:false};mount(true);return {ok:true};}
      if (request.type==='SHOT_CANCEL_SELECT') {cleanup();return {ok:true};}
      if (request.type==='SHOT_PREPARE') return prepare(request);
      if (request.type==='SHOT_NEXT') return next(request);
      if (request.type==='SHOT_PROGRESS') {
        if (state?.id===request.id && host) {host.style.setProperty('visibility','visible','important');setTip(`已截取 ${request.count} 屏`,'正在自动滚动；按 Esc 停止。');}
        return {ok:true};
      }
      if (request.type==='SHOT_FINISH') {if (state?.id===request.id) cleanup();notify(request.text,request.error);return {ok:true};}
      if (request.type==='SHOT_NOTIFY') {notify(request.text,request.error);return {ok:true};}
      return {ok:false,error:'未知请求。'};
    };
    run().then(respond,error=>respond({ok:false,error:error.message}));return true;
  });
})();
