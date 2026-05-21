import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChevronDown,
  Grid3X3,
  Heart,
  Loader2,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Truck,
  User,
  X,
} from 'lucide-react';
import './styles.css';

const API_PRODUCTS_URL = '/api/catalog/products?page=1&pageSize=50';
const AUTH_STORAGE_KEY = 'marketHubAuth';

const dealTiles = [
  { title: 'Fresh arrivals', subtitle: 'New picks across the store' },
  { title: 'Weekend travel', subtitle: 'Bags, bottles, and essentials' },
  { title: 'Workday setup', subtitle: 'Desk gear that earns its space' },
  { title: 'Daily wardrobe', subtitle: 'Simple layers and footwear' },
];

const navItems = ['Today Deals', 'Customer Service', 'Registry', 'Gift Cards', 'Sell'];

function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState(null);
  const [cartStatus, setCartStatus] = useState('idle');
  const [cartError, setCartError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [authSession, setAuthSession] = useState(() => readStoredAuthSession());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('store');

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setStatus('loading');
        const response = await fetch(API_PRODUCTS_URL);
        if (!response.ok) {
          throw new Error('Catalog request failed');
        }

        const payload = await response.json();
        if (!cancelled) {
          setProducts(payload.data);
          setSelectedProduct(payload.data[0] ?? null);
          setStatus('ready');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setStatus('error');
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authSession) {
      setCart(null);
      setCartStatus('idle');
      setCartError('');
      return;
    }

    loadCart(authSession.token);
  }, [authSession]);

  const categories = useMemo(() => {
    const uniqueCategories = new Map();
    for (const product of products) {
      uniqueCategories.set(product.category.slug, product.category);
    }

    return [...uniqueCategories.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' || product.category.slug === selectedCategory;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.category.name.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'price-asc') {
        return getMinPrice(a) - getMinPrice(b);
      }

      if (sort === 'price-desc') {
        return getMinPrice(b) - getMinPrice(a);
      }

      return a.name.localeCompare(b.name);
    });
  }, [products, query, selectedCategory, sort]);

  const cartItemsByProduct = useMemo(() => {
    const itemsByProduct = new Map();
    for (const item of cart?.items ?? []) {
      itemsByProduct.set(item.product.id, item);
    }

    return itemsByProduct;
  }, [cart]);
  const cartCount = cart?.summary.itemCount ?? 0;
  const cartSubtotal = cart?.summary.subtotalCents ?? 0;

  async function loadCart(token) {
    try {
      setCartStatus('loading');
      const response = await fetch('/api/cart', {
        headers: { authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to load cart');
      }

      setCart(payload);
      setCartError('');
      setCartStatus('ready');
    } catch (error) {
      setCartError(error.message);
      setCartStatus('error');
    }
  }

  async function addToCart(product) {
    if (!authSession) {
      setAuthModalOpen(true);
      return;
    }

    if (!product.primaryVariant?.id) {
      setCartError('This product is not available for purchase');
      return;
    }

    await submitCartRequest('/api/cart/items', {
      method: 'POST',
      body: {
        variantId: product.primaryVariant.id,
        quantity: 1,
      },
    });
  }

  async function updateCartItemQuantity(item, quantity) {
    if (!authSession) {
      setAuthModalOpen(true);
      return;
    }

    if (quantity < 1) {
      await removeCartItem(item);
      return;
    }

    await submitCartRequest(`/api/cart/items/${item.id}`, {
      method: 'PATCH',
      body: { quantity },
    });
  }

  async function removeCartItem(item) {
    if (!authSession) {
      setAuthModalOpen(true);
      return;
    }

    await submitCartRequest(`/api/cart/items/${item.id}`, {
      method: 'DELETE',
    });
  }

  async function removeFromCart(product) {
    if (!authSession) {
      setAuthModalOpen(true);
      return;
    }

    const item = cartItemsByProduct.get(product.id);
    if (!item) {
      return;
    }

    if (item.quantity <= 1) {
      await submitCartRequest(`/api/cart/items/${item.id}`, {
        method: 'DELETE',
      });
      return;
    }

    await submitCartRequest(`/api/cart/items/${item.id}`, {
      method: 'PATCH',
      body: {
        quantity: item.quantity - 1,
      },
    });
  }

  async function submitCartRequest(url, options) {
    try {
      setCartStatus('saving');
      const response = await fetch(url, {
        method: options.method,
        headers: {
          authorization: `Bearer ${authSession.token}`,
          ...(options.body ? { 'content-type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const payload = await response.json();

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update cart');
      }

      setCart(payload);
      setCartError('');
      setCartStatus('ready');
    } catch (error) {
      setCartError(error.message);
      setCartStatus('error');
    }
  }

  function handleAuthSuccess(session) {
    setAuthSession(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setAuthModalOpen(false);
  }

  function handleSignOut() {
    setAuthSession(null);
    setCart(null);
    setCartStatus('idle');
    setCartError('');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthModalOpen(false);
  }

  function handleSessionExpired() {
    setAuthSession(null);
    setCart(null);
    setCartStatus('idle');
    setCartError('Please sign in again to use your cart.');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthModalOpen(true);
  }

  return (
    <div className="app-shell">
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        query={query}
        onQueryChange={setQuery}
        cartCount={cartCount}
        authSession={authSession}
        onAccountClick={() => setAuthModalOpen(true)}
        onCartClick={() => setActiveView('cart')}
      />
      <Subnav />

      {activeView === 'store' ? (
        <main className="storefront">
          <Hero products={products} />

          <section className="deal-strip" aria-label="Featured store sections">
            {dealTiles.map((tile) => (
              <article className="deal-tile" key={tile.title}>
                <h2>{tile.title}</h2>
                <p>{tile.subtitle}</p>
              </article>
            ))}
          </section>

          <div className="commerce-layout">
            <aside className="filters" aria-label="Product filters">
              <div className="filter-block">
                <h2>Departments</h2>
                <button
                  className={selectedCategory === 'all' ? 'filter-option active' : 'filter-option'}
                  onClick={() => setSelectedCategory('all')}
                  type="button"
                >
                  All departments
                </button>
                {categories.map((category) => (
                  <button
                    className={
                      selectedCategory === category.slug ? 'filter-option active' : 'filter-option'
                    }
                    key={category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="filter-block">
                <h2>Delivery</h2>
                <label className="check-row">
                  <input type="checkbox" defaultChecked />
                  <span>Prime-style fast delivery</span>
                </label>
                <label className="check-row">
                  <input type="checkbox" />
                  <span>In stock only</span>
                </label>
              </div>

              <div className="filter-block subtotal-panel">
                <h2>Cart Summary</h2>
                <p>{cartCount} items</p>
                <strong>{formatMoney(cartSubtotal)}</strong>
                {cartStatus === 'saving' && <span>Updating cart...</span>}
                {cartError && <div className="cart-error">{cartError}</div>}
                <button className="view-cart-button" onClick={() => setActiveView('cart')} type="button">
                  View Cart
                </button>
              </div>
            </aside>

            <section className="results-area">
              <div className="results-toolbar">
                <div>
                  <h1>Results</h1>
                  <p>{filteredProducts.length} products</p>
                </div>
                <label className="sort-control">
                  <span>Sort by</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </label>
              </div>

              {status === 'loading' && <LoadingState />}
              {status === 'error' && <ErrorState message={error} />}
              {status === 'ready' && (
                <ProductGrid
                  products={filteredProducts}
                  cartItemsByProduct={cartItemsByProduct}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onSelect={setSelectedProduct}
                />
              )}
            </section>

            <ProductPanel
              product={selectedProduct}
              quantity={selectedProduct ? cartItemsByProduct.get(selectedProduct.id)?.quantity ?? 0 : 0}
              onAdd={addToCart}
              onRemove={removeFromCart}
            />
          </div>
        </main>
      ) : (
        <CartPage
          cart={cart}
          cartStatus={cartStatus}
          cartError={cartError}
          authSession={authSession}
          onBackToStore={() => setActiveView('store')}
          onSignIn={() => setAuthModalOpen(true)}
          onQuantityChange={updateCartItemQuantity}
          onRemove={removeCartItem}
        />
      )}

      {authModalOpen && (
        <AuthModal
          authSession={authSession}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}

function Header({
  categories,
  selectedCategory,
  onCategoryChange,
  query,
  onQueryChange,
  cartCount,
  authSession,
  onAccountClick,
  onCartClick,
}) {
  return (
    <header className="site-header">
      <div className="topbar">
        <button className="icon-button menu-button" aria-label="Open menu" type="button">
          <Menu size={24} />
        </button>

        <a className="brand" href="/">
          MarketHub
        </a>

        <button className="deliver-button" type="button">
          <MapPin size={18} />
          <span>
            <small>Deliver to</small>
            Tunis
          </span>
        </button>

        <form className="search-shell" onSubmit={(event) => event.preventDefault()}>
          <label className="category-select">
            <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)}>
              <option value="all">All</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </label>
          <input
            aria-label="Search products"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search MarketHub"
          />
          <button aria-label="Search" className="search-button" type="submit">
            <Search size={22} />
          </button>
        </form>

        <button className="account-button" onClick={onAccountClick} type="button">
          <User size={19} />
          <span>
            <small>{authSession ? 'Hello,' : 'Hello, sign in'}</small>
            {authSession ? getAccountLabel(authSession.user.email) : 'Account'}
          </span>
        </button>

        <button className="cart-button" onClick={onCartClick} type="button">
          <ShoppingCart size={28} />
          <strong>{cartCount}</strong>
          <span>Cart</span>
        </button>
      </div>
    </header>
  );
}

function AuthModal({ authSession, onClose, onAuthSuccess, onSignOut }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (mode === 'register' && password !== confirmPassword) {
      setFormError('Passwords must match');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Authentication failed');
      }

      onAuthSuccess(payload);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setFormError('');
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-header">
          <div>
            <p>MarketHub account</p>
            <h2 id="auth-title">{authSession ? 'Account' : mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          </div>
          <button className="close-button" onClick={onClose} type="button" aria-label="Close account dialog">
            <X size={20} />
          </button>
        </div>

        {authSession ? (
          <div className="signed-in-panel">
            <User size={36} />
            <h3>{authSession.user.email}</h3>
            <p>You are signed in as a {authSession.user.role}.</p>
            <button className="primary-auth-button" onClick={onSignOut} type="button">
              Sign out
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                className={mode === 'login' ? 'active' : ''}
                onClick={() => switchMode('login')}
                type="button"
              >
                Sign in
              </button>
              <button
                className={mode === 'register' ? 'active' : ''}
                onClick={() => switchMode('register')}
                type="button"
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
                  required
                />
              </label>

              {mode === 'register' && (
                <label>
                  Confirm password
                  <input
                    autoComplete="new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                </label>
              )}

              {formError && <div className="auth-error">{formError}</div>}

              <button className="primary-auth-button" disabled={submitting} type="submit">
                {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="auth-note">
              Registration uses the backend auth module. Passwords are never stored in the browser.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function Subnav() {
  return (
    <nav className="subnav" aria-label="Store navigation">
      <button type="button">
        <Grid3X3 size={18} />
        All
      </button>
      {navItems.map((item) => (
        <a href="/" key={item} onClick={(event) => event.preventDefault()}>
          {item}
        </a>
      ))}
    </nav>
  );
}

function Hero({ products }) {
  const heroProduct = products.find((product) => product.slug === 'compact-travel-backpack') ?? products[0];

  return (
    <section className="hero">
      <div className="hero-copy">
        <p>Seasonal picks</p>
        <h1>Built for everyday shopping</h1>
        <span>Browse practical products with real catalog data from your API.</span>
      </div>
      {heroProduct && (
        <img
          src={heroProduct.image?.url}
          alt={heroProduct.image?.altText ?? heroProduct.name}
        />
      )}
    </section>
  );
}

function ProductGrid({ products, cartItemsByProduct, onAdd, onRemove, onSelect }) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <h2>No products found</h2>
        <p>Try another department or search term.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={cartItemsByProduct.get(product.id)?.quantity ?? 0}
          onAdd={onAdd}
          onRemove={onRemove}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function CartPage({
  cart,
  cartStatus,
  cartError,
  authSession,
  onBackToStore,
  onSignIn,
  onQuantityChange,
  onRemove,
}) {
  const items = cart?.items ?? [];

  return (
    <main className="cart-page">
      <section className="cart-main">
        <div className="cart-page-header">
          <div>
            <h1>Shopping Cart</h1>
            <p>{authSession ? `${cart?.summary.itemCount ?? 0} items` : 'Sign in to manage your cart'}</p>
          </div>
          <button className="secondary-action" onClick={onBackToStore} type="button">
            Continue shopping
          </button>
        </div>

        {cartStatus === 'loading' && <LoadingState />}
        {cartError && <div className="cart-page-error">{cartError}</div>}

        {!authSession && (
          <div className="empty-cart-panel">
            <ShoppingCart size={42} />
            <h2>Your cart is waiting</h2>
            <p>Sign in or create an account to save items and continue shopping.</p>
            <button className="add-button wide" onClick={onSignIn} type="button">
              Sign in
            </button>
          </div>
        )}

        {authSession && items.length === 0 && cartStatus !== 'loading' && (
          <div className="empty-cart-panel">
            <ShoppingCart size={42} />
            <h2>Your cart is empty</h2>
            <p>Add products from the storefront to start building your order.</p>
            <button className="add-button wide" onClick={onBackToStore} type="button">
              Shop products
            </button>
          </div>
        )}

        {authSession && items.length > 0 && (
          <div className="cart-item-list">
            {items.map((item) => (
              <article className="cart-line-item" key={item.id}>
                <img
                  src={item.product.image?.url}
                  alt={item.product.image?.altText ?? item.product.name}
                />
                <div className="cart-line-body">
                  <h2>{item.product.name}</h2>
                  <p>{item.variant.name}</p>
                  <span className="stock in-stock">In stock</span>
                  <div className="cart-line-actions">
                    <div className="quantity-stepper cart-stepper">
                      <button
                        onClick={() => onQuantityChange(item, item.quantity - 1)}
                        type="button"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => onQuantityChange(item, item.quantity + 1)}
                        type="button"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button className="text-action" onClick={() => onRemove(item)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
                <strong>{formatMoney(item.lineTotalCents)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="cart-summary-card">
        <h2>Order Summary</h2>
        <div className="summary-row">
          <span>Items</span>
          <strong>{cart?.summary.itemCount ?? 0}</strong>
        </div>
        <div className="summary-row">
          <span>Subtotal</span>
          <strong>{formatMoney(cart?.summary.subtotalCents ?? 0)}</strong>
        </div>
        <div className="summary-note">
          Taxes, shipping, and payment will be calculated during checkout.
        </div>
        <button className="add-button wide" disabled={!authSession || items.length === 0} type="button">
          Proceed to Checkout
        </button>
      </aside>
    </main>
  );
}

function ProductCard({ product, quantity, onAdd, onRemove, onSelect }) {
  return (
    <article className="product-card">
      <button className="image-button" onClick={() => onSelect(product)} type="button">
        <img src={product.image?.url} alt={product.image?.altText ?? product.name} />
      </button>

      <div className="product-body">
        <button className="product-title" onClick={() => onSelect(product)} type="button">
          {product.name}
        </button>
        <p>{product.description}</p>
        <Rating />
        <div className="price-row">
          <strong>{formatMoney(getMinPrice(product))}</strong>
          {product.priceRange?.minPriceCents !== product.priceRange?.maxPriceCents && (
            <span>to {formatMoney(product.priceRange.maxPriceCents)}</span>
          )}
        </div>
        <div className="shipping-line">
          <Truck size={16} />
          Fast delivery available
        </div>
        <div className={product.available ? 'stock in-stock' : 'stock out-stock'}>
          {product.available ? 'In stock' : 'Out of stock'}
        </div>
      </div>

      <div className="card-actions">
        {quantity > 0 ? (
          <div className="quantity-stepper" aria-label={`${product.name} quantity`}>
            <button onClick={() => onRemove(product)} type="button" aria-label="Decrease quantity">
              <Minus size={16} />
            </button>
            <span>{quantity}</span>
            <button onClick={() => onAdd(product)} type="button" aria-label="Increase quantity">
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <button className="add-button" onClick={() => onAdd(product)} type="button">
            Add to Cart
          </button>
        )}
        <button className="wish-button" type="button" aria-label="Add to wishlist">
          <Heart size={18} />
        </button>
      </div>
    </article>
  );
}

function ProductPanel({ product, quantity, onAdd, onRemove }) {
  if (!product) {
    return (
      <aside className="product-panel">
        <PackageCheck size={28} />
        <h2>Select a product</h2>
      </aside>
    );
  }

  return (
    <aside className="product-panel">
      <img src={product.image?.url} alt={product.image?.altText ?? product.name} />
      <p className="panel-category">{product.category.name}</p>
      <h2>{product.name}</h2>
      <Rating />
      <strong className="panel-price">{formatMoney(getMinPrice(product))}</strong>
      <p>{product.description}</p>
      <div className="panel-delivery">
        <Truck size={18} />
        Arrives in 2-4 business days
      </div>
      {quantity > 0 ? (
        <div className="quantity-stepper wide">
          <button onClick={() => onRemove(product)} type="button" aria-label="Decrease quantity">
            <Minus size={16} />
          </button>
          <span>{quantity}</span>
          <button onClick={() => onAdd(product)} type="button" aria-label="Increase quantity">
            <Plus size={16} />
          </button>
        </div>
      ) : (
        <button className="add-button wide" onClick={() => onAdd(product)} type="button">
          Add to Cart
        </button>
      )}
    </aside>
  );
}

function Rating() {
  return (
    <div className="rating" aria-label="Rated 4.6 out of 5">
      {[0, 1, 2, 3, 4].map((item) => (
        <Star key={item} size={15} fill="currentColor" />
      ))}
      <span>4.6</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-panel">
      <Loader2 className="spin" size={28} />
      <p>Loading products</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="state-panel">
      <h2>Catalog unavailable</h2>
      <p>{message}</p>
    </div>
  );
}

function getMinPrice(product) {
  return product.priceRange?.minPriceCents ?? 0;
}

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function readStoredAuthSession() {
  try {
    const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  } catch {
    return null;
  }
}

function getAccountLabel(email) {
  const [name] = email.split('@');
  return name || 'Account';
}

createRoot(document.getElementById('root')).render(<App />);
