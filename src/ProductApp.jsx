import { useEffect, useState } from 'react'
import './ProductApp.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://cuartodaryn.onrender.com/api'
const emptyProduct = { product_name: '', description: '', price: '', quantity: '' }

function tokenUser(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role ? { role: payload.role } : null
  } catch { return null }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong.')
  return data
}

function ProductApp() {
  const [token, setToken] = useState(() => localStorage.getItem('product_token'))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('product_user') || 'null') || tokenUser(localStorage.getItem('product_token') || '')
    } catch { return tokenUser(localStorage.getItem('product_token') || '') }
  })
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' })
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
  const secureHeaders = { Authorization: `Bearer ${token}` }

  async function loadProducts() {
    try { const data = await request('/products', { headers: secureHeaders }); setProducts(data.data || []) } catch (err) { setError(err.message) }
  }
  useEffect(() => { if (token) loadProducts() }, [token])
  useEffect(() => {
    document.documentElement.dataset.role = user?.role || 'guest'
    return () => { delete document.documentElement.dataset.role }
  }, [user])
  async function submitAuth(event) {
    event.preventDefault(); setError(''); setMessage('')
    try {
      const data = await request(authMode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: JSON.stringify(authForm) })
      if (authMode === 'register') { setAuthMode('login'); setMessage('Account created. Sign in to continue.'); return }
      localStorage.setItem('product_token', data.tokens.access_token); localStorage.setItem('product_user', JSON.stringify(data.user)); setUser(data.user); setToken(data.tokens.access_token)
    } catch (err) { setError(err.message) }
  }
  async function submitProduct(event) {
    event.preventDefault(); setError(''); setMessage('')
    try {
      const path = editingId ? `/products/${editingId}` : '/products'
      await request(path, { method: editingId ? 'PUT' : 'POST', headers: secureHeaders, body: JSON.stringify(form) })
      setForm(emptyProduct); setEditingId(null); setMessage(editingId ? 'Product updated.' : 'Product added.'); loadProducts()
    } catch (err) { setError(err.message) }
  }
  async function removeProduct(id) {
    if (!window.confirm('Delete this product?')) return
    try { await request(`/products/${id}`, { method: 'DELETE', headers: secureHeaders }); setMessage('Product deleted.'); loadProducts() } catch (err) { setError(err.message) }
  }
  function logout() { localStorage.removeItem('product_token'); localStorage.removeItem('product_user'); setUser(null); setToken(null); setProducts([]) }

  if (!token) return <main className="auth-shell"><section className="auth-panel"><p className="eyebrow">PRODUCT MANAGEMENT / LAB 06</p><h1>Keep your<br /><em>inventory</em> moving.</h1><p className="subtle">A clean workspace for tracking stock, pricing, and product details.</p><form onSubmit={submitAuth} className="auth-form">{authMode === 'register' && <label>Username<input required value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} /></label>}<label>Email<input required type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} /></label><label>Password<input required type="password" minLength="6" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} /></label><button className="primary" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button></form>{error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}<button className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}</button></section><aside className="auth-art"><span>01</span><strong>STOCK<br />ROOM</strong><i>●</i></aside></main>

  return <main className="app-shell"><header><div><p className="eyebrow">PRODUCT MANAGEMENT / LAB 06</p><h1>Inventory <em>desk</em></h1></div><button className="logout" onClick={logout}>Log out ↗</button></header><section className="dashboard"><div className="list-panel"><div className="section-head"><div><p className="eyebrow">LIVE CATALOG</p><h2>Products <span>{products.length}</span></h2></div><div className="status-dot">● Connected</div></div>{error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}<div className="product-list">{products.length === 0 ? <div className="empty">No products yet. Add your first item.</div> : products.map(product => <article className="product-row" key={product.id}><div><h3>{product.product_name}</h3><p>{product.description || 'No description'}</p></div><strong>${Number(product.price).toFixed(2)}</strong><span className="quantity">{product.quantity} in stock</span><div className="row-actions"><button title="Edit" onClick={() => { setEditingId(product.id); setForm({ product_name: product.product_name, description: product.description || '', price: product.price, quantity: product.quantity }) }}>✎</button><button title="Delete" onClick={() => removeProduct(product.id)}>×</button></div></article>)}</div></div><form className="editor" onSubmit={submitProduct}><p className="eyebrow">{editingId ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</p><h2>{editingId ? 'Refine the details.' : 'Add to catalog.'}</h2><label>Product name<input required maxLength="100" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="e.g. Studio headphones" /></label><label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short product description" /></label><div className="split"><label>Price<input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" /></label><label>Quantity<input required type="number" min="0" step="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></label></div><button className="primary" type="submit">{editingId ? 'Save changes' : 'Add product'} <span>→</span></button>{editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setForm(emptyProduct) }}>Cancel editing</button>}</form></section></main>
}

export default ProductApp
