
import React, { useState } from "react";

const categories = [
  "Fashion", "Beauty", "Electronics", "Home & Living",
  "Jewellery", "Shoes", "Bags", "Kids", "Sports",
  "Health", "Watches", "Accessories"
];

const products = [
  { id: 1, name: "Elegant Pink Dress", category: "Fashion", price: 2499, emoji: "👗" },
  { id: 2, name: "Luxury Beauty Set", category: "Beauty", price: 1899, emoji: "💄" },
  { id: 3, name: "Premium Handbag", category: "Bags", price: 3200, emoji: "👜" },
  { id: 4, name: "Gold Jewellery Set", category: "Jewellery", price: 1500, emoji: "💍" },
  { id: 5, name: "Wireless Headphones", category: "Electronics", price: 4500, emoji: "🎧" },
  { id: 6, name: "Home Decor Set", category: "Home & Living", price: 2200, emoji: "🏡" },
  { id: 7, name: "Stylish Sneakers", category: "Shoes", price: 2800, emoji: "👟" },
  { id: 8, name: "Beautiful Watch", category: "Watches", price: 3500, emoji: "⌚" }
];

export default function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const filtered = products.filter(product =>
    (category === "All" || product.category === category) &&
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <div className="announcement">
        WELCOME TO ROSEVARA • DISCOVER MORE, LIVE BEAUTIFULLY
      </div>

      <header className="header">
        <a className="logo" href="#">Rosevara<span>®</span></a>
        <div className="header-actions">
          <span>♡ {wishlist.length}</span>
          <span>🛍️ {cart.length}</span>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">THE WORLD OF BEAUTIFUL FINDS</p>
        <h1>Discover More.<br /><span>Live Beautifully.</span></h1>
        <p>Fashion, beauty and everything you love — all in one place.</p>
        <a href="#shop" className="shop-button">EXPLORE COLLECTION</a>
      </section>

      <section className="categories">
        <h2>Explore Categories</h2>
        <div className="category-list">
          {["All", ...categories].map(item => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
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
          <span>{filtered.length} Products</span>
        </div>

        <input
          className="search"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="product-grid">
          {filtered.map(product => (
            <article className="product-card" key={product.id}>
              <button
                className="heart"
                onClick={() => setWishlist(old =>
                  old.includes(product.id)
                    ? old.filter(id => id !== product.id)
                    : [...old, product.id]
                )}
              >
                {wishlist.includes(product.id) ? "♥" : "♡"}
              </button>
              <div className="product-image">{product.emoji}</div>
              <p className="product-category">{product.category}</p>
              <h3>{product.name}</h3>
              <p className="price">Rs. {product.price.toLocaleString("en-PK")}</p>
              <button className="add-button" onClick={() => setCart(old => [...old, product.id])}>
                ADD TO CART
              </button>
            </article>
          ))}
          {filtered.length === 0 && <p>No products found. Try another search.</p>}
        </div>
      </section>

      <footer>
        <a className="logo" href="#">Rosevara<span>®</span></a>
        <p>Discover More, Live Beautifully.</p>
        <small>© 2026 Rosevara. All rights reserved.</small>
      </footer>
    </div>
  );
}
