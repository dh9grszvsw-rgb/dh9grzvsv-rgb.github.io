(function(){
const cfg=window.AMONA_CMS||{},configured=cfg.supabaseUrl&&cfg.anonKey&&window.supabase;
const $=s=>document.querySelector(s),loginCard=$('#loginCard'),adminArea=$('#adminArea'),logout=$('#logout'),message=$('#loginMessage');
if(!configured){$('#setupNotice').hidden=false;loginCard.hidden=true;return}
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.anonKey),slots=[['hero','トップのメイン画像'],['salon','店内紹介画像'],['haircare','ヘアケア画像'],['kids','キッズ画像'],['salon-card','サロンカード画像'],['staff','スタイリスト画像']];let coupons=[];
function showAdmin(on){loginCard.hidden=on;adminArea.hidden=!on;logout.hidden=!on;if(on){renderImages();loadCoupons()}}
db.auth.getSession().then(({data})=>showAdmin(!!data.session));db.auth.onAuthStateChange((_e,s)=>showAdmin(!!s));
$('#loginForm').onsubmit=async e=>{e.preventDefault();message.textContent='確認中…';const {error}=await db.auth.signInWithPassword({email:$('#email').value,password:$('#password').value});message.textContent=error?'ログインできません：'+error.message:''};logout.onclick=()=>db.auth.signOut();
function renderImages(){const list=$('#imageList');list.replaceChildren(...slots.map(([slot,label])=>{const box=document.createElement('div');box.className='image-item';box.innerHTML='<img alt=""><strong></strong><input type="file" accept="image/jpeg,image/png,image/webp">';box.querySelector('strong').textContent=label;const img=box.querySelector('img');db.from('site_images').select('url').eq('slot',slot).maybeSingle().then(({data})=>{if(data?.url)img.src=data.url});box.querySelector('input').onchange=e=>uploadImage(slot,label,e.target.files[0],img);return box}))}
async function uploadImage(slot,label,file,img){
if(!file)return;
if(file.size>8*1024*1024)return alert('画像は8MB以内にしてください。');
const {data:{session}}=await db.auth.getSession();
if(!session)return alert('ログインの有効期限が切れました。もう一度ログインしてください。');
const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=slot+'-'+Date.now()+'.'+ext;
const headers={apikey:cfg.anonKey,Authorization:'Bearer '+session.access_token};
const uploadResponse=await fetch(cfg.supabaseUrl+'/storage/v1/object/site-images/'+encodeURIComponent(path),{method:'POST',headers:{...headers,'Content-Type':file.type||'application/octet-stream','cache-control':'3600','x-upsert':'false'},body:file});
if(!uploadResponse.ok){const detail=await uploadResponse.json().catch(()=>({}));return alert('画像を保存できません：'+(detail.message||detail.error||uploadResponse.statusText));}
const publicUrl=cfg.supabaseUrl+'/storage/v1/object/public/site-images/'+encodeURIComponent(path);
const saveResponse=await fetch(cfg.supabaseUrl+'/rest/v1/site_images?on_conflict=slot',{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({slot,url:publicUrl,alt_text:label,updated_at:new Date().toISOString()})});
if(!saveResponse.ok){const detail=await saveResponse.json().catch(()=>({}));return alert('表示設定を保存できません：'+(detail.message||detail.error||saveResponse.statusText));}
img.src=publicUrl;
alert('画像を更新しました。');
}
async function loadCoupons(){const {data,error}=await db.from('coupons').select('*').order('sort_order').order('created_at',{ascending:false});if(error)return alert('クーポンを読み込めません：'+error.message);coupons=data||[];renderCoupons()}
function renderCoupons(){const list=$('#couponList');list.replaceChildren(...coupons.map(c=>{const row=document.createElement('div');row.className='coupon-row';const info=document.createElement('div');info.innerHTML='<b></b><small></small>';info.querySelector('b').textContent=c.title;const st=document.createElement('span');st.className='status'+(c.is_active?'':' off');st.textContent=c.is_active?'公開':'非公開';info.querySelector('b').appendChild(st);info.querySelector('small').textContent=(c.price||'')+'　'+(c.tag||'');const acts=document.createElement('div');acts.className='actions';const edit=document.createElement('button');edit.textContent='編集';edit.onclick=()=>editCoupon(c);const del=document.createElement('button');del.className='danger';del.textContent='削除';del.onclick=()=>deleteCoupon(c);acts.append(edit,del);row.append(info,acts);return row}))}
function editCoupon(c){$('#couponId').value=c.id;$('#customerType').value=c.customer_type;$('#sortOrder').value=c.sort_order||0;$('#tag').value=c.tag||'';$('#couponTitle').value=c.title||'';$('#price').value=c.price||'';$('#isActive').value=String(c.is_active);$('#description').value=c.description||'';$('#reserveUrl').value=c.reserve_url||'';$('#couponFormTitle').textContent='クーポンを編集';$('#couponForm').scrollIntoView({behavior:'smooth'})}
function resetForm(){$('#couponForm').reset();$('#couponId').value='';$('#sortOrder').value=0;$('#couponFormTitle').textContent='クーポンを追加'}$('#couponCancel').onclick=resetForm;
$('#couponForm').onsubmit=async e=>{e.preventDefault();const id=$('#couponId').value,payload={customer_type:$('#customerType').value,sort_order:+$('#sortOrder').value||0,tag:$('#tag').value.trim(),title:$('#couponTitle').value.trim(),price:$('#price').value.trim(),is_active:$('#isActive').value==='true',description:$('#description').value.trim(),reserve_url:$('#reserveUrl').value.trim(),updated_at:new Date().toISOString()};const result=id?await db.from('coupons').update(payload).eq('id',id):await db.from('coupons').insert(payload);if(result.error)return alert('保存できません：'+result.error.message);resetForm();await loadCoupons();alert('クーポンを保存しました。')};
async function deleteCoupon(c){if(!confirm('「'+c.title+'」を削除しますか？'))return;const {error}=await db.from('coupons').delete().eq('id',c.id);if(error)return alert('削除できません：'+error.message);await loadCoupons()}
})();
