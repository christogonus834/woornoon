import { useEffect, useState, useCallback } from 'react';
import { supabase, api } from './api';

const money = (n) => '₦' + Number(n).toLocaleString();
const LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Denied', needs_review: 'Escalated' };
const FLAGS = { FINAL_SALE_ITEM: 'Final sale item', OUTSIDE_REFUND_WINDOW: 'Outside refund window', EXCEEDS_REMAINING_BALANCE: 'Exceeds remaining balance', ORDER_NOT_DELIVERED: 'Order not delivered' };
const Pill = ({ s }) => <span className={`pill ${s}`}>{LABEL[s]}</span>;
const COLORS = { pending: '#8F98BD', approved: '#1F7A55', rejected: '#C2374B', needs_review: '#B87410' };
const CAT_LABEL = { defective: 'Defective', not_as_described: 'Not as described', late_delivery: 'Late delivery', changed_mind: 'Changed mind', other: 'Other' };

function StatCards({ stats }) {
  return (<div className="stats">{stats.map((s, i) => (
    <div className="stat" key={s.label} style={{ '--i': i }}>
      <span className="stat-label">{s.label}</span>
      <strong className="stat-value">{s.value}</strong>
      {s.sub && <span className="stat-sub">{s.sub}</span>}
    </div>))}</div>);
}

// Pure SVG donut — no chart library needed, themed with our own palette.
function Donut({ data, size = 148 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 54, c = 2 * Math.PI * r;
  let offset = 0;
  return (<div className="donut-wrap">
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#E1E5F1" strokeWidth="18" />
      {data.filter(d => d.value > 0).map((d) => {
        const frac = d.value / total, len = frac * c;
        const el = (<circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="18"
          strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />);
        offset += len; return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)">{total}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="var(--slate)">requests</text>
    </svg>
    <ul className="legend">{data.map((d) => (
      <li key={d.label}><i style={{ background: d.color }} /> {d.label} <b>{d.value}</b></li>))}</ul>
  </div>);
}

export default function App() {
  const [session, setSession] = useState(null), [me, setMe] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => { session ? api('/me').then(setMe).catch(() => setMe(null)) : setMe(null); }, [session]);
  if (!ready) return null;
  return session && me ? <Shell me={me} /> : <Auth />;
}

function Auth() {
  const [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password: pw }) : await supabase.auth.signUp({ email, password: pw });
    if (error) setErr(error.message); setBusy(false);
  };
  return (
    <div className="auth">
      <section className="auth-art"><h1 className="mark">Workon</h1><p>Refunds that resolve<br />while your customer is still reading.</p></section>
      <form className="auth-card" onSubmit={go}>
        <h2>{mode === 'in' ? 'Welcome back' : 'Create your account'}</h2>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
      </form>
    </div>
  );
}

function Shell({ me }) {
  const admin = me.role === 'admin';
  const [view, setView] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const nav = admin ? [['overview', 'Overview'], ['queue', 'Refund queue'], ['orders', 'Orders'], ['settings', 'Settings']] : [['overview', 'Overview'], ['orders', 'Orders & refunds']];
  const go = (k) => { setView(k); setNavOpen(false); };
  return (
    <div className="shell">
      <header className="topbar">
        <button className="burger" onClick={() => setNavOpen(true)} aria-label="Open menu"><span /><span /><span /></button>
        <h1 className="mark xs">Workon</h1>
      </header>
      <div className={`nav-scrim ${navOpen ? 'on' : ''}`} onClick={() => setNavOpen(false)} />
      <aside className={navOpen ? 'open' : ''}>
        <h1 className="mark sm">Workon</h1>
        <nav className="nav">{nav.map(([k, l]) => (
          <button key={k} className={view === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>))}</nav>
        <div className="who"><b>{admin ? 'Support desk' : 'Customer'}</b><span>{me.email}</span></div>
        <button className="link light" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </aside>
      <main>{admin ? <Admin view={view} /> : <Customer view={view} />}</main>
    </div>
  );
}

function Drawer({ open, onClose, title, children }) {
  return (<>
    <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
    <section className={`drawer ${open ? 'on' : ''}`} aria-hidden={!open}><header><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></header>{open && children}</section>
  </>);
}

function Customer({ view }) {
  const [orders, setOrders] = useState([]), [refunds, setRefunds] = useState([]), [sel, setSel] = useState(null);
  const load = useCallback(() => { api('/orders').then(setOrders); api('/refunds').then(setRefunds); }, []);
  useEffect(load, [load]);

  const cancel = async (id) => {
    if (!confirm('Cancel this refund request?')) return;
    try { await api(`/refunds/${id}`, { method: 'DELETE' }); load(); } catch (e) { alert(e.message); }
  };

  if (view === 'overview') {
    const spent = orders.reduce((s, o) => s + Number(o.total), 0);
    const refunded = refunds.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0);
    const byStatus = ['pending', 'needs_review', 'approved', 'rejected'].map(k => ({ label: LABEL[k], value: refunds.filter(r => r.status === k).length, color: COLORS[k] }));
    return (<div className="page">
      <h2 className="title">Overview</h2>
      <StatCards stats={[
        { label: 'Orders', value: orders.length },
        { label: 'Total spent', value: money(spent) },
        { label: 'Refunded so far', value: money(refunded) },
        { label: 'Requests in review', value: refunds.filter(r => r.status === 'needs_review').length },
      ]} />
      <div className="chart-row">
        <div className="card"><h3>Your refund requests</h3><Donut data={byStatus} /></div>
        <div className="card grow"><h3>How this works</h3>
          <ol className="how">
            <li>You submit a refund request with a reason (and a photo, if it helps explain).</li>
            <li>Our AI reads it, checks it against store policy, and drafts a response.</li>
            <li>Clear-cut cases resolve instantly. Anything unusual goes to a support agent — you'll see the outcome here either way.</li>
          </ol>
        </div>
      </div>
    </div>);
  }

  return (<div className="page">
    <h2 className="title">Your orders</h2>
    <div className="list">{orders.map((o, i) => (
      <article className="row" key={o.id} style={{ '--i': i }}>
        <div><b>{o.item}</b>{o.is_final_sale && <span className="flag" style={{ marginLeft: '.5rem' }}>Final sale</span>}<span>{o.reference} · delivered {new Date(o.delivered_at).toLocaleDateString()}</span></div>
        <strong>{money(o.total)}</strong><button className="btn" onClick={() => setSel(o)}>Request refund</button>
      </article>))}</div>
    <h2 className="title">Refund requests</h2>
    {!refunds.length && <p className="empty">No requests yet. Pick an order above to start one.</p>}
    <div className="list">{refunds.map((f) => (
      <article className="row col" key={f.id}>
        <div className="between"><b>{f.order.item}</b><Pill s={f.status} /></div>
        <span>{money(f.amount)}</span>
        {f.image_url && <img className="evidence-thumb" src={f.image_url} alt="Uploaded evidence" />}
        {f.draft_reply && <p className="reply">{f.draft_reply}</p>}
        {f.status === 'needs_review' && <p className="reply">Our AI reviewed this and flagged it for a support agent to make the final call. You'll see the outcome here.</p>}
        {['pending', 'needs_review'].includes(f.status) && <button className="link" onClick={() => cancel(f.id)}>Cancel request</button>}
      </article>))}</div>
    <Drawer open={!!sel} onClose={() => setSel(null)} title="Request a refund">{sel && <RefundForm order={sel} done={() => { load(); setSel(null); }} />}</Drawer>
  </div>);
}

function RefundForm({ order, done }) {
  const [category, setCategory] = useState('defective');
  const [amount, setAmount] = useState(order.total), [reason, setReason] = useState(''), [key] = useState(() => crypto.randomUUID());
  const [file, setFile] = useState(null), [preview, setPreview] = useState(null);
  const [res, setRes] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [stage, setStage] = useState('');

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErr('Image must be under 5MB'); return; }
    setFile(f); setErr(''); setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      let imageUrl = null;
      if (file) {
        setStage('Uploading photo…');
        const path = `${key}-${file.name}`.replace(/\s+/g, '_');
        const { error: upErr } = await supabase.storage.from('refund-evidence').upload(path, file, { upsert: false });
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
        imageUrl = supabase.storage.from('refund-evidence').getPublicUrl(path).data.publicUrl;
      }
      setStage('Reviewing your request…');
      // The category the customer picks is folded straight into the text the AI reads —
      // a stronger signal than making the AI guess the category from prose alone.
      const fullReason = `Reason category selected by customer: ${CAT_LABEL[category]}.\n${reason}`;
      setRes(await api('/refunds', { method: 'POST', body: { orderId: order.id, amount: Number(amount), reason: fullReason, idempotencyKey: key, imageUrl } }));
      done();
    } catch (x) { setErr(x.message); } setBusy(false); setStage('');
  };

  if (res) return (<div className="result"><Pill s={res.status} /><p>{res.draft_reply || "Our AI reviewed this and flagged it for a support agent to make the final call. You'll see the outcome here."}</p></div>);
  return (<form onSubmit={submit}>
    <p className="muted">{order.item} · {order.reference}</p>
    <label>What kind of issue is this?
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {Object.entries(CAT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
    <label>Amount (₦)<input type="number" min="1" max={order.total} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
    <label>Tell us more<textarea rows="5" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="What went wrong, and what would you like us to do?" /></label>
    <label>Photo evidence (optional)<input type="file" accept="image/*" onChange={pickFile} /></label>
    {preview && <img className="evidence-thumb" src={preview} alt="Preview" />}
    {err && <p className="err" role="alert">{err}</p>}
    <button className="btn primary" disabled={busy}>{busy ? (stage || 'Please wait') : 'Send request'}</button>
  </form>);
}

function Admin({ view }) {
  const [items, setItems] = useState([]), [tab, setTab] = useState('needs_review'), [sel, setSel] = useState(null);
  const [note, setNote] = useState(''), [adjAmount, setAdjAmount] = useState(''), [err, setErr] = useState('');
  const [live, setLive] = useState(false);
  const load = useCallback(() => api('/admin/refunds').then(setItems), []);
  useEffect(() => { load(); }, [load]);

  // Realtime: any insert/update on refund_requests refreshes the queue automatically —
  // no manual refresh needed while a request comes in or a colleague acts on one.
  useEffect(() => {
    const channel = supabase.channel('refund-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests' }, () => load())
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => supabase.removeChannel(channel);
  }, [load]);

  if (view === 'overview') {
    const requested = items.reduce((s, x) => s + Number(x.amount), 0);
    const approvedAmt = items.filter(x => x.status === 'approved').reduce((s, x) => s + Number(x.amount), 0);
    const flagged = items.filter(x => x.injection_detected).length;
    const byStatus = ['pending', 'needs_review', 'approved', 'rejected'].map(k => ({ label: LABEL[k], value: items.filter(x => x.status === k).length, color: COLORS[k] }));
    const byCat = Object.entries(CAT_LABEL).map(([k, l]) => ({ label: l, value: items.filter(x => x.category === k).length }));
    const catMax = Math.max(1, ...byCat.map(c => c.value));
    return (<div className="page">
      <h2 className="title">Overview</h2>
      <StatCards stats={[
        { label: 'Total requests', value: items.length },
        { label: 'Awaiting review', value: items.filter(x => x.status === 'needs_review').length },
        { label: 'Amount requested', value: money(requested) },
        { label: 'Amount approved', value: money(approvedAmt) },
        { label: 'Injection attempts caught', value: flagged, sub: flagged ? 'flagged, not auto-approved' : 'none yet' },
      ]} />
      <div className="chart-row">
        <div className="card"><h3>By status</h3><Donut data={byStatus} /></div>
        <div className="card grow"><h3>By reason (AI-classified)</h3>
          <div className="bars">{byCat.map(c => (
            <div className="bar-row" key={c.label}><span>{c.label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.value / catMax) * 100}%` }} /></div>
              <b>{c.value}</b></div>))}</div>
        </div>
      </div>
    </div>);
  }

  if (view === 'orders') return <OrdersPanel />;
  if (view === 'settings') return <SettingsPanel />;

  const shown = items.filter((x) => tab === 'all' || x.status === tab);
  const openReview = (x) => { setSel(x); setNote(''); setAdjAmount(x.amount); setErr(''); };
  const decide = async (decision) => {
    setErr('');
    const body = { decision, note: note || undefined };
    if (decision === 'approved' && Number(adjAmount) !== Number(sel.amount)) body.amount = Number(adjAmount);
    try { await api(`/admin/refunds/${sel.id}/decision`, { method: 'POST', body }); setSel(null); load(); }
    catch (x) { setErr(x.message); }
  };

  const exportCSV = () => {
    const headers = ['id', 'customer_email', 'item', 'amount', 'status', 'category', 'confidence', 'injection_detected', 'created_at'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(','), ...shown.map((x) => [x.id, x.customer.email, x.order.item, x.amount, x.status, x.category, x.confidence, x.injection_detected, x.created_at].map(esc).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `workon-refunds-${tab}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (<div className="page">
    <div className="between"><h2 className="title">Refund queue{live && <span className="live" title="Realtime connected"><i />Live</span>}</h2></div>
    <div className="toolbar">
      <div className="tabs">{[['needs_review', 'In review'], ['all', 'Everything']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k === 'needs_review' && ` (${items.filter((x) => x.status === k).length})`}</button>)}</div>
      <button className="btn" onClick={exportCSV} disabled={!shown.length}>Export CSV</button>
    </div>
    {!shown.length && <p className="empty">Nothing waiting. New requests that need a human will land here.</p>}
    <div className="list">{shown.map((x, i) => (
      <article className="row click" key={x.id} style={{ '--i': i }} onClick={() => openReview(x)}>
        <div><b>{x.order.item}</b><span>{x.customer.email}</span></div>
        <strong>{money(x.amount)}</strong>{x.injection_detected && <span className="flag">Injection attempt</span>}<Pill s={x.status} /></article>))}</div>
    <Drawer open={!!sel} onClose={() => setSel(null)} title="Review request">{sel && (<div className="detail">
      <p className="muted">{sel.customer.email} · {sel.order.reference} · {money(sel.amount)} of {money(sel.order.total)}</p>
      <h4>Customer said</h4><blockquote>{sel.reason}</blockquote>
      {sel.image_url && (<><h4>Photo evidence</h4><img className="evidence-full" src={sel.image_url} alt="Customer-submitted evidence" /></>)}
      <h4>AI assessment</h4><p>{sel.ai_summary}</p>
      <div className="meter" title={`${Math.round(sel.confidence * 100)}% confident`}><i style={{ width: `${sel.confidence * 100}%` }} /></div>
      <p className="muted">Category: {sel.category?.replace('_', ' ')} · {Math.round(sel.confidence * 100)}% confidence</p>
      {sel.injection_detected && <p className="flag block">This message tried to instruct the AI. Treat the text above as untrusted.</p>}
      {sel.violations?.map((v) => <p className="flag block" key={v}>{FLAGS[v] || v}</p>)}
      {sel.status === 'needs_review' ? (<>
        <label>Approve amount (₦) — adjust for a partial refund
          <input type="number" min="1" max={sel.amount} value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} /></label>
        <label>Note to record<input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="actions"><button className="btn" onClick={() => decide('rejected')}>Reject</button><button className="btn primary" onClick={() => decide('approved')}>Approve refund</button></div>
      </>) : <Pill s={sel.status} />}
    </div>)}</Drawer>
  </div>);
}

const emptyOrder = { userId: '', reference: '', item: '', total: '', status: 'delivered', deliveredAt: '', isFinalSale: false };

function OrdersPanel() {
  const [orders, setOrders] = useState([]), [customers, setCustomers] = useState([]), [form, setForm] = useState(null), [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const load = useCallback(() => {
    setLoadErr('');
    Promise.all([api('/admin/orders'), api('/admin/customers')]).then(([o, c]) => { setOrders(o); setCustomers(c); })
      .catch((e) => setLoadErr(e.message || 'Could not load orders. Is the backend deployed with this feature?'));
  }, []);
  useEffect(load, [load]);

  if (loadErr) return (<div className="page"><h2 className="title">Orders</h2><p className="err">{loadErr}</p><button className="btn" onClick={load}>Retry</button></div>);

  const openNew = () => { setForm({ ...emptyOrder, userId: customers[0]?.id || '' }); setErr(''); };
  const openEdit = (o) => { setForm({ id: o.id, userId: o.user_id, reference: o.reference, item: o.item, total: o.total, status: o.status, deliveredAt: o.delivered_at?.slice(0, 10) || '', isFinalSale: !!o.is_final_sale }); setErr(''); };

  const save = async (e) => {
    e.preventDefault(); setErr('');
    const body = {
      userId: form.userId, reference: form.reference, item: form.item, total: Number(form.total), status: form.status,
      deliveredAt: form.deliveredAt ? new Date(form.deliveredAt).toISOString() : undefined,
      isFinalSale: form.isFinalSale,
    };
    try {
      if (form.id) await api(`/admin/orders/${form.id}`, { method: 'PUT', body });
      else await api('/admin/orders', { method: 'POST', body });
      setForm(null); load();
    } catch (x) { setErr(x.message); }
  };
  const remove = async (id) => {
    if (!confirm('Delete this order? This only works if it has no refund requests.')) return;
    try { await api(`/admin/orders/${id}`, { method: 'DELETE' }); load(); } catch (x) { alert(x.message); }
  };

  return (<div className="page">
    <div className="toolbar"><h2 className="title">Orders</h2><button className="btn primary" onClick={openNew} disabled={!customers.length}>+ New order</button></div>
    {!customers.length && <p className="empty">No customer accounts yet — have someone sign up first, then create orders for them here.</p>}
    <div className="list">{orders.map((o, i) => (
      <article className="row" key={o.id} style={{ '--i': i }}>
        <div><b>{o.item}</b>{o.is_final_sale && <span className="flag" style={{ marginLeft: '.5rem' }}>Final sale</span>}<span>{o.reference} · {o.customer?.email} · delivered {new Date(o.delivered_at).toLocaleDateString()}</span></div>
        <strong>{money(o.total)}</strong>
        <span className={`pill ${o.status === 'delivered' ? 'approved' : o.status === 'cancelled' ? 'rejected' : 'needs_review'}`}>{o.status}</span>
        <button className="btn" onClick={() => openEdit(o)}>Edit</button>
        <button className="link" onClick={() => remove(o.id)}>Delete</button>
      </article>))}</div>
    <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit order' : 'New order'}>
      {form && (<form onSubmit={save}>
        <label>Customer<select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
          {customers.map(c => <option key={c.id} value={c.id}>{c.email}</option>)}</select></label>
        <label>Reference<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required /></label>
        <label>Item<input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} required /></label>
        <label>Total (₦)<input type="number" min="1" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="delivered">Delivered</option><option value="processing">Processing</option><option value="cancelled">Cancelled</option></select></label>
        <label>Delivered on<input type="date" value={form.deliveredAt} onChange={(e) => setForm({ ...form, deliveredAt: e.target.value })} /></label>
        <label className="checkline"><input type="checkbox" checked={form.isFinalSale} onChange={(e) => setForm({ ...form, isFinalSale: e.target.checked })} /> Final sale item (not eligible for refund)</label>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="actions"><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button><button className="btn primary">{form.id ? 'Save changes' : 'Create order'}</button></div>
      </form>)}
    </Drawer>
  </div>);
}

function SettingsPanel() {
  const [s, setS] = useState(null), [err, setErr] = useState(''), [saved, setSaved] = useState(false), [probing, setProbing] = useState(false), [probe, setProbeResult] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const load = useCallback(() => { setLoadErr(''); api('/admin/settings').then(setS).catch((e) => setLoadErr(e.message || 'Could not load settings. Is the backend deployed with this feature?')); }, []);
  useEffect(load, [load]);

  const save = async (e) => {
    e.preventDefault(); setErr(''); setSaved(false);
    try {
      await api('/admin/settings', { method: 'PUT', body: { window_days: Number(s.window_days), auto_approve_max: Number(s.auto_approve_max), min_confidence: Number(s.min_confidence), policy_text: s.policy_text } });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (x) { setErr(x.message); }
  };
  const reset = async () => { if (confirm('Reset to default policy and thresholds?')) { await api('/admin/settings/reset', { method: 'POST' }); load(); } };
  const testAI = async () => { setProbing(true); setProbeResult(null); try { setProbeResult(await api('/admin/ai/probe')); } catch (x) { setProbeResult({ error: x.message }); } setProbing(false); };

  if (loadErr) return (<div className="page"><h2 className="title">Store settings</h2><p className="err">{loadErr}</p><button className="btn" onClick={load}>Retry</button></div>);
  if (!s) return <div className="page"><p className="muted">Loading…</p></div>;
  return (<div className="page">
    <h2 className="title">Store settings</h2>
    <div className="card">
      <h3>AI provider health</h3>
      <p className="muted">Pings every configured Gemini and Groq model directly and reports the real error for each — the same chain a live refund request uses.</p>
      <button className="btn" onClick={testAI} disabled={probing}>{probing ? 'Testing…' : 'Test AI'}</button>
      {probe && !probe.error && (<>
        <p className="muted" style={{ marginTop: '.8rem' }}>Gemini key: {probe.keys.gemini ? 'present' : 'missing'} · Groq key: {probe.keys.groq ? 'present' : 'missing'}</p>
        <div className="list" style={{ marginTop: '.6rem' }}>{probe.results.map((r) => (
          <div className="row" key={r.provider + r.model}>
            <div><b>{r.provider} / {r.model}</b>{!r.ok && <span style={{ color: 'var(--rose)', fontSize: '.8rem', display: 'block' }}>{r.error}</span>}</div>
            <span className={`pill ${r.ok ? 'approved' : 'rejected'}`}>{r.ok ? `OK · ${r.ms}ms` : 'Failed'}</span>
          </div>))}
        {!probe.results.length && <p className="empty">No API keys configured on the backend yet.</p>}</div>
      </>)}
      {probe?.error && <p className="err">{probe.error}</p>}
    </div>
    <form className="card" onSubmit={save}>
      <h3>Refund policy — read by the AI on every request</h3>
      <label>Policy text<textarea rows="5" maxLength={4000} value={s.policy_text} onChange={(e) => setS({ ...s, policy_text: e.target.value })} required /></label>
      <div className="grid2">
        <label>Refund window (days)<input type="number" min="1" max="365" value={s.window_days} onChange={(e) => setS({ ...s, window_days: e.target.value })} required /></label>
        <label>Auto-approve limit (₦)<input type="number" min="0" value={s.auto_approve_max} onChange={(e) => setS({ ...s, auto_approve_max: e.target.value })} required /></label>
        <label>Minimum AI confidence (0–1)<input type="number" min="0" max="1" step="0.05" value={s.min_confidence} onChange={(e) => setS({ ...s, min_confidence: e.target.value })} required /></label>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {saved && <p className="muted" style={{ color: 'var(--moss)' }}>Saved. New requests use these rules immediately.</p>}
      <div className="actions"><button type="button" className="link" onClick={reset}>Reset to defaults</button><button className="btn primary">Save settings</button></div>
    </form>
  </div>);
}
