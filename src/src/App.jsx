
import React, { useState } from "react";
import {
  Search, ShoppingBag, Heart, UserRound, Menu,
  ChevronRight, Sparkles, Truck, ShieldCheck, Headphones
} from "lucide-react";

const categories = [
  "Women's Fashion", "Men's Fashion", "Beauty & Skincare",
  "Phones & Tablets", "Electronics", "Jewellery & Watches",
  "Shoes & Bags", "Home & Living", "Kitchen & Dining",
  "Kids & Babies", "Grocery", "Sports & Outdoors",
  "Toys & Games", "Books & Stationery", "Automotive",
  "Pet Supplies", "Health & Wellness", "Travel & Luggage",
  "Tools & Hardware", "Gifts & Flowers"
];

const products = [
  { name: "Elegant Embroidered Dress", category: "Women's Fashion", price: 3499, old: 4999, emoji: "👗" },
  { name: "Luxury Beauty Collection", category: "Beauty & Skincare", price: 2199, old: 2999, emoji: "💄" },
  { name: "Classic Gold Jewellery Set", category: "Jewellery & Watches", price: 1599, old: 2299, emoji: "💍" },
  { name: "Modern Smart Watch", category: "Electronics", price: 2799, old: 3999, emoji: "⌚" },
  { name: "Premium Handbag", category: "Shoes & Bags", price: 2499, old: 3499, emoji: "👜" },
  { name: "Beautiful Home Decor", category: "Home & Living", price: 1899, old: 2599, emoji: "🏡" },
  { name: "Wireless Headphones", category: "Phones & Tablets", price: 2999, old: 3999, emoji: "🎧" },
  { name: "Kitchen Essentials Set", category: "Kitchen & Dining", price: 1299, old: 1799, emoji: "🍽️" }
];

export default function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const filtered = products.filter(p =>
    (category === "All" || p.category === category) &&
    (p.name + " " + p.category).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="site">
      <div className="topbar">✨ Welcome to Rosevara — Discover More, Live Beautifully ✨</div>

      <header className="header">
        <button className="menu"><Menu /></button>
        <a className="logo" href="#">Rosevara<span>✿</span></a>
        <div className="header-actions">
          <button aria-label="Wishlist"> <Heart /> <small>{wishlist.length}</small></button>
          <button aria-label="Cart"><ShoppingBag /><small>{cart.length}</small></button>
          <button aria-label="Account"><UserRound /></button>
        </div>
      </header>

      <nav className="nav">
        <a href="#home">Home</a>
        <a href="#categories">Categories</a>
        <a href="#products">Shop</a>
        <a href="#about">About Rosevara</a>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> THE WORLD OF ROSEVARA</span>
            <h1>Discover More.<br /><em>Live Beautifully.</em></h1>
            <p>Explore fashion, beauty, technology and everything you love — all in one place.</p>
            <a href="#products" className="shop-btn">EXPLORE COLLECTION <ChevronRight size={17} /></a>
          </div>
          <div className="hero-art">
            <div className="art-circle">R</div>
            <span className="flower">🌸</span>
            <span className="sparkle">✧</span>
            <div className="art-caption">A LITTLE MORE BEAUTY<br />IN EVERY DAY</div>
          </div>
        </section>

        <section className="benefits">
          <div><Truck /><span><b>Nationwide Shopping</b><small>Pakistan first</small></span></div>
          <div><ShieldCheck /><span><b>Shopping with Care</b><small>Customer focused</small></span></div>
          <div><Headphones /><span><b>Customer Support</b><small>We're here to help</small></span></div>
        </section>

        <section className="section" id="categories">
          <div className="section-heading"><span>EXPLORE THE WORLD</span><h2>Shop by Category</h2><p>Everything you love, beautifully brought together.</p></div>
          <div className="category-grid">
            {categories.map((c, i) => (
              <button key={c} className="category-card" onClick={() => {setCategory(c); document.getElementById("products").scrollIntoView({behavior:"smooth"});}}>
                <span>{["👗","👔","💄","📱","💻","💎","👠","🛋️","🍳","🧸","🛒","⚽","🎮","📚","🚗","🐾","🌿","🧳","🛠️","🎁"][i]}</span>
                <b>{c}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading"><span>THE ROSEVARA EDIT</span><h2>Discover Our Collection</h2><p>Find something special for every moment.</p></div>
          <div className="search-box">
            <Search />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, categories..." />
          </div>
          <div className="filters">
            <button className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>All Products</button>
            <button onClick={() => setCategory("Women's Fashion")}>Fashion</button>
            <button onClick={() => setCategory("Beauty & Skincare")}>Beauty</button>
            <button onClick={() => setCategory("Electronics")}>Electronics</button>
          </div>
          <div className="product-grid">
            {filtered.map((p, i) => (
              <article className="product-card" key={p.name}>
                <div className="product-image">
                  <span className="discount">SALE</span>
                  <button className="wish" onClick={() => setWishlist(w => w.includes(p.name) ? w.filter(x => x !== p.name) : [...w,p.name])}><Heart fill={wishlist.includes(p.name) ? "#c75b80" : "none"} /></button>
                  <span className="product-emoji">{p.emoji}</span>
                </div>
                <div className="product-info">
                  <small>{p.category}</small><h3>{p.name}</h3>
                  <b>Rs. {p.price.toLocaleString("en-PK")}</b>
                  <del>Rs. {p.old.toLocaleString("en-PK")}</del>
                  <button className="add-btn" onClick={() => setCart(c => [...c,p.name])}>ADD TO BAG +</button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="empty">No matching products found. Try another search.</p>}
          </div>
        </section>

        <section className="newsletter" id="about">
          <span>THE ROSEVARA EXPERIENCE</span>
          <h2>Beauty in Every Little Detail.</h2>
          <p>One destination. Endless discoveries.</p>
        </section>
      </main>

      <footer><a className="logo" href="#">Rosevara<span>✿</span></a><p>Discover More, Live Beautifully.</p><small>© 2026 Rosevara. All rights reserved.</small></footer>
    </div>
  );
  }
              
