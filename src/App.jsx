import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState('shop');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpPending, setOtpPending] = useState(false);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [reseller, setReseller] = useState(null);
  const [listings, setListings] = useState([]);
  const [wallet, setWallet] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [adminResellers, setAdminResellers] = useState([]);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', sale_price: '', stock: '10', sku: '', category_id: '', image_url: '', delivery_fee: '0', delivery_time: '3–5 working days', return_policy: '7-day return on eligible items', is_active: false });
  const [resellerForm, setResellerForm] = useState({ display_name: '', phone: '', payout_method: 'easypaisa', payout_account_name: '', payout_account_number: '' });
  const [profitInputs, setProfitInputs] = useState({});
  const [payoutForm, setPayoutForm] = useState({ amount: '', payout_method: 'easypaisa', account_name: '', account_number: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session) loadProfile(data.session.user.id); else setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next) loadProfile(next.user.id); else { setProfile(null); setReseller(null); setLoading(false); } });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { loadStore(); }, []);
  useEffect(() => { if (session && profile) loadPrivateData(); }, [session, profile]);

  async function loadStore() {
    const [p, c] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('is_active', true).order('name')
    ]);
    if (!p.error) setProducts(p.data || []);
    if (!c.error) setCategories(c.data || []);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!error) setProfile(data);
    setLoading(false);
  }

  async function loadPrivateData() {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    const [ra, rl, wt, pr] = await Promise.all([
      supabase.from('reseller_accounts').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('reseller_listings').select('*, products(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('reseller_wallet_transactions').select('*').eq('reseller_id', uid).order('created_at', { ascending: false }),
      supabase.from('reseller_payout_requests').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    ]);
    setReseller(ra.data || null); setListings(rl.data || []); setWallet(wt.data || []); setPayouts(pr.data || []);
    if (profile?.role === 'admin') {
      const { data } = await supabase.from('reseller_accounts').select('*').order('created_at', { ascending: false });
      setAdminResellers(data || []);
    }
  }

  const visibleProducts = useMemo(() => products.filter(p => {
    const text = `${p.name || ''} ${p.description || ''} ${p.sku || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (category === 'all' || p.category_id === category);
  }), [products, search, category]);
  const walletBalance = wallet.reduce((sum, t) => sum + (t.transaction_type === 'withdrawal' ? -Number(t.amount) : Number(t.amount)), 0);
  const isAdmin = profile?.role === 'admin';

  async function handleAuth(e) {
    e.preventDefault(); setMessage('');
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: auth.email, password: auth.password, options: { data: { full_name: auth.name } } });
      if (error) return setMessage(error.message);
      setOtpPending(true); setMessage('Verification code aap ke email par bhej diya gaya hai.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: auth.email, password: auth.password });
      if (error) setMessage(error.message); else { setPage('shop'); setMessage('Welcome to Rosevara!'); }
    }
  }
  async function verifyOtp(e) {
    e.preventDefault(); setMessage('');
    const { error } = await supabase.auth.verifyOtp({ email: auth.email, token: otp, type: 'signup' });
    setMessage(error ? error.message : 'Email verified successfully.'); if (!error) setOtpPending(false);
  }
  async function resendOtp() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: auth.email });
    setMessage(error ? error.message : 'New verification code sent.');
  }
  async function logout() { await supabase.auth.signOut(); setPage('shop'); setCart([]); }
  function addToCart(p) { setCart(old => { const found = old.find(x => x.id === p.id); return found ? old.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...old, { ...p, qty: 1 }]; }); setMessage('Product cart mein add ho gaya.'); }
  function toggleWish(p) { setWishlist(old => old.includes(p.id) ? old.filter(id => id !== p.id) : [...old, p.id]); }

  async function applyReseller(e) {
    e.preventDefault(); if (!session) return setMessage('Reseller apply karne ke liye pehle login karein.');
    const { error } = await supabase.from('reseller_accounts').insert({ user_id: session.user.id, ...resellerForm });
    setMessage(error ? error.message : 'Reseller application submit ho gayi. Admin approval ka intezar karein.'); if (!error) loadPrivateData();
  }
  async function saveListing(product) {
    const profit = Number(profitInputs[product.id] || 0);
    if (profit < 0 || !Number.isFinite(profit)) return setMessage('Valid profit amount enter karein.');
    const { error } = await supabase.from('reseller_listings').upsert({ user_id: session.user.id, product_id: product.id, profit_amount: profit, is_active: true }, { onConflict: 'user_id,product_id' });
    setMessage(error ? error.message : 'Product aap ki reseller list mein add ho gaya.'); if (!error) loadPrivateData();
  }
  async function requestPayout(e) {
    e.preventDefault(); const amount = Number(payoutForm.amount);
    if (amount <= 0 || amount > walletBalance) return setMessage('Withdrawal amount available balance se zyada nahi ho sakta.');
    const { error } = await supabase.from('reseller_payout_requests').insert({ user_id: session.user.id, ...payoutForm, amount, status: 'pending' });
    setMessage(error ? error.message : 'Withdrawal request submit ho gayi.'); if (!error) { setPayoutForm({ ...payoutForm, amount: '' }); loadPrivateData(); }
  }
  async function reviewReseller(userId, status) {
    const { error } = await supabase.from('reseller_accounts').update({ status, updated_at: new Date().toISOString() }).eq('user_id', userId);
    setMessage(error ? error.message : `Reseller ${status}.`); if (!error) loadPrivateData();
  }
  async function saveProduct(e) {
    e.preventDefault(); if (!isAdmin) return;
    const payload = { ...productForm, slug: slug(productForm.name), price: Number(productForm.price), sale_price: productForm.sale_price ? Number(productForm.sale_price) : null, stock: Number(productForm.stock), delivery_fee: Number(productForm.delivery_fee || 0), category_id: productForm.category_id || null, image_url: productForm.image_url || null, images: productForm.image_url ? [productForm.image_url] : [] };
    const { error } = await supabase.from('products').insert(payload);
    setMessage(error ? error.message : 'Product save ho gaya.'); if (!error) { setProductForm({ ...productForm, name: '', description: '', price: '', sale_price: '', sku: '', image_url: '' }); loadStore(); }
  }

  if (loading) return <div className="loading-screen"><div className="brand-mark">R</div><p>Rosevara is preparing your experience…</p></div>;

  return <div className="app-shell">
    <div className="announcement">A little luxury, delivered with love <span>✦</span> Pakistan first · Worldwide next</div>
    <header className="site-header">
      <button className="brand" onClick={() => setPage('shop')}><span className="brand-icon">R</span><span>ROSEVARA<small>THE ART OF EVERYDAY LUXURY</small></span></button>
      <div className="header-search"><span>⌕</span><input value={search} onChange={e => { setSearch(e.target.value); setPage('shop'); }} placeholder="Search products, brands and more…" /></div>
      <nav className="header-actions"><button onClick={() => setPage('wishlist')}>♡ <span className="nav-label">Wishlist</span></button><button onClick={() => setPage('cart')}>Bag ({cart.reduce((n,x)=>n+x.qty,0)})</button>{session ? <button onClick={() => setPage(isAdmin ? 'admin' : reseller?.status === 'approved' ? 'reseller' : 'account')}>My Account</button> : <button className="sign-in" onClick={() => setPage('login')}>Sign in</button>}</nav>
    </header>
    <div className="category-strip"><button className={category==='all'?'selected':''} onClick={()=>{setCategory('all');setPage('shop');}}>All Collections</button>{categories.map(c=><button key={c.id} className={category===c.id?'selected':''} onClick={()=>{setCategory(c.id);setPage('shop');}}>{c.name}</button>)}<button onClick={()=>setPage('reseller')}>Become a Reseller</button></div>
    {message && <div className="toast"><span>{message}</span><button onClick={()=>setMessage('')}>×</button></div>}

    {page === 'shop' && <><section className="hero"><div className="hero-copy"><span className="eyebrow">THE ROSEVARA EDIT</span><h1>Find your<br/><em>everyday luxury.</em></h1><p>Thoughtfully selected essentials, beautiful finds and little things that make every day feel special.</p><button className="gold-button" onClick={()=>document.getElementById('collection')?.scrollIntoView({behavior:'smooth'})}>EXPLORE COLLECTION <span>→</span></button></div><div className="hero-art"><div className="hero-orbit"></div><div className="hero-letters">R<span>✦</span></div><div className="hero-note">CURATED WITH CARE<br/>MADE TO BE YOURS</div></div><div className="hero-bottom">ROSEVARA <span>✦</span> DISCOVER · LOVE · REPEAT</div></section>
      <section className="trust-row"><div><b>✧</b><span>Curated Collections<small>Find your next favourite</small></span></div><div><b>♡</b><span>Made for You<small>Shop what you love</small></span></div><div><b>◇</b><span>Pakistan First<small>Worldwide ambition</small></span></div><div><b>✦</b><span>Rosevara Promise<small>Care in every detail</small></span></div></section>
      <main className="content-section" id="collection"><div className="section-heading"><div><span className="eyebrow">DISCOVER SOMETHING LOVELY</span><h2>Shop the collection</h2></div><span className="result-count">{visibleProducts.length} PRODUCTS</span></div>
        <div className="product-grid">{visibleProducts.map(p=><article className="product-card" key={p.id}><div className="product-image">{p.image_url ? <img src={p.image_url} alt={p.name}/> : <div className="image-placeholder">ROSEVARA <span>✦</span></div>}<button className={`wish-button ${wishlist.includes(p.id)?'active':''}`} onClick={()=>toggleWish(p)} aria-label="Add to wishlist">{wishlist.includes(p.id)?'♥':'♡'}</button>{p.is_featured&&<span className="featured-tag">FEATURED</span>}</div><div className="product-info"><span className="product-sku">{p.sku || 'ROSEVARA SELECT'}</span><h3>{p.name}</h3><p>{p.description || 'A thoughtful find from Rosevara.'}</p><div className="price-line"><strong>{money(p.sale_price || p.price)}</strong>{p.sale_price && Number(p.sale_price)<Number(p.price)&&<del>{money(p.price)}</del>}</div><button className="add-button" onClick={()=>addToCart(p)}>ADD TO BAG <span>＋</span></button></div></article>)}</div>
        {!visibleProducts.length&&<div className="empty-state"><div>✧</div><h3>Your next favourite is waiting</h3><p>No products found. Try another search or category.</p></div>}
      </main></>}

    {page === 'login' && <section className="panel auth-panel"><span className="eyebrow">WELCOME TO ROSEVARA</span><h2>{otpPending?'Verify your email':authMode==='login'?'Welcome back':'Create your account'}</h2><p>Sign in to enjoy your Rosevara experience.</p>{otpPending?<form onSubmit={verifyOtp}><label>6-digit verification code</label><input value={otp} onChange={e=>setOtp(e.target.value)} required placeholder="Enter email code"/><button className="gold-button full">VERIFY EMAIL</button><button type="button" className="text-button" onClick={resendOtp}>Resend code</button></form>:<form onSubmit={handleAuth}>{authMode==='signup'&&<><label>Full name</label><input value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} required placeholder="Your full name"/></>}<label>Email address</label><input type="email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} required placeholder="you@example.com"/><label>Password</label><input type="password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} required minLength="6" placeholder="At least 6 characters"/><button className="gold-button full">{authMode==='login'?'SIGN IN':'CREATE ACCOUNT'}</button><button type="button" className="text-button" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?"New to Rosevara? Create an account":"Already have an account? Sign in"}</button></form>}</section>}

    {page === 'account' && <section className="panel"><span className="eyebrow">YOUR ROSEVARA</span><h2>My account</h2><p>{profile?.full_name || session?.user?.email}</p><div className="dashboard-links"><button onClick={()=>setPage('reseller')}>Reseller programme →</button><button onClick={()=>setPage('cart')}>My shopping bag →</button><button onClick={logout}>Sign out →</button></div></section>}

    {page === 'reseller' && <section className="content-section dashboard"><div className="section-heading"><div><span className="eyebrow">GROW WITH ROSEVARA</span><h2>Reseller Studio</h2></div><span className="status-pill">{reseller?.status || 'NOT REGISTERED'}</span></div>{!session?<div className="panel"><h3>Join the Rosevara Reseller Programme</h3><p>Sign in or create an account to apply.</p><button className="gold-button" onClick={()=>setPage('login')}>SIGN IN / REGISTER</button></div>:!reseller?<div className="panel"><h3>Apply to become a reseller</h3><p>Share Rosevara products, set your own profit and earn after successful delivery.</p><form onSubmit={applyReseller}><label>Display name</label><input required value={resellerForm.display_name} onChange={e=>setResellerForm({...resellerForm,display_name:e.target.value})}/><label>Phone number</label><input required value={resellerForm.phone} onChange={e=>setResellerForm({...resellerForm,phone:e.target.value})} placeholder="03XX XXXXXXX"/><button className="gold-button full">SUBMIT APPLICATION</button></form></div>:reseller.status!=='approved'?<div className="panel"><h3>Application {reseller.status}</h3><p>{reseller.status==='pending'?'Your application is awaiting admin review.':'Please contact Rosevara support for next steps.'}</p></div>:<><div className="stats-grid"><div className="stat-card"><small>AVAILABLE WALLET</small><strong>{money(walletBalance)}</strong></div><div className="stat-card"><small>MY PRODUCTS</small><strong>{listings.length}</strong></div><div className="stat-card"><small>PAYOUT REQUESTS</small><strong>{payouts.length}</strong></div></div><div className="two-panels"><div className="panel"><h3>Add products to your showcase</h3><p>Set the profit you want to earn on each product. Customer price is calculated automatically.</p>{products.map(p=><div className="listing-row" key={p.id}><div><b>{p.name}</b><small>Base price: {money(p.sale_price||p.price)}</small></div><input aria-label="Your profit" type="number" min="0" placeholder="Profit Rs." value={profitInputs[p.id]??''} onChange={e=>setProfitInputs({...profitInputs,[p.id]:e.target.value})}/><button onClick={()=>saveListing(p)}>ADD</button></div>)}</div><div className="panel"><h3>Wallet & withdrawals</h3><div className="wallet-total">{money(walletBalance)}</div><form onSubmit={requestPayout}><label>Withdrawal amount</label><input type="number" min="1" max={walletBalance} value={payoutForm.amount} onChange={e=>setPayoutForm({...payoutForm,amount:e.target.value})} required/><label>Payment method</label><select value={payoutForm.payout_method} onChange={e=>setPayoutForm({...payoutForm,payout_method:e.target.value})}><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option><option value="bank">Bank transfer</option></select><label>Account title</label><input required value={payoutForm.account_name} onChange={e=>setPayoutForm({...payoutForm,account_name:e.target.value})}/><label>Account number</label><input required value={payoutForm.account_number} onChange={e=>setPayoutForm({...payoutForm,account_number:e.target.value})}/><button className="gold-button full" disabled={walletBalance<=0}>REQUEST WITHDRAWAL</button></form></div></div><div className="panel"><h3>My reseller products</h3>{listings.length?listings.map(l=><div className="simple-row" key={l.id}><span>{l.products?.name || 'Product'}</span><b>Base {money(l.base_price)} + Profit {money(l.profit_amount)} = {money(l.customer_price)}</b></div>):<p>You have not added any products yet.</p>}</div><div className="panel"><h3>Wallet history</h3>{wallet.length?wallet.map(t=><div className="simple-row" key={t.id}><span>{t.description || t.transaction_type}</span><b>{money(t.amount)}</b></div>):<p>No wallet transactions yet.</p>}</div></>}</section>}

    {page === 'cart' && <section className="content-section dashboard"><span className="eyebrow">YOUR SELECTION</span><h2>Shopping bag</h2>{cart.length? <><div className="panel">{cart.map(p=><div className="cart-row" key={p.id}><div><b>{p.name}</b><small>{money(p.sale_price||p.price)} · Qty {p.qty}</small></div><div><button onClick={()=>setCart(cart.map(x=>x.id===p.id?{...x,qty:Math.max(1,x.qty-1)}:x))}>−</button><button onClick={()=>setCart(cart.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x))}>＋</button><button onClick={()=>setCart(cart.filter(x=>x.id!==p.id))}>Remove</button></div></div>)}<div className="cart-total"><span>Subtotal</span><strong>{money(cart.reduce((n,p)=>n+Number(p.sale_price||p.price)*p.qty,0))}</strong></div><p className="notice">Checkout and payment will be enabled after secure order processing is configured.</p></div></>:<div className="empty-state"><h3>Your bag is waiting</h3><p>Add something lovely to get started.</p><button className="gold-button" onClick={()=>setPage('shop')}>CONTINUE SHOPPING</button></div>}</section>}

    {page === 'wishlist' && <section className="content-section dashboard"><span className="eyebrow">SAVED FOR LATER</span><h2>Your wishlist</h2><div className="product-grid">{products.filter(p=>wishlist.includes(p.id)).map(p=><article className="product-card" key={p.id}><div className="product-image">{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="image-placeholder">ROSEVARA ✦</div>}</div><div className="product-info"><h3>{p.name}</h3><strong>{money(p.sale_price||p.price)}</strong><button className="add-button" onClick={()=>addToCart(p)}>ADD TO BAG</button></div></article>)}</div>{!wishlist.length&&<p className="notice">Tap the heart on a product to save it here.</p>}</section>}

    {page === 'admin' && isAdmin && <section className="content-section dashboard"><span className="eyebrow">ROSEVARA CONTROL</span><h2>Admin dashboard</h2><div className="stats-grid"><div className="stat-card"><small>LIVE PRODUCTS</small><strong>{products.length}</strong></div><div className="stat-card"><small>RESELLER APPLICATIONS</small><strong>{adminResellers.length}</strong></div><div className="stat-card"><small>ACTIVE CATEGORIES</small><strong>{categories.length}</strong></div></div><div className="two-panels"><div className="panel"><h3>Add a product</h3><form onSubmit={saveProduct}><label>Product name</label><input required value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})}/><label>Description</label><textarea value={productForm.description} onChange={e=>setProductForm({...productForm,description:e.target.value})}/><label>Category</label><select value={productForm.category_id} onChange={e=>setProductForm({...productForm,category_id:e.target.value})}><option value="">Choose category</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><div className="form-grid"><div><label>Price</label><input type="number" required value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})}/></div><div><label>Sale price</label><input type="number" value={productForm.sale_price} onChange={e=>setProductForm({...productForm,sale_price:e.target.value})}/></div><div><label>Stock</label><input type="number" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})}/></div><div><label>SKU</label><input value={productForm.sku} onChange={e=>setProductForm({...productForm,sku:e.target.value})}/></div></div><label>Image URL</label><input value={productForm.image_url} onChange={e=>setProductForm({...productForm,image_url:e.target.value})} placeholder="https://…"/><label>Delivery fee</label><input type="number" value={productForm.delivery_fee} onChange={e=>setProductForm({...productForm,delivery_fee:e.target.value})}/><label>Delivery time</label><input value={productForm.delivery_time} onChange={e=>setProductForm({...productForm,delivery_time:e.target.value})}/><label className="check-line"><input type="checkbox" checked={productForm.is_active} onChange={e=>setProductForm({...productForm,is_active:e.target.checked})}/> Publish product immediately</label><button className="gold-button full">SAVE PRODUCT</button></form></div><div className="panel"><h3>Reseller applications</h3>{adminResellers.length?adminResellers.map(r=><div className="review-row" key={r.user_id}><div><b>{r.display_name}</b><small>{r.phone} · {r.status}</small></div>{r.status==='pending'&&<div><button onClick={()=>reviewReseller(r.user_id,'approved')}>Approve</button><button className="reject" onClick={()=>reviewReseller(r.user_id,'rejected')}>Reject</button></div>}</div>):<p>No reseller applications yet.</p>}</div></div></section>}

    <footer className="site-footer"><div className="footer-main"><div><div className="footer-brand">ROSEVARA<span>✦</span></div><p>Beautiful finds. Thoughtfully curated.<br/>A little luxury in every day.</p></div><div><b>EXPLORE</b><button onClick={()=>setPage('shop')}>Shop all</button><button onClick={()=>setPage('reseller')}>Reseller programme</button><button onClick={()=>setPage('account')}>My account</button></div><div><b>HELP & POLICIES</b><span>About us</span><span>Contact us</span><span>Privacy policy</span><span>Terms & conditions</span><span>Shipping & returns</span></div><div><b>STAY CONNECTED</b><span>Customer care: support@rosevara.com</span><span>Pakistan · Worldwide soon</span></div></div><div className="footer-bottom">© {new Date().getFullYear()} Rosevara. All rights reserved. <span>MADE WITH CARE ✦</span></div></footer>
  </div>;
}
