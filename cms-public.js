(function(){
  const cfg=window.AMONA_CMS||{};
  if(!cfg.supabaseUrl||!cfg.anonKey||!window.supabase)return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.anonKey);
  const safeType=t=>['new','repeat','all'].includes(t)?t:'all';
  const typeLabel={new:'新規',repeat:'再来',all:'全員'};

  async function loadImages(){
    const {data,error}=await db.from('site_images').select('slot,url,alt_text');
    if(error||!data)return;
    const map=Object.fromEntries(data.map(x=>[x.slot,x]));
    document.querySelectorAll('[data-cms-image]').forEach(img=>{const item=map[img.dataset.cmsImage];if(item&&item.url){img.src=item.url;if(item.alt_text)img.alt=item.alt_text}});
    const assets=new Map(data.filter(x=>x.slot.startsWith('asset:')&&x.url).map(x=>[x.slot.slice(6),x]));
    const originalPath=value=>{if(!value)return'';try{const url=new URL(value,location.href),path=decodeURIComponent(url.pathname).replace(/^\//,'');const at=path.indexOf('images/');return at>=0?path.slice(at):''}catch(_){return value.replace(/^\.\//,'')}};
    const applyAsset=img=>{if(!(img instanceof HTMLImageElement))return;const path=originalPath(img.getAttribute('src'));const item=assets.get(path);if(item&&item.url&&img.src!==item.url){img.src=item.url;if(item.alt_text&&!img.alt)img.alt=item.alt_text}};
    document.querySelectorAll('img').forEach(applyAsset);
    const observer=new MutationObserver(changes=>changes.forEach(change=>{if(change.type==='attributes')applyAsset(change.target);change.addedNodes.forEach(node=>{if(node.nodeType!==1)return;applyAsset(node);node.querySelectorAll?.('img').forEach(applyAsset)})}));
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(meta=>{const item=assets.get(originalPath(meta.content));if(item?.url)meta.content=item.url});
  }

  function couponCard(item){
    const type=safeType(item.customer_type),article=document.createElement('article');
    article.className='coupon-card';article.dataset.type=type;
    const badge=document.createElement('span');badge.className='type '+type;badge.textContent=typeLabel[type];article.appendChild(badge);
    if(item.tag){const tag=document.createElement('span');tag.className='tag';tag.textContent=item.tag;article.appendChild(tag)}
    const title=document.createElement('h2');title.textContent=item.title;article.appendChild(title);
    const price=document.createElement('strong');price.textContent=item.price;article.appendChild(price);
    const desc=document.createElement('p');desc.textContent=item.description||'';article.appendChild(desc);
    const actions=document.createElement('div'),consult=document.createElement('a');consult.href='reservation.html';consult.textContent='LINEで相談';actions.appendChild(consult);
    const reserve=document.createElement('a'),target=item.reserve_url||'reservation.html';reserve.className='reserve';reserve.href=target;reserve.textContent='このクーポンで予約';if(/^https?:/i.test(target)){reserve.target='_blank';reserve.rel='noopener nofollow'}actions.appendChild(reserve);article.appendChild(actions);
    return article;
  }

  async function loadCoupons(){
    const grid=document.querySelector('.coupon-grid');if(!grid)return;
    const {data,error}=await db.from('coupons').select('*').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error||!data||!data.length)return;
    grid.replaceChildren(...data.map(couponCard));
  }

  loadImages().catch(()=>{});loadCoupons().catch(()=>{});
})();
