const SH='Products';
const H=['ID','Name','Category','Brand','Model','Price','Discount Price','Stock','Description','Specifications','Image URLs','Image Public IDs','Featured','Status','Created At','Updated At'];
function sheet(){
  const id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss=id?SpreadsheetApp.openById(id.trim()):SpreadsheetApp.getActive();
  if(!ss) throw new Error('Script is not linked to a Google Sheet. Add SHEET_ID in Script Properties.');
  const s=ss.getSheetByName(SH)||ss.insertSheet(SH);
  if(s.getRange(1,1).getValue()!=='ID'){            // headers missing: add them (keeps any rows already there)
    if(s.getLastRow()>0) s.insertRowBefore(1);
    s.getRange(1,1,1,H.length).setValues([H]).setFontWeight('bold'); s.setFrozenRows(1);
  }
  return s;
}
const cache=()=>CacheService.getScriptCache();
const now=()=>new Date().toISOString();

function setup(){
  const s=sheet(); if(s.getLastRow()>1){return 'Sheet not empty, nothing changed.';}
  const smp=[['Fine Line Rose','Fine Line','Artist Aman','Forearm',3500,2999,3,'Delicate single-needle rose flash design.',{Placement:'Forearm',Size:'3 inch',Time:'1.5 hrs'}],
   ['Traditional Dagger','Traditional','Artist Riya','Calf',6000,0,2,'Bold-line neo traditional dagger with colour.',{Placement:'Calf',Size:'5 inch',Time:'3 hrs'}],
   ['Geometric Wolf','Blackwork','Artist Aman','Upper arm',9000,7999,0,'Dotwork and geometric blackwork wolf.',{Placement:'Upper arm',Size:'6 inch',Time:'4 hrs'}]];
  smp.forEach((p,i)=>s.appendRow(row({name:p[0],category:p[1],brand:p[2],model:p[3],price:p[4],discountPrice:p[5],stock:p[6],description:p[7],specs:p[8],images:[],publicIds:[],featured:i==0?'Yes':'No',status:'Active'},uid(),now())));
  return 'Setup done.';
}
const uid=()=>'P'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const out=o=>ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const u=x=>typeof x==='string'?x.replace(/^'(?=[=+\-@])/,''):x;
const split=s=>String(s||'').split(',').map(x=>x.trim()).filter(Boolean);
function t(v,max){v=String(v==null?'':v).replace(/[<>]/g,'').trim().slice(0,max||200);return /^[=+\-@]/.test(v)?"'"+v:v;}
function num(v){const n=Number(v);return isFinite(n)&&n>=0?n:0;}

function all(){
  const v=sheet().getDataRange().getValues(); const h=v.shift()||[];
  const r=[]; v.forEach((x,i)=>{if(x[0]==='')return;const o={_row:i+2};h.forEach((k,j)=>o[k]=x[j]);r.push(o);}); return r;
}
function toObj(r,admin){
  let sp={}; try{sp=JSON.parse(u(r['Specifications'])||'{}');}catch(e){}
  const o={id:String(r.ID),name:u(r.Name),category:u(r.Category),brand:u(r.Brand),model:u(r.Model),price:Number(r.Price)||0,
   discountPrice:Number(r['Discount Price'])||0,stock:Number(r.Stock)||0,description:u(r.Description),specs:sp,
   images:split(r['Image URLs']),featured:r.Featured==='Yes'};
  if(admin){o.publicIds=split(r['Image Public IDs']);o.status=r.Status;o.createdAt=r['Created At'];o.updatedAt=r['Updated At'];}
  return o;
}
function row(p,id,created){
  const name=t(p.name,150); if(!name) throw new Error('Name is required');
  const specs={}; Object.keys(p.specs||{}).slice(0,40).forEach(k=>{const kk=t(k,60);if(kk)specs[kk]=t(p.specs[k],200);});
  const urls=(p.images||[]).map(String).filter(x=>/^https:\/\/res\.cloudinary\.com\//.test(x));
  const ids=(p.publicIds||[]).map(x=>String(x).replace(/[^\w\-\/\.]/g,'')).filter(Boolean);
  if(urls.length!==ids.length) throw new Error('Image URLs and Public IDs do not match');
  const price=num(p.price),dp=num(p.discountPrice);
  if(dp&&dp>=price) throw new Error('Discount price must be lower than price');
  return [id,name,t(p.category,60),t(p.brand,60),t(p.model,80),price,dp||'',Math.floor(num(p.stock)),t(p.description,2000),
    JSON.stringify(specs),urls.join(','),ids.join(','),p.featured==='Yes'?'Yes':'No',p.status==='Hidden'?'Hidden':'Active',created,now()];
}
function findRow(id){const r=all().find(x=>String(x.ID)===String(id)); if(!r) throw new Error('Product not found'); return r;}

function getPub(){
  const c=cache(),h=c.get('pub'); if(h) return JSON.parse(h);
  const d=all().filter(r=>String(r.Status).trim()==='Active').map(r=>toObj(r,false));
  try{c.put('pub',JSON.stringify(d),60);}catch(e){} return d;
}
const uniq=a=>a.filter((x,i)=>x&&a.indexOf(x)===i).sort();
function doGet(e){
  try{
    const a=(e.parameter&&e.parameter.action)||'products', pub=getPub();
    if(a==='products') return out({ok:true,data:pub});
    if(a==='product'){const p=pub.find(x=>x.id===e.parameter.id); if(!p) throw new Error('Not found'); return out({ok:true,data:p});}
    if(a==='categories') return out({ok:true,data:uniq(pub.map(x=>x.category))});
    if(a==='config') return out({ok:true,data:{categories:uniq(pub.map(x=>x.category)),brands:uniq(pub.map(x=>x.brand))}});
    throw new Error('Unknown action');
  }catch(err){return out({ok:false,error:String(err.message||err)});}
}

function login(pw){
  const c=cache();
  if(Number(c.get('fails')||0)>=5) return {ok:false,error:'Too many attempts. Try again in 10 minutes.'};
  if(pw && pw===PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')){
    c.remove('fails'); const tk=Utilities.getUuid()+Utilities.getUuid(); c.put('t_'+tk,'1',21600); return {ok:true,token:tk};
  }
  c.put('fails',String(Number(c.get('fails')||0)+1),600); return {ok:false,error:'Wrong password'};
}
function doPost(e){
  try{
    const b=JSON.parse(e.postData.contents);
    if(b.action==='login') return out(login(b.password));
    if(!b.token||!cache().get('t_'+b.token)) return out({ok:false,auth:false,error:'Session expired, please log in again.'});
    if(b.action==='stats') return out({ok:true,data:stats()});
    const A={addProduct,updateProduct,deleteProduct,deleteImage,toggleStatus,bulkImport};
    if(!A[b.action]) throw new Error('Unknown action');
    const lock=LockService.getScriptLock(); lock.waitLock(20000);
    try{const d=A[b.action](b); cache().remove('pub'); return out({ok:true,data:d});}finally{lock.releaseLock();}
  }catch(err){return out({ok:false,error:String(err.message||err)});}
}

function stats(){
  const p=all().map(r=>toObj(r,true)), cats={};
  p.forEach(x=>cats[x.category||'Uncategorized']=(cats[x.category||'Uncategorized']||0)+1);
  return {products:p,stats:{total:p.length,low:p.filter(x=>x.stock>0&&x.stock<5).length,out:p.filter(x=>x.stock<=0).length,categories:cats}};
}
const asObj=a=>{const o={};H.forEach((k,i)=>o[k]=a[i]);return o;};
function addProduct(b){const id=uid(), r=row(b.product,id,now()); sheet().appendRow(r); return {id,product:toObj(asObj(r),true)};}
function updateProduct(b){
  const old=findRow(b.product.id), r=row(b.product,String(old.ID),old['Created At']);
  sheet().getRange(old._row,1,1,H.length).setValues([r]); return {id:old.ID,product:toObj(asObj(r),true)};
}
function toggleStatus(b){
  const r=findRow(b.id), s=String(r.Status)==='Active'?'Hidden':'Active', sh=sheet();
  sh.getRange(r._row,14).setValue(s); sh.getRange(r._row,16).setValue(now()); return {status:s};
}
function destroy(pid){
  const raw=PropertiesService.getScriptProperties().getProperties(), pr={}, ts=Math.floor(Date.now()/1000);
  Object.keys(raw).forEach(k=>pr[k]=String(raw[k]).trim());   // ignore stray spaces/newlines from copy-paste
  const cloud=pr.CLOUD_NAME, key=pr.CLOUDINARY_API_KEY, sec=pr.CLOUDINARY_API_SECRET;
  if(!cloud||!key||!sec) throw new Error('CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is missing in Script Properties');
  const base='https://api.cloudinary.com/v1_1/'+cloud, hex=b=>b.map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');
  let msg='';
  // 1) Signed destroy request (SHA-1, then SHA-256 if the account uses it)
  for(const a of [['SHA_1',''],['SHA_256','sha256']]){
    const sig=hex(Utilities.computeDigest(Utilities.DigestAlgorithm[a[0]],'public_id='+pid+'&timestamp='+ts+sec));
    const payload={public_id:pid,timestamp:ts,api_key:key,signature:sig}; if(a[1]) payload.signature_algorithm=a[1];
    const r=UrlFetchApp.fetch(base+'/image/destroy',{method:'post',muteHttpExceptions:true,payload:payload});
    let j={}; try{j=JSON.parse(r.getContentText());}catch(e){}
    if(r.getResponseCode()===200&&(j.result==='ok'||j.result==='not found')) return;
    msg=((j.error&&j.error.message)||r.getContentText()).slice(0,200);
    if(!/signature/i.test(msg)) throw new Error('Cloudinary delete failed for '+pid+': '+msg);
  }
  // 2) Fallback: Admin API delete with Basic auth (key:secret), no signature needed
  const r2=UrlFetchApp.fetch(base+'/resources/image/upload?public_ids[]='+encodeURIComponent(pid),{method:'delete',muteHttpExceptions:true,headers:{Authorization:'Basic '+Utilities.base64Encode(key+':'+sec)}});
  let j2={}; try{j2=JSON.parse(r2.getContentText());}catch(e){}
  const st=j2.deleted&&j2.deleted[pid];
  if(r2.getResponseCode()===200&&(st==='deleted'||st==='not_found')) return;
  if(r2.getResponseCode()===200&&(j2.unauthorized||[]).indexOf(pid)>=0) throw new Error('Cloudinary accepted your API key but refused to delete '+pid+' (unauthorized). The key probably lacks delete permission, or the image is locked. Run checkCloudinary and check the key in Cloudinary > Settings > API Keys.');
  throw new Error('Cloudinary delete failed for '+pid+'. Signed: '+msg.slice(0,60)+' | Admin API: '+r2.getResponseCode()+' '+r2.getContentText().slice(0,100)+' -> Key/secret/cloud name do not match. Run checkCloudinary.');
}
function deleteImage(b){
  const pid=String(b.publicId||'').replace(/[^\w\-\/\.]/g,''); if(!pid) throw new Error('publicId required');
  if(!b.id){destroy(pid);return {deleted:pid};}            // image uploaded but product not saved yet
  const r=findRow(b.id), urls=split(r['Image URLs']), ids=split(r['Image Public IDs']), i=ids.indexOf(pid);
  destroy(pid);                                              // throws on failure -> sheet untouched
  if(i>=0){urls.splice(i,1);ids.splice(i,1);const sh=sheet();sh.getRange(r._row,11,1,2).setValues([[urls.join(','),ids.join(',')]]);sh.getRange(r._row,16).setValue(now());}
  return {deleted:pid};
}
function deleteProduct(b){
  const r=findRow(b.id), urls=split(r['Image URLs']), ids=split(r['Image Public IDs']), sh=sheet();
  for(let i=ids.length-1;i>=0;i--){
    try{destroy(ids[i]);urls.splice(i,1);ids.splice(i,1);}
    catch(err){sh.getRange(r._row,11,1,2).setValues([[urls.join(','),ids.join(',')]]); throw new Error('Product NOT deleted. '+err.message);}
  }
  sh.deleteRow(r._row); return {deleted:b.id};
}
function bulkImport(b){
  const rows=b.rows; if(!Array.isArray(rows)||!rows.length||rows.length>500) throw new Error('Provide 1-500 rows');
  const existing={}; all().forEach(r=>existing[String(r.ID)]=r); const sh=sheet(), add=[], upd=[];
  rows.forEach((p,i)=>{try{
    const ex=p.id&&existing[String(p.id)];
    if(ex) upd.push([ex._row,row(p,String(ex.ID),ex['Created At'])]); else add.push(row(p,uid(),now()));
  }catch(err){throw new Error('Row '+(i+1)+': '+err.message);}});
  upd.forEach(x=>sh.getRange(x[0],1,1,H.length).setValues([x[1]]));
  if(add.length) sh.getRange(sh.getLastRow()+1,1,add.length,H.length).setValues(add);
  return {added:add.length,updated:upd.length};
}

// Run this from the Apps Script editor (select checkCloudinary > Run > View > Logs) to test your Cloudinary credentials.
function checkCloudinary(){
  const p=PropertiesService.getScriptProperties(), g=k=>(p.getProperty(k)||'').trim();
  const n=g('CLOUD_NAME'), k=g('CLOUDINARY_API_KEY'), s=g('CLOUDINARY_API_SECRET');
  const r=UrlFetchApp.fetch('https://api.cloudinary.com/v1_1/'+n+'/ping',{muteHttpExceptions:true,headers:{Authorization:'Basic '+Utilities.base64Encode(k+':'+s)}});
  Logger.log('Cloud name: '+n+' | API key length: '+k.length+' (normally 15) | secret length: '+s.length+' (normally 27) | secret starts with: '+s.slice(0,2)+' ends with: '+s.slice(-2));
  Logger.log('Cloudinary replied: '+r.getResponseCode()+' '+r.getContentText().slice(0,200));
  Logger.log(r.getResponseCode()===200?'RESULT: key and secret are CORRECT.':'RESULT: key / secret / cloud name do NOT match each other.');
  const L=UrlFetchApp.fetch('https://api.cloudinary.com/v1_1/'+n+'/resources/image/upload?prefix=catalog&max_results=5',{muteHttpExceptions:true,headers:{Authorization:'Basic '+Utilities.base64Encode(k+':'+s)}});
  Logger.log('Can this key see your uploaded images? '+L.getResponseCode()+' '+L.getContentText().slice(0,300));
}

