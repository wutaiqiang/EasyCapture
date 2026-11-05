// Small, dependency-free ZIP writer (stored entries, UTF-8 filenames).
globalThis.ShotZip = (()=>{
  const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=bytes=>{let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  function header(size) {const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
  async function create(files) {
    const entries=[],central=[];let offset=0;
    const now=new Date(),year=Math.max(1980,Math.min(2107,now.getFullYear()));
    const date=((year-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    const time=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2);
    for(const file of files){
      const name=new TextEncoder().encode(file.name),bytes=new Uint8Array(await file.blob.arrayBuffer());
      const sum=crc(bytes),local=header(30+name.length),lv=local.view;
      lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);
      lv.setUint16(10,time,true);lv.setUint16(12,date,true);
      lv.setUint32(14,sum,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,name.length,true);local.bytes.set(name,30);
      entries.push(local.bytes,bytes);
      const record=header(46+name.length),cv=record.view;
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);
      cv.setUint16(12,time,true);cv.setUint16(14,date,true);
      cv.setUint32(16,sum,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);record.bytes.set(name,46);
      central.push(record.bytes);offset+=local.bytes.length+bytes.length;
    }
    const centralSize=central.reduce((n,b)=>n+b.length,0),end=header(22),ev=end.view;
    ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    return new Blob([...entries,...central,end.bytes],{type:'application/zip'});
  }
  return {create};
})();
