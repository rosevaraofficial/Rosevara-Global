
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [auth, setAuth] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [product, setProduct] = useState({
    name: "",
    category_id: "",
    description: "",
    price: "",
    sale_price: "",
    stock: "10",
    sku: "",
    is_featured: false,
    is_active: false,
    image: null,
  });

  useEffect(() => {
    loadStore();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          setTimeout(() => loadProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadStore() {
    const [productResult, categoryResult] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("is_active", true)
        .order("name"),
    ]);

    if (productResult.error) setMessage(productResult.error.message);
    else setProducts(productResult.data || []);

    if (!categoryResult.error) {
      setCategories(categoryResult.data || []);
    }

    setLoading(false);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      setProfile(null);
      setMessage("Profile load nahi hua: " + error.message);
    } else {
      setProfile(data);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: auth.email,
          password: auth.password,
          options: {
            data: { full_name: auth.name },
          },
        });

        if (error) throw error;
        setMessage("Account request successful. Email confirmation check karein.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: auth.email,
          password: auth.password,
        });

        if (error) throw error;
        setShowAuth(false);
        setMessage("Login successful.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setShowAdmin(false);
    setMessage("You have logged out.");
  }

  async function saveProduct(e) {
    e.preventDefault();

    if (profile?.role !== "admin") {
      setMessage("Only admin can add products.");
      return;
    }

    if (!product.name || !product.price) {
      setMessage("Product name aur price zaroori hain.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let imageUrl = "";

      if (product.image) {
        const extension = product.image.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36).slice(2)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, product.image, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const slug = product.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const newProduct = {
        name: product.name,
        slug: `${slug}-${Date.now()}`,
        category_id: product.category_id || null,
        description: product.description,
        price: Number(product.price),
        sale_price: product.sale_price
          ? Number(product.sale_price)
          : null,
        stock: Number(product.stock || 0),
        sku: product.sku || null,
        image_url: imageUrl,
        images: imageUrl ? [imageUrl] : [],
        is_featured: product.is_featured,
        is_active: product.is_active,
        seller_id: null,
      };

      const { error } = await supabase
        .from("products")
        .insert(newProduct);

      if (error) throw error;

      setMessage(
        product.is_active
          ? "Product successfully published!"
          : "Product saved as a private draft!"
      );

      setProduct({
        name: "",
        category_id: "",
        description: "",
        price: "",
        sale_price: "",
        stock: "10",
        sku: "",
        is_featured: false,
        is_active: false,
        image: null,
      });

      await loadStore();
    } catch (error) {
      setMessage("Product save nahi hua: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Kya aap ye product delete karna chahti hain?")) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Product deleted.");
      await loadStore();
    }
  }

  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || item.category_id === category;

    return matchesSearch && matchesCategory;
  });

  const isAdmin = profile?.role === "admin";

  return (
    <div className="app">
      <div className="announcement">
        WELCOME TO ROSEVARA · DISCOVER MORE, LIVE BEAUTIFULLY
      </div>

      <header className="header">
        <a className="logo" href="#home">
          Rosevara<span>®</span>
        </a>

        <div className="header-actions">
          <button onClick={() => setWishlist([])}>
            ♡ {wishlist.length}
          </button>
          <button onClick={() => setMessage(`Cart: ${cart.length} items`)}>
            🛍️ {cart.length}
          </button>

          {session ? (
            <>
              {isAdmin && (
                <button onClick={() => setShowAdmin(!showAdmin)}>
                  Admin
                </button>
              )}
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)}>Login / Sign up</button>
          )}
        </div>
      </header>

      {message && (
        <div className="store-message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {showAuth && (
        <section className="auth-panel">
          <button className="close-button" onClick={() => setShowAuth(false)}>
            ×
          </button>

          <h2>{authMode === "login" ? "Welcome Back" : "Create Account"}</h2>

          <form onSubmit={handleAuth}>
            {authMode === "signup" && (
              <input
                placeholder="Full name"
                value={auth.name}
                onChange={(e) =>
                  setAuth({ ...auth, name: e.target.value })
                }
                required
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={auth.email}
              onChange={(e) =>
                setAuth({ ...auth, email: e.target.value })
              }
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={auth.password}
              onChange={(e) =>
                setAuth({ ...auth, password: e.target.value })
              }
              minLength="6"
              required
            />

            <button className="add-button" disabled={saving}>
              {saving ? "Please wait..." : authMode === "login" ? "LOGIN" : "CREATE ACCOUNT"}
            </button>
          </form>

          <p>
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            {" "}
            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
            >
              {authMode === "login" ? "Sign up" : "Login"}
            </button>
          </p>
        </section>
      )}

      {showAdmin && isAdmin && (
        <section className="admin-panel">
          <p className="eyebrow">ROSEVARA CONTROL CENTER</p>
          <h2>Admin Dashboard</h2>
          <p>Welcome, {profile.full_name || session?.user?.email}</p>

          <div className="admin-stats">
            <div>
              <strong>{products.length}</strong>
              <span>Published products</span>
            </div>
            <div>
              <strong>{categories.length}</strong>
              <span>Categories</span>
            </div>
          </div>

          <h3>Add New Product</h3>

          <form className="product-form" onSubmit={saveProduct}>
            <input
              placeholder="Product name"
              value={product.name}
              onChange={(e) =>
                setProduct({ ...product, name: e.target.value })
              }
              required
            />

            <select
              value={product.category_id}
              onChange={(e) =>
                setProduct({ ...product, category_id: e.target.value })
              }
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Product description"
              value={product.description}
              onChange={(e) =>
                setProduct({ ...product, description: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Price (Rs.)"
              min="0"
              value={product.price}
              onChange={(e) =>
                setProduct({ ...product, price: e.target.value })
              }
              required
            />

            <input
              type="number"
              placeholder="Sale price (optional)"
              min="0"
              value={product.sale_price}
              onChange={(e) =>
                setProduct({ ...product, sale_price: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Stock quantity"
              min="0"
              value={product.stock}
              onChange={(e) =>
                setProduct({ ...product, stock: e.target.value })
              }
            />

            <input
              placeholder="SKU / Product code"
              value={product.sku}
              onChange={(e) =>
                setProduct({ ...product, sku: e.target.value })
              }
            />

            <label className="upload-label">
              Product photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProduct({
                    ...product,
                    image: e.target.files?.[0] || null,
                  })
                }
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={product.is_featured}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    is_featured: e.target.checked,
                  })
                }
              />
              Feature this product
            </label>

            <label>
              <input
                type="checkbox"
                checked={product.is_active}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    is_active: e.target.checked,
                  })
                }
              />
              Publish immediately (untick to save as draft)
            </label>

            <button className="add-button" disabled={saving}>
              {saving ? "Saving..." : "SAVE PRODUCT"}
            </button>
          </form>

          <h3>Published Products</h3>
          {products.map((item) => (
            <div className="admin-product" key={item.id}>
              <span>{item.name} — {money(item.price)}</span>
              <button onClick={() => deleteProduct(item.id)}>
                Delete
              </button>
            </div>
          ))}
        </section>
      )}

      <main id="home">
        <section className="hero">
          <p className="eyebrow">THE WORLD OF BEAUTIFUL FINDS</p>
          <h1>
            Discover More.
            <br />
            <span>Live Beautifully.</span>
          </h1>
          <p>
            Fashion, beauty and everything you love — all in one place.
          </p>
          <a href="#shop" className="shop-button">
            EXPLORE COLLECTION
          </a>
        </section>

        <section className="categories">
          <h2>Explore Categories</h2>
          <div className="category-list">
            <button
              className={category === "All" ? "active" : ""}
              onClick={() => setCategory("All")}
            >
              All
            </button>

            {categories.map((item) => (
              <button
                key={item.id}
                className={category === item.id ? "active" : ""}
                onClick={() => setCategory(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>

        <section className="shop" id="shop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURATED FOR YOU</p>
              <h2>Discover Our Collection</h2>
            </div>
            <span>{filteredProducts.length} Products</span>
          </div>

          <input
            className="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <p>Loading Rosevara collection...</p>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((item) => (
                <article className="product-card" key={item.id}>
                  <button
                    className="heart"
                    onClick={() =>
                      setWishlist((old) =>
                        old.includes(item.id)
                          ? old.filter((id) => id !== item.id)
                          : [...old, item.id]
                      )
                    }
                  >
                    {wishlist.includes(item.id) ? "♥" : "♡"}
                  </button>

                  {item.image_url ? (
                    <img
                      className="product-image"
                      src={item.image_url}
                      alt={item.name}
                    />
                  ) : (
                    <div className="product-image">🌸</div>
                  )}

                  <p className="product-category">
                    {categories.find((c) => c.id === item.category_id)?.name || "Rosevara"}
                  </p>

                  <h3>{item.name}</h3>

                  <p className="price">
                    {item.sale_price ? (
                      <>
                        <del>{money(item.price)}</del>{" "}
                        {money(item.sale_price)}
                      </>
                    ) : (
                      money(item.price)
                    )}
                  </p>

                  <button
                    className="add-button"
                    onClick={() => setCart((old) => [...old, item.id])}
                  >
                    ADD TO CART
                  </button>
                </article>
              ))}

              {filteredProducts.length === 0 && (
                <p>No products found. Try another search or category.</p>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <a className="logo" href="#home">Rosevara<span>®</span></a>
        <p>Discover More, Live Beautifully.</p>
        <div className="footer-links">
          <a href="#about">About Us</a>
          <a href="#policies">Policies</a>
          <a href="mailto:rosevarafashion@gmail.com">Contact</a>
        </div>
        <div id="about">
          Rosevara brings fashion, beauty and everyday essentials together.
        </div>
        <div id="policies">
          Please review product details before placing an order.
        </div>
        <small>© 2026 Rosevara. All rights reserved.</small>
      </footer>
    </div>
  );
    }
      
