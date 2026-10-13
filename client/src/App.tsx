import { Component, useEffect, useState, type ErrorInfo, type FormEvent, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Check, ChevronDown, CircleHelp, Leaf, Menu, Minus, PackageCheck, Plus, RefreshCw, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { getApiBaseUrl, money, request, setApiBaseUrl, testApiHealth, type Category, type Order, type Product, type Variant } from "./lib/api";
import { useAuth } from "./lib/AuthContext";
import { useStore } from "./lib/StoreContext";

class ErrorBoundary extends Component<{ children: ReactNode; onOpenApiModal?: () => void }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; onOpenApiModal?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <main className="page-shell">
          <div className="error-panel" style={{ maxWidth: 640, margin: "40px auto", padding: 24, textAlign: "center" }}>
            <h2 style={{ marginBottom: 12 }}>Connection or Rendering Issue</h2>
            <p style={{ marginBottom: 16 }}>
              {this.state.error?.message || "Something went wrong while displaying this page."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="button button-primary" onClick={() => window.location.reload()}>
                <RefreshCw size={15} /> Reload page
              </button>
              {this.props.onOpenApiModal && (
                <button className="button button-outline" onClick={this.props.onOpenApiModal}>
                  <Settings size={15} /> Configure Backend API URL
                </button>
              )}
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

const fallbackImage = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85";

function categoryName(category: Product["category"]) {
  return typeof category === "string" ? category : category?.name || "Homemade";
}

function priceFor(variant: Variant) {
  return variant.salePrice ?? variant.price;
}

function Header({ onOpenApiModal }: { onOpenApiModal: () => void }) {
  const { count } = useStore();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const activeUrl = getApiBaseUrl();
  const isCustom = activeUrl !== "/api";
  const navigate = useNavigate();
  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(searchText)}`);
    setMenuOpen(false);
  };
  return (
    <>
      <div className="announcement">
        <Sparkles size={14} /> Small-batch goodness, made fresh in our family kitchen <span>•</span> Free delivery over ₹999
        <button
          type="button"
          className={`announcement-api-btn ${isCustom ? "is-custom" : ""}`}
          onClick={onOpenApiModal}
          title="Configure custom backend API URL"
        >
          <Settings size={11} />
         {/* <span>API: {activeUrl}</span> */}
        </button>
      </div>
      <header className="site-header">
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
        <Link className="brand" to="/" aria-label="Spice and Masala home">
          <span className="brand-mark">s<span>m</span></span>
          <span className="brand-copy"><strong>spice &amp; masala</strong><small>HOMEMADE WITH HEART</small></span>
        </Link>
        <nav className={menuOpen ? "main-nav open" : "main-nav"}>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop all</Link>
          <a href="/#our-story" onClick={() => setMenuOpen(false)}>Our story</a>
          <a href="/#promise" onClick={() => setMenuOpen(false)}>Our promise</a>
          <Link to="/orders" onClick={() => setMenuOpen(false)}>Track order</Link>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className={`api-testing-pill header-api-pill ${isCustom ? "is-custom" : ""}`}
            onClick={onOpenApiModal}
            title="Configure custom backend API URL for testing"
          >
            <Settings size={12} />
            <span>API URL</span>
            {isCustom && <small>(custom)</small>}
          </button>
          <form className={searchOpen ? "search-form mobile-search-open" : "search-form"} onSubmit={onSearch}>
            <Search size={17} />
            <input aria-label="Search products" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Find your favourite..." />
          </form>
          <button className="search-toggle" onClick={() => setSearchOpen(!searchOpen)} aria-label="Toggle product search"><Search size={17} /></button>
          {user ? <div className="account-menu"><Link to={user.role === "admin" ? "/admin" : "/orders"} className="account-link">{user.name.split(" ")[0]}</Link><button className="text-button" onClick={signOut}>Sign out</button></div> : <Link className="account-link" to="/login">Sign in</Link>}
          <Link className="cart-link" to="/cart" aria-label={`Cart with ${count} items`}><ShoppingBag size={20} /><span>Bag</span>{count > 0 && <b>{count}</b>}</Link>
        </div>
      </header>
    </>
  );
}

function ApiConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [urlInput, setUrlInput] = useState(() => {
    const current = getApiBaseUrl();
    return current === "/api" ? "" : current;
  });
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  if (!open) return null;

  async function handleTest() {
    setTesting(true);
    setStatus(null);
    try {
      const res = await testApiHealth(urlInput.trim() || undefined);
      setStatus(res);
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setApiBaseUrl(urlInput.trim() || null);
    onClose();
    window.location.reload();
  }

  function handleReset() {
    setApiBaseUrl(null);
    setUrlInput("");
    setStatus(null);
    onClose();
    window.location.reload();
  }

  return (
    <div className="api-modal-backdrop" onClick={onClose}>
      <div className="api-modal" onClick={(e) => e.stopPropagation()}>
        <div className="api-modal-header">
          <div>
            <h3>Testing: Custom API URL</h3>
            <p>Point this storefront to your local, staging or hosted backend</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
        </div>
        <div className="api-modal-body">
          <label>
            Backend API Base URL
            <input
              type="text"
              placeholder="e.g. http://localhost:4000 or https://your-backend.com"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setStatus(null); }}
            />
          </label>
          <small className="api-modal-hint">
            Active: <code>{getApiBaseUrl()}</code> · Leave blank to default to <code>/api</code>.
          </small>
          {status && (
            <div className={`api-status-banner ${status.ok ? "status-success" : "status-error"}`}>
              {status.ok ? <Check size={16} /> : <X size={16} />}
              <span>{status.message}</span>
            </div>
          )}
          <div className="api-modal-tip">
            <strong>Testing tip:</strong> You can also append <code>?apiUrl=YOUR_URL</code> to any page URL.
          </div>
        </div>
        <div className="api-modal-footer">
          <button type="button" className="button button-outline" onClick={handleTest} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button type="button" className="text-button text-button-reset" onClick={handleReset}>
            Reset to /api
          </button>
          <button type="button" className="button button-primary" onClick={handleSave}>
            Save &amp; Reload
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer({ onOpenApiModal }: { onOpenApiModal: () => void }) {
  const activeUrl = getApiBaseUrl();
  const isCustom = activeUrl !== "/api";

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div><Link className="brand footer-brand" to="/"><span className="brand-mark">s<span>m</span></span><span className="brand-copy"><strong>spice &amp; masala</strong><small>HOMEMADE WITH HEART</small></span></Link><p>A little warmth from our kitchen to yours. Made in small batches, with ingredients you can pronounce.</p></div>
        <div><h4>Explore</h4><Link to="/shop">Shop all</Link><Link to="/orders">My orders</Link><a href="/#our-story">Our story</a></div>
        <div><h4>Here to help</h4><a href="mailto:hello@spiceandmasala.in">Contact us</a><Link to="/policies#shipping">Shipping &amp; returns</Link><Link to="/policies#privacy">Privacy &amp; food notes</Link></div>
        <div className="footer-note"><Leaf size={22} /><h4>Real food. Real care.</h4><p>Thoughtfully sourced spices. Prepared fresh. Packed with care.</p></div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 Spice &amp; Masala Homemade</span>
        <button
          type="button"
          className={`api-testing-pill ${isCustom ? "is-custom" : ""}`}
          onClick={onOpenApiModal}
          title="Configure custom API URL for testing"
        >
          <Settings size={12} />
          <span>API: {activeUrl}</span>
          {isCustom && <small>(custom)</small>}
        </button>
        <span>Made with warmth in India <span className="footer-heart">♥</span></span>
      </div>
    </footer>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const firstVariant = product.variants[0];
  return <article className="product-card">
    <Link to={`/product/${product.slug}`} className="product-image-wrap">
      <img src={product.images?.[0] || fallbackImage} alt={product.name} loading="lazy" />
      {product.featured && <span className="product-ribbon">Bestseller</span>}
      {firstVariant && firstVariant.stock === 0 && <span className="sold-out">Sold out</span>}
    </Link>
    <div className="product-info">
      <div className="product-category">{categoryName(product.category)}</div>
      <Link to={`/product/${product.slug}`} className="product-title">{product.name}</Link>
      <div className="product-card-bottom">
        <div><strong>{firstVariant ? money(priceFor(firstVariant)) : "—"}</strong><span> / {firstVariant?.label || "pack"}</span></div>
        <button className="quick-add" onClick={() => firstVariant && addToCart(product, firstVariant._id)} disabled={!firstVariant || firstVariant.stock < 1} aria-label={`Add ${product.name} to bag`}><Plus size={17} /></button>
      </div>
    </div>
  </article>;
}

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      request<{ products: Product[] }>("/products?featured=true&limit=4"),
      request<{ categories: Category[] }>("/categories"),
    ]).then(([productResult, categoryResult]) => {
      setProducts(productResult?.products || []);
      setCategories(categoryResult?.categories || []);
    }).catch((reason: Error) => {
      setProducts([]);
      setCategories([]);
      setError(reason.message);
    });
  }, []);
  return <>
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span></span> From our home to yours</div>
          <h1>A pinch of home.<br /><em>A whole lot of heart.</em></h1>
          <p>Small-batch masalas and traditional treats, made the way our family has always loved them.</p>
          <div className="hero-actions"><Link className="button button-primary" to="/shop">Explore the kitchen <ArrowRight size={18} /></Link><a className="story-link" href="#our-story">Our little story <span>↗</span></a></div>
          <div className="hero-trust"><span><Check size={14} /> No preservatives</span><span><Check size={14} /> Made fresh</span><span><Check size={14} /> Family recipes</span></div>
        </div>
        <div className="hero-art">
          <div className="hero-photo"><img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1300&q=90" alt="Colourful whole spices and homemade masala" /></div>
          <div className="hero-stamp"><span>made with</span><strong>♡</strong><span>love, always</span></div>
          <div className="hero-note"><span>✳</span><div><strong>Little batches,</strong><br />lots of love</div></div>
        </div>
      </section>
      <section className="promise-strip" id="promise">
        <div><span className="promise-icon"><Leaf size={20} /></span><span><strong>Honest ingredients</strong><small>Nothing you can't pronounce</small></span></div>
        <div><span className="promise-icon"><Sparkles size={20} /></span><span><strong>Freshly made</strong><small>Small batches, every time</small></span></div>
        <div><span className="promise-icon"><PackageCheck size={20} /></span><span><strong>Packed with care</strong><small>From our home to yours</small></span></div>
        <div><span className="promise-icon"><BadgeCheck size={20} /></span><span><strong>Recipes with roots</strong><small>Passed down with love</small></span></div>
      </section>
      <section className="section category-section">
        <div className="section-heading"><div><div className="eyebrow">A little something for every meal</div><h2>Good things from<br /><em>our kitchen</em></h2></div><Link className="underlined-link" to="/shop">See everything <ArrowRight size={16} /></Link></div>
        <div className="category-grid">
          {categories.slice(0, 4).map((category, index) => <Link key={category._id} to={`/shop?category=${category.slug}`} className={`category-tile category-tone-${index}`}>
            <span className="category-number">0{index + 1}</span><div><span className="tile-flower">{["✳", "❋", "✿", "❁"][index]}</span><h3>{category.name}</h3><span className="tile-link">Shop category <ArrowRight size={15} /></span></div>
          </Link>)}
        </div>
      </section>
      <section className="section featured-section">
        <div className="section-heading"><div><div className="eyebrow">A few favourites</div><h2>Loved at home,<br /><em>now loved by you</em></h2></div><Link className="underlined-link" to="/shop">Shop all favourites <ArrowRight size={16} /></Link></div>
        {error ? <div className="inline-error">{error}</div> : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> : <div className="loading-line">Warming up the kitchen…</div>}
      </section>
      <section className="story-section" id="our-story">
        <div className="story-image"><img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1100&q=85" alt="Fresh ingredients used in our family recipes" /><span>Our kitchen, always open</span></div>
        <div className="story-copy"><div className="eyebrow">A kitchen with a story</div><h2>Some recipes are<br />made to be <em>shared.</em></h2><p>Ours began with a well-loved spice tin, handwritten recipes, and the belief that the best food tastes like someone made it just for you.</p><p>Today, every little batch still gets that same attention. No shortcuts. Just good ingredients, familiar hands, and a whole lot of heart.</p><Link className="underlined-link" to="/shop">Come on in <ArrowRight size={16} /></Link></div>
      </section>
      <section className="closing-banner"><span className="banner-flower">✳</span><h2>Bring a little more <em>home</em> to the table.</h2><p>Your next family favourite is just a jar away.</p><Link className="button button-cream" to="/shop">Shop the collection <ArrowRight size={17} /></Link></section>
    </main>
  </>;
}

function ShopPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("popular");
  const search = params.get("q") || "";
  const category = params.get("category") || "";
  useEffect(() => {
    setBusy(true);
    Promise.all([
      request<{ products: Product[] }>(`/products?limit=48&sort=${sort}${search ? `&q=${encodeURIComponent(search)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`),
      request<{ categories: Category[] }>("/categories"),
    ]).then(([productResult, categoryResult]) => {
      setProducts(productResult?.products || []);
      setCategories(categoryResult?.categories || []);
      setError("");
    }).catch((reason: Error) => {
      setProducts([]);
      setCategories([]);
      setError(reason.message);
    }).finally(() => setBusy(false));
  }, [search, category, sort]);
  const activeCategory = (categories || []).find((item) => item.slug === category);
  return <main className="page-shell shop-page">
    <div className="page-kicker"><Link to="/">Home</Link><span>/</span> Shop</div>
    <div className="shop-heading"><div><div className="eyebrow">Made with love, ready to share</div><h1>{activeCategory?.name || (search ? `Searching “${search}”` : "Shop the kitchen")}</h1><p>Homemade favourites, prepared in little batches just for your table.</p></div><label className="sort-select">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Our favourites</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={15} /></label></div>
    <div className="category-chips"><Link className={!category ? "active" : ""} to="/shop">All goodies</Link>{categories.map((item) => <Link className={category === item.slug ? "active" : ""} to={`/shop?category=${item.slug}`} key={item._id}>{item.name}</Link>)}</div>
    {error ? <div className="error-panel">{error}</div> : busy ? <div className="loading-line">Bringing the good things out…</div> : products.length ? <div className="product-grid shop-products">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> : <div className="empty-state"><span>♡</span><h2>Nothing in this little corner yet</h2><p>Try another category or come back soon for more homemade goodness.</p><Link className="button button-primary" to="/shop">See all goodies</Link></div>}
  </main>;
}

function ProductPage() {
  const { slug = "" } = useParams();
  const { addToCart } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setProduct(null);
    request<{ product: Product }>(`/products/${encodeURIComponent(slug)}`)
      .then(({ product: result }) => { setProduct(result); setSelected(result.variants[0]?._id || ""); })
      .catch((reason: Error) => setError(reason.message));
  }, [slug]);
  if (error) return <main className="page-shell"><div className="error-panel">{error} <Link to="/shop">Back to shop</Link></div></main>;
  if (!product) return <main className="page-shell"><div className="loading-line">A moment, please…</div></main>;
  const variant = product.variants.find((item) => item._id === selected) || product.variants[0];
  return <main className="page-shell product-page">
    <div className="page-kicker"><Link to="/">Home</Link><span>/</span><Link to="/shop">Shop</Link><span>/</span>{product.name}</div>
    <div className="product-detail">
      <div className="detail-image"><img src={product.images[0] || fallbackImage} alt={product.name} /><span className="image-caption"><Leaf size={14} /> Small batch · made with care</span></div>
      <div className="detail-copy">
        <div className="eyebrow">{categoryName(product.category)}</div><h1>{product.name}</h1>
        <p className="detail-description">{product.description}</p>
        <div className="detail-price">{variant ? money(priceFor(variant)) : "—"}{variant?.salePrice != null && <del>{money(variant.price)}</del>}</div>
        <div className="field-label">Choose your pack</div><div className="variant-options">{product.variants.map((item) => <button key={item._id} className={item._id === selected ? "variant-option selected" : "variant-option"} onClick={() => setSelected(item._id)} disabled={item.stock === 0}><span>{item.label}</span><small>{money(priceFor(item))}</small></button>)}</div>
        {variant?.stock === 0 ? <p className="stock-note stock-out">Currently out of stock</p> : <p className="stock-note"><span></span>{variant && variant.stock <= 5 ? `Only ${variant.stock} left — made in small batches` : "Freshly made and ready for your kitchen"}</p>}
        <button className="button button-primary add-cart-button" disabled={!variant || variant.stock < 1} onClick={() => addToCart(product, selected)}><ShoppingBag size={17} /> Add to your bag</button>
        <div className="detail-benefits"><span><ShieldCheck size={16} /> Carefully packed</span><span><Truck size={16} /> Free delivery over ₹999</span></div>
        <div className="product-facts">
          <details open><summary>Ingredients &amp; allergens <ChevronDown size={15} /></summary><p>{product.ingredients?.join(", ") || "Prepared with care."}{product.allergens?.length ? ` · May contain: ${product.allergens.join(", ")}` : " · No known allergens listed."}</p></details>
          <details><summary>Storage &amp; freshness <ChevronDown size={15} /></summary><p>{product.shelfLife ? `Best enjoyed within ${product.shelfLife}. ` : ""}{product.storage || "Store in a cool, dry place."}</p></details>
        </div>
      </div>
    </div>
  </main>;
}

function CartPage() {
  const { cart, setQuantity, removeFromCart } = useStore();
  const subtotal = cart.reduce((total, line) => {
    const variant = line.product.variants.find((item) => item._id === line.variantId);
    return total + (variant ? priceFor(variant) * line.quantity : 0);
  }, 0);
  const delivery = subtotal >= 999 || subtotal === 0 ? 0 : 60;
  return <main className="page-shell cart-page">
    <div className="page-kicker"><Link to="/">Home</Link><span>/</span> Your bag</div><div className="cart-heading"><div><div className="eyebrow">A lovely choice</div><h1>Your little bag <em>of goodness</em></h1></div><span>{cart.length} {cart.length === 1 ? "kind" : "kinds"} of lovely</span></div>
    {!cart.length ? <div className="empty-state"><span>♡</span><h2>Your bag is waiting for something lovely</h2><p>Fill it with a family favourite or two.</p><Link className="button button-primary" to="/shop">Find your favourites <ArrowRight size={17} /></Link></div> :
      <div className="cart-layout"><div className="cart-lines">{cart.map((line) => {
        const variant = line.product.variants.find((item) => item._id === line.variantId);
        return <article className="cart-line" key={`${line.product._id}-${line.variantId}`}>
          <Link to={`/product/${line.product.slug}`} className="cart-image"><img src={line.product.images[0] || fallbackImage} alt={line.product.name} /></Link>
          <div className="cart-line-info"><Link to={`/product/${line.product.slug}`}><strong>{line.product.name}</strong></Link><span>{variant?.label}</span><button className="remove-button" onClick={() => removeFromCart(line.product._id, line.variantId)}>Remove</button></div>
          <div className="quantity-control"><button onClick={() => setQuantity(line.product._id, line.variantId, line.quantity - 1)} aria-label="Decrease quantity"><Minus size={14} /></button><span>{line.quantity}</span><button onClick={() => setQuantity(line.product._id, line.variantId, line.quantity + 1)} aria-label="Increase quantity"><Plus size={14} /></button></div>
          <strong className="cart-line-price">{variant ? money(priceFor(variant) * line.quantity) : "—"}</strong>
        </article>;
      })}</div>
        <aside className="order-summary"><h2>A little summary</h2><div className="summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{delivery ? money(delivery) : "On us"}</strong></div>{subtotal > 0 && subtotal < 999 && <div className="delivery-hint">Add {money(999 - subtotal)} for complimentary delivery</div>}<div className="summary-row summary-total"><span>Total</span><strong>{money(subtotal + delivery)}</strong></div><Link className="button button-primary full-button" to="/checkout">Continue to checkout <ArrowRight size={17} /></Link><div className="secure-note"><ShieldCheck size={15} /> Secure checkout · Cash on delivery</div><Link className="continue-shopping" to="/shop">← Keep looking around</Link></aside>
      </div>}
  </main>;
}

function LoginPage() {
  const { user, signIn, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : (location.state as { from?: string } | null)?.from || "/orders"} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const account = isRegister ? await register(name, email, phone, password) : await signIn(email, password);
      navigate(account.role === "admin" ? "/admin" : (location.state as { from?: string } | null)?.from || "/orders", { replace: true });
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <main className="auth-page">
    <div className="auth-art"><div className="auth-art-content"><span>✳</span><h2>There’s always<br />room at our table.</h2><p>Come in, get comfy, and make yourself at home.</p></div><img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85" alt="" /></div>
    <section className="auth-card"><div className="eyebrow">{isRegister ? "A seat at the table" : "Welcome back"}</div><h1>{isRegister ? "Let’s get to know you." : "Come on in."}</h1><p>{isRegister ? "Create an account to keep your orders and favourite packs close." : "Sign in to check on your orders and find something delicious."}</p>
      <form onSubmit={submit} className="stack-form">
        {isRegister && <><label>Your name<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label><label>Phone number<input required value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label></>}
        <label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} /></label>
        {error && <div className="inline-error">{error}</div>}
        <button className="button button-primary full-button" disabled={busy}>{busy ? "One moment…" : isRegister ? "Create my account" : "Sign in"} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">{isRegister ? "Already have an account?" : "New to our kitchen?"} <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>{isRegister ? "Sign in" : "Create an account"}</button></p>
      {!isRegister && <Link className="admin-signin-link" to="/admin">Administrator sign in</Link>}
    </section>
  </main>;
}

function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearCart } = useStore();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: user?.name || "", phone: user?.phone || "", street: "", city: "", state: "", postalCode: "", instructions: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const subtotal = cart.reduce((total, line) => {
    const variant = line.product.variants.find((item) => item._id === line.variantId);
    return total + (variant ? priceFor(variant) * line.quantity : 0);
  }, 0);
  const delivery = subtotal >= 999 || subtotal === 0 ? 0 : 60;
  const update = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value });
  async function placeOrder(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await request<{ order: Order }>("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": checkoutKey },
        body: JSON.stringify({
          items: cart.map((line) => ({ productId: line.product._id, variantId: line.variantId, quantity: line.quantity })),
          address: values,
        }),
      });
      clearCart();
      setCheckoutKey(crypto.randomUUID());
      navigate("/order-confirmation", { state: { order: result.order } });
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  if (!cart.length) return <main className="page-shell"><div className="empty-state"><span>♡</span><h2>Your bag is empty</h2><Link className="button button-primary" to="/shop">Browse the kitchen</Link></div></main>;
  if (!user) return <main className="page-shell"><div className="checkout-login"><h1>Almost home.</h1><p>Please sign in or create an account to place your order and keep it safe.</p><Link className="button button-primary" to="/login" state={{ from: "/checkout" }}>Sign in to continue <ArrowRight size={17} /></Link></div></main>;
  return <main className="page-shell checkout-page"><div className="page-kicker"><Link to="/">Home</Link><span>/</span><Link to="/cart">Your bag</Link><span>/</span> Checkout</div><div className="checkout-heading"><div className="eyebrow">Nearly yours</div><h1>Let’s get it <em>to your door.</em></h1><p>We currently offer cash on delivery. We’ll confirm your order with care.</p></div>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={placeOrder}>
      <section className="checkout-panel"><div className="panel-title"><span>01</span><div><h2>Where should we send it?</h2><p>Your delivery details</p></div></div><div className="form-grid">
        <label className="span-two">Full name<input required value={values.fullName} onChange={update("fullName")} autoComplete="name" /></label>
        <label>Phone number<input required value={values.phone} onChange={update("phone")} autoComplete="tel" /></label>
        <label>Email address<input value={user.email} disabled /></label>
        <label className="span-two">Street address<textarea required value={values.street} onChange={update("street")} rows={2} autoComplete="street-address" /></label>
        <label>City<input required value={values.city} onChange={update("city")} autoComplete="address-level2" /></label>
        <label>State<input required value={values.state} onChange={update("state")} autoComplete="address-level1" /></label>
        <label>PIN code<input required minLength={4} value={values.postalCode} onChange={update("postalCode")} autoComplete="postal-code" /></label>
        <label className="span-two">Delivery notes <span className="optional-note">Optional</span><textarea value={values.instructions} onChange={update("instructions")} rows={2} placeholder="Anything that helps us find you?" /></label>
      </div></section>
      <section className="checkout-panel"><div className="panel-title"><span>02</span><div><h2>How would you like to pay?</h2><p>Simple, safe, and at your doorstep</p></div></div><label className="payment-choice"><span className="radio-dot"></span><span><strong>Cash on delivery</strong><small>Pay in cash when your homemade goodies arrive.</small></span><span className="payment-tag">Available</span></label></section>
      {error && <div className="inline-error">{error}</div>}
      <button className="button button-primary full-button place-order-button" disabled={busy}>{busy ? "Placing your order…" : "Place my order"} <ArrowRight size={17} /></button>
      <p className="checkout-disclaimer"><ShieldCheck size={14} /> By placing your order, you agree to our shipping and cancellation policies.</p>
    </form><aside className="order-summary checkout-summary"><h2>Your bag, one last look</h2>{cart.map((line) => {
      const variant = line.product.variants.find((item) => item._id === line.variantId);
      return <div className="checkout-item" key={`${line.product._id}-${line.variantId}`}><img src={line.product.images[0] || fallbackImage} alt="" /><span><strong>{line.product.name}</strong><small>{variant?.label} · Qty {line.quantity}</small></span><b>{variant ? money(priceFor(variant) * line.quantity) : ""}</b></div>;
    })}<div className="summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{delivery ? money(delivery) : "On us"}</strong></div><div className="summary-row summary-total"><span>Total</span><strong>{money(subtotal + delivery)}</strong></div></aside></div>
  </main>;
}

function OrderConfirmationPage() {
  const location = useLocation();
  const order = (location.state as { order?: Order } | null)?.order;
  if (!order) return <Navigate to="/orders" replace />;
  return <main className="confirmation-page"><div className="confirmation-icon"><Check size={32} /></div><div className="eyebrow">Order received with love</div><h1>We’re on it, {order.customer.fullName.split(" ")[0]}.</h1><p>Thank you for letting a little bit of our kitchen into yours.</p><div className="confirmation-card"><div><span>Your order number</span><strong>{order.orderNumber}</strong></div><div><span>Payment</span><strong>Cash on delivery</strong></div><div><span>Delivering to</span><strong>{order.address.city}, {order.address.state}</strong></div><div><span>Order total</span><strong>{money(order.total)}</strong></div></div><Link className="button button-primary" to="/orders">Follow your order <ArrowRight size={17} /></Link><Link className="continue-shopping" to="/shop">Back to the kitchen</Link></main>;
}

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (user) request<{ orders: Order[] }>("/orders/mine").then((result) => setOrders(result.orders)).catch((reason: Error) => setError(reason.message));
  }, [user]);
  async function cancelOrder(order: Order) {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    setCancellingId(order._id); setError(""); setNotice("");
    try {
      const result = await request<{ order: Order }>(`/orders/${order._id}/cancel`, { method: "POST", body: JSON.stringify({}) });
      setOrders((current) => current.map((item) => item._id === order._id ? result.order : item));
      setNotice(`Order ${order.orderNumber} was cancelled.`);
    } catch (reason) { setError((reason as Error).message); } finally { setCancellingId(""); }
  }
  if (!user) return <main className="page-shell"><div className="checkout-login"><h1>Your orders, all in one place.</h1><p>Sign in to see where your homemade goodies are.</p><Link className="button button-primary" to="/login" state={{ from: "/orders" }}>Sign in to see my orders</Link></div></main>;
  return <main className="page-shell orders-page"><div className="eyebrow">A little update from our kitchen</div><h1>Your orders</h1><p className="muted-intro">Every good thing you’ve brought home from us.</p>{error && <div className="inline-error">{error}</div>}{notice && <div className="success-note"><Check size={15} />{notice}</div>}
    {orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order._id}><div className="order-card-head"><div><span>Order placed</span><strong>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></div><div><span>Order number</span><strong>{order.orderNumber}</strong></div><div><span>Total</span><strong>{money(order.total)}</strong></div><span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span></div><div className="order-card-body"><div>{order.items.map((item, index) => <p key={`${item.name}-${index}`}><strong>{item.quantity} × {item.name}</strong> <span>({item.variant})</span></p>)}</div><div className="order-card-actions">{order.shipment?.trackingUrl && <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="tracking-link"><Truck size={15} /> Track shipment</a>}<span>Cash on delivery · {order.paymentStatus}</span>{["placed", "confirmed"].includes(order.status) && <button className="remove-button" disabled={cancellingId === order._id} onClick={() => void cancelOrder(order)}>{cancellingId === order._id ? "Cancelling…" : "Cancel order"}</button>}</div></div><OrderProgress status={order.status} /></article>)}</div> : <div className="empty-state"><span>♡</span><h2>No orders yet — but there’s always a first</h2><Link className="button button-primary" to="/shop">Find your favourite</Link></div>}
  </main>;
}

function OrderProgress({ status }: { status: string }) {
  const steps = ["placed", "confirmed", "preparing", "packed", "shipped", "out_for_delivery", "delivered"];
  if (status === "cancelled" || status === "returned") {
    return <div className={`order-progress terminal-${status}`}><span>{status === "cancelled" ? "This order was cancelled." : "This order was returned."}</span></div>;
  }
  const active = steps.indexOf(status);
  return <div className="order-progress" aria-label={`Order progress: ${status.replaceAll("_", " ")}`}>
    {steps.map((step, index) => <div className={index <= active ? "progress-step complete" : "progress-step"} key={step}><span className="progress-dot">{index < active ? <Check size={10} /> : index + 1}</span><small>{step.replaceAll("_", " ")}</small></div>)}
  </div>;
}

function PoliciesPage() {
  return <main className="page-shell policies-page">
    <div className="page-kicker"><Link to="/">Home</Link><span>/</span> Policies &amp; care</div>
    <div className="eyebrow">The little details matter</div><h1>Our policies &amp; care notes</h1><p className="muted-intro">Clear, thoughtful information for a happy order and a safe table.</p>
    <div className="policy-sections">
      <section id="shipping"><h2>Shipping &amp; delivery</h2><p>Orders are prepared after they are placed. Delivery estimates are shared when known and are not guaranteed until a carrier confirms them. Tracking details appear in your order once a shipment has been arranged. Delivery fees are shown at checkout; orders of ₹999 or more currently qualify for free delivery.</p></section>
      <section id="cancellations"><h2>Cancellation &amp; returns</h2><p>You can request cancellation from your order page while an order is placed or confirmed. Once preparation begins, cancellation is no longer available through the site; please contact us and we will review the request. Because these are food products, we cannot accept returns of opened or consumed items. Contact us promptly if an item arrives damaged or incorrect so we can help.</p><p>Cash-on-delivery orders are the only payment method currently enabled. If a refund or replacement is agreed for an eligible issue, our team will confirm the resolution directly.</p></section>
      <section id="food"><h2>Ingredients &amp; food information</h2><p>Ingredient and allergen information is listed on individual product pages when available. Our kitchen handles a variety of ingredients; if you have a serious allergy, contact us before ordering so we can share the most current preparation details. Product photographs are illustrative, and natural colour or texture may vary between small batches.</p></section>
      <section id="privacy"><h2>Privacy</h2><p>We use the name, contact details and delivery address you provide to manage your account, prepare orders and arrange delivery. Account passwords are stored as secure hashes. We do not store payment card details. Access to order and delivery information is limited to authorized store administrators and service providers needed to fulfil an order.</p></section>
      <section id="terms"><h2>Terms of use</h2><p>Prices and stock are confirmed by the server when an order is placed. An order confirmation means the request was received; our team may contact you if an item cannot be prepared. Product content is provided for general food information and is not medical or dietary advice.</p></section>
      <section id="faqs"><h2>A few common questions</h2><details><summary>How do I follow my order?</summary><p>Sign in and open My orders. Shipment tracking is shown only after actual courier details have been entered.</p></details><details><summary>Can I change a delivery address?</summary><p>Please contact us as soon as possible. Address changes cannot be guaranteed once an order is being prepared or has shipped.</p></details></section>
    </div>
  </main>;
}

function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"overview" | "products" | "categories" | "orders">("overview");
  if (loading) return <main className="page-shell"><div className="loading-line">Checking your access…</div></main>;
  if (!user) return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  if (user.role !== "admin") return <main className="page-shell"><div className="error-panel">Administrator access is required. <Link to="/">Return to the shop</Link></div></main>;
  return <main className="admin-shell">
    <aside className="admin-sidebar"><Link className="brand" to="/"><span className="brand-mark">s<span>m</span></span><span className="brand-copy"><strong>spice &amp; masala</strong><small>ADMIN KITCHEN</small></span></Link><p className="admin-caption">STORE MANAGEMENT</p><button className={tab === "overview" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("overview")}>◈ <span>Overview</span></button><button className={tab === "products" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("products")}>▧ <span>Products</span></button><button className={tab === "categories" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("categories")}>▤ <span>Categories</span></button><button className={tab === "orders" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("orders")}>▣ <span>Orders</span></button><div className="admin-sidebar-bottom"><Link to="/">← View storefront</Link><span>Signed in as {user.name}</span></div></aside>
    <section className="admin-content"><div className="admin-topbar"><div><span className="admin-date">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><h1>{tab === "overview" ? "Good things are happening." : tab === "products" ? "Your product shelf." : tab === "categories" ? "Organise your kitchen." : "The orders are in."}</h1></div><div className="admin-user"><span className="admin-avatar">{user.name[0]}</span><span><strong>{user.name}</strong><small>Store administrator</small></span></div></div>{tab === "overview" ? <AdminOverview onOrders={() => setTab("orders")} /> : tab === "products" ? <AdminProducts /> : tab === "categories" ? <AdminCategories /> : <AdminOrders />}</section>
  </main>;
}

function AdminOverview({ onOrders }: { onOrders: () => void }) {
  const [data, setData] = useState<{ metrics: { totalOrders: number; pendingOrders: number; revenue: number; deliveredOrders: number; shippedOrders: number }; recentOrders: Order[]; lowStock: { product: string; variant: string; stock: number }[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { request<typeof data>("/admin/dashboard").then(setData).catch((reason: Error) => setError(reason.message)); }, []);
  if (error) return <div className="inline-error">{error}</div>;
  if (!data) return <div className="loading-line">Gathering the day’s good news…</div>;
  const cards = [
    ["Orders received", data.metrics.totalOrders, "All time", "◈"],
    ["Need a little love", data.metrics.pendingOrders, "Ready for your attention", "◷"],
    ["Paid revenue", money(data.metrics.revenue), "Successful payments only", "₹"],
    ["Delivered with care", data.metrics.deliveredOrders, "Orders complete", "✓"],
  ];
  return <div className="admin-dashboard"><div className="metric-grid">{cards.map(([label, value, note, icon]) => <article className="metric-card" key={String(label)}><div className="metric-card-top"><span>{label}</span><b>{icon}</b></div><strong>{value}</strong><small>{note}</small></article>)}</div>
    <div className="admin-two-col"><section className="admin-panel"><div className="admin-panel-head"><div><h2>Fresh from the order book</h2><p>A peek at your newest orders</p></div><button className="admin-text-link" onClick={onOrders}>All orders →</button></div><div className="admin-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order._id}><td><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small></td><td>{order.customer.fullName}</td><td>{money(order.total)}</td><td><span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table>{!data.recentOrders.length && <p className="table-empty">New orders will find their way here.</p>}</div></section>
      <section className="admin-panel low-stock-panel"><div className="admin-panel-head"><div><h2>Running a little low</h2><p>Small batches, close attention</p></div><PackageCheck size={19} /></div>{data.lowStock.length ? data.lowStock.slice(0, 7).map((item) => <div className="low-stock-row" key={`${item.product}-${item.variant}`}><span><strong>{item.product}</strong><small>{item.variant}</small></span><b>{item.stock} left</b></div>) : <div className="stock-all-good"><Check size={17} /> Your shelves are looking good.</div>}</section></div></div>;
}

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [packSize, setPackSize] = useState("100 g");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");
  const [notice, setNotice] = useState("");
  const load = () => Promise.all([
    request<{ products: Product[] }>("/admin/products?includeInactive=true"),
    request<{ categories: Category[] }>("/admin/categories"),
  ]).then(([p, c]) => { setProducts(p.products); setCategories(c.categories); if (!category && c.categories[0]) setCategory(c.categories[0]._id); }).catch((reason: Error) => setError(reason.message));
  useEffect(() => { void load(); }, []);
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  async function saveProduct(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      if (editingId) {
        await request(`/admin/products/${editingId}`, { method: "PATCH", body: JSON.stringify({ name, slug, description, category, image }) });
        setNotice("Your product details are up to date.");
      } else {
        await request("/admin/products", { method: "POST", body: JSON.stringify({
          name, slug, description, category, image, ingredients: [], allergens: [], shelfLife: "6 months",
          storage: "Store in a cool, dry place.", variants: [{ label: packSize, price: Number(price), stock: Number(stock) }],
        }) });
        setNotice("Your new product is on the shelf.");
      }
      setName(""); setDescription(""); setPrice(""); setStock(""); setImage(""); setEditingId(""); setShowForm(false);
      await load();
    } catch (reason) { setError((reason as Error).message); } finally { setSaving(false); }
  }
  function editProduct(product: Product) {
    setEditingId(product._id);
    setName(product.name);
    setDescription(product.description);
    setCategory(typeof product.category === "string" ? product.category : product.category._id);
    setImage(product.images[0] || "");
    setShowForm(true);
    setError("");
    setNotice("");
  }
  async function deactivate(id: string) {
    setError(""); setNotice("");
    try { await request(`/admin/products/${id}`, { method: "DELETE" }); setNotice("Product moved off the active shelf."); await load(); }
    catch (reason) { setError((reason as Error).message); }
  }
  return <div className="admin-panel admin-products-panel"><div className="admin-panel-head"><div><h2>Products on your shelf</h2><p>Keep your little catalogue fresh and up to date</p></div><button className="button button-primary admin-add-button" onClick={() => { setShowForm(!showForm); setEditingId(""); }}><Plus size={16} /> {showForm ? "Close form" : "Add a product"}</button></div>
    {error && <div className="inline-error">{error}</div>}{notice && <div className="success-note"><Check size={15} />{notice}</div>}
    {showForm && <form className="admin-product-form" onSubmit={saveProduct}><h3>{editingId ? "Update this good thing" : "A new good thing"}</h3><div className="form-grid"><label>Product name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Category<select required value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="span-two">Description<textarea required minLength={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label>{!editingId && <><label>Pack size<input required value={packSize} onChange={(event) => setPackSize(event.target.value)} /></label><label>Price (₹)<input type="number" required min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Starting stock<input type="number" required min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} /></label></>}<label className={editingId ? "span-two" : ""}>Image URL <span className="optional-note">Optional</span><input type="url" value={image} onChange={(event) => setImage(event.target.value)} /></label></div><button className="button button-primary" disabled={saving || !categories.length}>{saving ? "Saving…" : editingId ? "Save product details" : "Add to the shelf"}</button></form>}
    <div className="admin-table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Pack sizes</th><th>Stock</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product._id}><td><div className="admin-product-cell"><img src={product.images[0] || fallbackImage} alt="" /><span><strong>{product.name}</strong><small>{product.slug}</small></span></div></td><td>{categoryName(product.category)}</td><td>{product.variants.map((variant) => variant.label).join(", ")}</td><td>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)}</td><td><span className={`status-pill ${product.active === false ? "status-cancelled" : "status-delivered"}`}>{product.active === false ? "inactive" : "active"}</span></td><td><div className="product-actions"><button className="remove-button" onClick={() => editProduct(product)}>Edit</button>{product.active !== false && <button className="remove-button" onClick={() => deactivate(product._id)}>Deactivate</button>}</div></td></tr>)}</tbody></table>{!products.length && <p className="table-empty">No products yet. Add the first one above.</p>}</div>
  </div>;
}

function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => request<{ categories: Category[] }>("/admin/categories")
    .then((result) => setCategories(result.categories))
    .catch((reason: Error) => setError(reason.message));
  useEffect(() => { void load(); }, []);
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const method = editingId ? "PATCH" : "POST";
      const endpoint = editingId ? `/admin/categories/${editingId}` : "/admin/categories";
      await request(endpoint, { method, body: JSON.stringify({ name, slug, description, image }) });
      setNotice(editingId ? "Category details updated." : "Your new category is ready.");
      setName(""); setDescription(""); setImage(""); setEditingId("");
      await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function toggleActive(category: Category) {
    setError(""); setNotice("");
    try {
      await request(`/admin/categories/${category._id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: category.active === false }),
      });
      setNotice(category.active === false ? "Category is active again." : "Category deactivated.");
      await load();
    } catch (reason) { setError((reason as Error).message); }
  }
  return <div className="admin-category-layout">
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>Categories</h2><p>Arrange the goodies the way customers find them</p></div><span>{categories.length} total</span></div>{error && <div className="inline-error">{error}</div>}{notice && <div className="success-note"><Check size={15} />{notice}</div>}
      <div className="category-admin-list">{categories.map((category) => <article className="category-admin-row" key={category._id}><span><strong>{category.name}</strong><small>{category.slug}</small></span><div><button className="remove-button" onClick={() => { setEditingId(category._id); setName(category.name); setDescription(category.description || ""); setImage(category.image || ""); setError(""); setNotice(""); }}>Edit</button><button className="remove-button" onClick={() => void toggleActive(category)}>{category.active === false ? "Activate" : "Deactivate"}</button></div><span className={`status-pill ${category.active === false ? "status-cancelled" : "status-delivered"}`}>{category.active === false ? "inactive" : "active"}</span></article>)}</div>
    </section>
    <form className="admin-panel admin-category-form" onSubmit={saveCategory}><h2>{editingId ? "Update a category" : "Add a category"}</h2><p>Give customers a lovely way to find their favourites.</p><label>Category name<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label><label>Image URL <span className="optional-note">Optional</span><input type="url" value={image} onChange={(event) => setImage(event.target.value)} /></label><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save category" : "Add category"}</button>{editingId && <button type="button" className="continue-shopping" onClick={() => { setEditingId(""); setName(""); setDescription(""); setImage(""); }}>Cancel editing</button>}</form>
  </div>;
}

const nextStatus: Record<string, string> = { placed: "confirmed", confirmed: "preparing", preparing: "packed", packed: "shipped", shipped: "out_for_delivery", out_for_delivery: "delivered" };

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notice, setNotice] = useState("");
  const load = () => request<{ orders: Order[] }>("/admin/orders").then((result) => setOrders(result.orders)).catch((reason: Error) => setError(reason.message));
  useEffect(() => { void load(); }, []);
  async function updateStatus(status: string) {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request<{ order: Order }>(`/admin/orders/${selected._id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setSelected(result.order); setNotice(`Order updated to ${status.replaceAll("_", " ")}.`); await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function saveShipment(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request<{ order: Order }>(`/admin/orders/${selected._id}/shipment`, { method: "PATCH", body: JSON.stringify({ courier, trackingNumber, trackingUrl }) });
      setSelected(result.order); setNotice("Manual shipment details saved."); await load();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <div className="admin-orders-layout"><section className="admin-panel admin-orders-list"><div className="admin-panel-head"><div><h2>Every order, with care</h2><p>{orders.length} orders in your book</p></div><button className="admin-text-link" onClick={() => void load()}>Refresh ↻</button></div>{error && <div className="inline-error">{error}</div>}{orders.map((order) => <button className={`admin-order-row ${selected?._id === order._id ? "selected" : ""}`} key={order._id} onClick={() => { setSelected(order); setCourier(order.shipment?.courier || ""); setTrackingNumber(order.shipment?.trackingNumber || ""); setTrackingUrl(order.shipment?.trackingUrl || ""); setNotice(""); }}><span><strong>{order.orderNumber}</strong><small>{order.customer.fullName} · {new Date(order.createdAt).toLocaleDateString("en-IN")}</small></span><span className="admin-order-end"><b>{money(order.total)}</b><span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span></span></button>)}</section>
    <section className="admin-panel order-detail-admin">{selected ? <><div className="admin-panel-head"><div><div className="eyebrow">Order details</div><h2>{selected.orderNumber}</h2><p>{new Date(selected.createdAt).toLocaleString("en-IN")}</p></div><span className={`status-pill status-${selected.status}`}>{selected.status.replaceAll("_", " ")}</span></div>
      {error && <div className="inline-error">{error}</div>}{notice && <div className="success-note"><Check size={15} />{notice}</div>}
      <div className="order-admin-section"><h3>Customer &amp; delivery</h3><p><strong>{selected.customer.fullName}</strong><br />{selected.customer.phone} · {selected.customer.email}<br />{selected.address.street}, {selected.address.city}, {selected.address.state} {selected.address.postalCode}</p>{selected.address.instructions && <small>Delivery note: {selected.address.instructions}</small>}</div>
      <div className="order-admin-section"><h3>The good things ordered</h3>{selected.items.map((item, index) => <div className="admin-line-item" key={`${item.name}-${index}`}><span>{item.quantity} × {item.name}<small>{item.variant}</small></span><strong>{money(item.lineTotal)}</strong></div>)}<div className="admin-line-item"><span>Subtotal &amp; delivery</span><strong>{money(selected.total)}</strong></div><div className="admin-line-item"><span>Payment · {selected.paymentMethod}</span><strong>{selected.paymentStatus}</strong></div></div>
      {selected.shipment?.trackingNumber && <div className="order-admin-section"><h3>Manual shipment · confirmed details entered by admin</h3><p>{selected.shipment.courier}: {selected.shipment.trackingNumber}</p>{selected.shipment.trackingUrl && <a href={selected.shipment.trackingUrl} target="_blank" rel="noreferrer">Open carrier tracking ↗</a>}</div>}
      {selected.status === "packed" && <form onSubmit={saveShipment} className="shipment-form"><h3>Manual shipping mode</h3><p>Enter real carrier details only after you have booked the parcel.</p><label>Courier<input required value={courier} onChange={(event) => setCourier(event.target.value)} placeholder="e.g. India Post" /></label><label>Tracking number<input required value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /></label><label>Tracking URL<input type="url" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://…" /></label><button className="button button-outline" disabled={busy}>Save tracking details</button></form>}
      <div className="order-admin-actions">{nextStatus[selected.status] && <button className="button button-primary" disabled={busy || (selected.status === "packed" && !selected.shipment?.trackingNumber)} onClick={() => void updateStatus(nextStatus[selected.status])}>{busy ? "Updating…" : `Mark ${nextStatus[selected.status].replaceAll("_", " ")}`} <ArrowRight size={16} /></button>}{["placed", "confirmed", "preparing"].includes(selected.status) && <button className="cancel-order-admin" disabled={busy} onClick={() => void updateStatus("cancelled")}>Cancel order</button>}</div>
    </> : <div className="empty-detail"><PackageCheck size={26} /><h2>Pick an order to get started</h2><p>Customer details, packed items and real tracking updates will show here.</p></div>}</section>
  </div>;
}

function AdminRoute() {
  return <AdminPage />;
}

function AppFrame() {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();
  const admin = location.pathname.startsWith("/admin");
  return (
    <>
      {!admin && <Header onOpenApiModal={() => setModalOpen(true)} />}
      <ErrorBoundary onOpenApiModal={() => setModalOpen(true)}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/admin/*" element={<AdminRoute />} />
          <Route path="*" element={<main className="page-shell"><div className="empty-state"><CircleHelp size={38} /><h2>We can’t find that page.</h2><Link className="button button-primary" to="/">Back to our kitchen</Link></div></main>} />
        </Routes>
      </ErrorBoundary>
      {!admin && <Footer onOpenApiModal={() => setModalOpen(true)} />}
      <ApiConfigModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppFrame /></BrowserRouter>;
}
