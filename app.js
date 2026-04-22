/* ============================================
   PageTurn Publishing — app.js
   Shared data + utility functions used by all pages
   Includes: Cart system (localStorage-based)
   ============================================ */

// ─────────────────────────────────────────
// BOOK DATA
// Replace with real data / CMS / API later
// ─────────────────────────────────────────
const books = [
  {
    id: 1,
    title: "The Quiet Hours",
    author: "Elena Marsh",
    genre: "Literary Fiction",
    price: 14.99,
    color: "#4A6FA5",  // cover background color
    description:
      "A deeply moving novel set in a coastal town where time seems to slow during the early morning hours. Elena Marsh weaves together three generations of women finding their voice and place in an ever-changing world. Winner of the 2024 Regional Fiction Award.",
  },
  {
    id: 2,
    title: "Rivers of Gold",
    author: "Samuel Adeyemi",
    genre: "Historical",
    price: 16.99,
    color: "#B05C3A",
    description:
      "Set against the backdrop of the 15th-century trans-Saharan trade routes, this epic tale follows a young merchant's journey from Timbuktu to the Mediterranean coast, exploring themes of ambition, betrayal, and resilience across a richly imagined world.",
  },
  {
    id: 3,
    title: "Midnight in the Garden",
    author: "Priya Nair",
    genre: "Mystery",
    price: 12.99,
    color: "#5B8C5A",
    description:
      "When a renowned botanist is found dead in her own greenhouse, detective Anika Sen must untangle a web of secrets buried beneath blooming flowers. Priya Nair's debut mystery is atmospheric, witty, and utterly unputdownable.",
  },
  {
    id: 4,
    title: "Fractured Light",
    author: "James Holloway",
    genre: "Science Fiction",
    price: 15.99,
    color: "#7A5C8C",
    description:
      "In a future where memories can be extracted and sold, one archivist discovers a recording that could rewrite human history. A thought-provoking exploration of identity, consent, and the commodification of the human mind.",
  },
  {
    id: 5,
    title: "Salt & Ember",
    author: "Maria Kowalczyk",
    genre: "Romance",
    price: 11.99,
    color: "#A04060",
    description:
      "Two chefs, one failing restaurant, and a last-chance food competition in coastal Portugal. Salt & Ember is a warm, witty, and wonderfully sensory romance that will have you booking a flight and reaching for seconds.",
  },
  {
    id: 6,
    title: "The Paper Atlas",
    author: "Chen Wei",
    genre: "Travel Memoir",
    price: 13.99,
    color: "#6B7A4A",
    description:
      "A cartographer's year-long journey retracing ancient Silk Road maps on foot and bicycle. Chen Wei's luminous prose transforms landscape into feeling, and geography into self-discovery, in this stunning debut memoir.",
  },
];

// ─────────────────────────────────────────
// RENDER BOOK CARDS into a grid container
// ─────────────────────────────────────────
function renderBooks(containerId, booksArray) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = booksArray
    .map(
      (book) => `
      <div class="book-card" onclick="goToProduct(${book.id})">
        <!-- Decorative CSS cover -->
        <div class="card-cover" style="background: linear-gradient(145deg, ${book.color}, ${darkenColor(book.color, 30)})">
          <div class="cover-spine"></div>
          <div class="cover-text">
            <span class="cover-book-title">${book.title}</span>
            <span class="cover-book-author">${book.author}</span>
          </div>
        </div>
        <!-- Card body -->
        <div class="card-body">
          <span class="card-genre">${book.genre}</span>
          <h3 class="card-title">${book.title}</h3>
          <p class="card-author">${book.author}</p>
          <div class="card-footer">
            <span class="card-price">$${book.price.toFixed(2)}</span>
            <div class="card-actions" onclick="event.stopPropagation()">
              <a href="product.html?id=${book.id}" class="btn btn-outline btn-sm">Details</a>
              <button class="btn btn-primary btn-sm" onclick="addToCart(${book.id})">+ Cart</button>
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join('');
}

// Navigate to product page
function goToProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

// ─────────────────────────────────────────
// UTILITY: Simple color darkening (hex)
// ─────────────────────────────────────────
function darkenColor(hex, amount) {
  // Remove # if present
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) - amount;
  let g = ((num >> 8) & 0xff) - amount;
  let b = (num & 0xff) - amount;
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ─────────────────────────────────────────
// CART — localStorage helpers
// Cart items: [{ id, title, price, qty }]
// ─────────────────────────────────────────
const CART_KEY = 'pageturn_cart';

/** Read cart from localStorage */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

/** Save cart array to localStorage */
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/** Add a book to the cart (or increment qty if already present) */
function addToCart(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === bookId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: book.id, title: book.title, price: book.price, qty: 1 });
  }

  saveCart(cart);
  updateCartBadge();
  showCartToast(book.title);
}

/** Remove an item from the cart entirely */
function removeFromCart(bookId) {
  const cart = getCart().filter(item => item.id !== bookId);
  saveCart(cart);
  updateCartBadge();
}

/** Change qty; remove if qty < 1 */
function updateQty(bookId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === bookId);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) {
    removeFromCart(bookId);
    return;
  }
  saveCart(cart);
  updateCartBadge();
}

/** Total number of items in cart (sum of quantities) */
function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/** Update the cart badge count in the header */
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

/** Brief toast notification after adding to cart */
function showCartToast(title) {
  // Remove any existing toast
  const old = document.getElementById('cartToast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'cartToast';
  toast.className = 'cart-toast';
  toast.innerHTML = `<span>✓</span> <em>${title}</em> added to cart`;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));

  // Remove after 2.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ─────────────────────────────────────────
// MOBILE HAMBURGER MENU (shared across pages)
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
  }

  // Initialize badge on every page load
  updateCartBadge();
});
