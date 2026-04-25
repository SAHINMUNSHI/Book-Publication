/* ============================================
   PageTurn Publishing — app.js
   Shared utilities used by all pages.
   Books data is loaded from books.json via fetch().
   ============================================ */

// ─────────────────────────────────────────
// BOOKS REGISTRY
// Populated once by fetchBooks().
// All pages that need book data must await fetchBooks().
// ─────────────────────────────────────────

/** Cached promise — guarantees only one network request per page load */
let _booksPromise = null;

/**
 * Fetch and cache all books from books.json.
 * Returns a Promise that resolves to the books array.
 * Safe to call multiple times — data is fetched only once.
 */
function fetchBooks() {
  if (!_booksPromise) {
    _booksPromise = fetch('books.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load books.json (${res.status})`);
        return res.json();
      })
      .catch(err => {
        console.error('PageTurn: could not load books.json —', err);
        return [];   // graceful fallback: empty catalogue
      });
  }
  return _booksPromise;
}

// ─────────────────────────────────────────
// CARD RENDERING
// ─────────────────────────────────────────

/** Build a single book card's HTML string */
function buildCardHTML(book) {
  return `
    <div class="book-card" onclick="goToProduct(${book.id})">
      <div class="card-cover" style="background: linear-gradient(145deg, ${book.color}, ${darkenColor(book.color, 30)})">
        <div class="cover-spine"></div>
        <div class="cover-text">
          <span class="cover-book-title">${book.title}</span>
          <span class="cover-book-author">${book.author}</span>
        </div>
      </div>
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
  `;
}

/**
 * Simple render — replaces container contents entirely.
 * Used by: index.html (featured grid), product.html (related grid).
 */
function renderBooks(containerId, booksArray) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = booksArray.map(buildCardHTML).join('');
}

// Navigate to product page
function goToProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

// ─────────────────────────────────────────
// PAGINATED + SEARCHABLE GRID
// Used by: books.html
// ─────────────────────────────────────────
const PAGE_SIZE = 12;

const gridState = {
  sourceBooks:  [],
  visibleCount: 0,
};

/** Reset grid and render the first PAGE_SIZE cards from booksArray */
function initPaginatedGrid(gridId, loadMoreId, emptyMsgId, countId, booksArray) {
  gridState.sourceBooks  = booksArray;
  gridState.visibleCount = 0;

  const container = document.getElementById(gridId);
  if (container) container.innerHTML = '';

  _updateResultCount(countId, booksArray.length);
  _appendNextPage(gridId, loadMoreId, emptyMsgId);
}

/** Append the next PAGE_SIZE cards — called by initPaginatedGrid and Load More */
function _appendNextPage(gridId, loadMoreId, emptyMsgId) {
  const container   = document.getElementById(gridId);
  const loadMoreBtn = document.getElementById(loadMoreId);
  const emptyMsg    = document.getElementById(emptyMsgId);
  if (!container) return;

  const { sourceBooks, visibleCount } = gridState;

  if (sourceBooks.length === 0) {
    if (emptyMsg)    emptyMsg.style.display    = 'block';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  const nextSlice = sourceBooks.slice(visibleCount, visibleCount + PAGE_SIZE);
  const fragment  = document.createDocumentFragment();

  nextSlice.forEach(book => {
    const tmp = document.createElement('div');
    tmp.innerHTML = buildCardHTML(book).trim();
    fragment.appendChild(tmp.firstChild);
  });
  container.appendChild(fragment);

  gridState.visibleCount += nextSlice.length;

  if (loadMoreBtn) {
    loadMoreBtn.style.display =
      gridState.visibleCount < sourceBooks.length ? 'block' : 'none';
  }
}

/** Update the optional result-count label */
function _updateResultCount(countId, total) {
  const el = document.getElementById(countId);
  if (!el) return;
  el.textContent = total === 0 ? '' : `${total} book${total === 1 ? '' : 's'} found`;
}

// ─────────────────────────────────────────
// DEBOUNCE HELPER
// ─────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─────────────────────────────────────────
// BOOKS PAGE BOOTSTRAP  (books.html)
// fetch → query-param pre-fill → search → pagination
// ─────────────────────────────────────────

/**
 * @param {string} searchId   – id of the <input> search field
 * @param {string} gridId     – id of the .books-grid element
 * @param {string} loadMoreId – id of the Load More button
 * @param {string} emptyMsgId – id of the "no results" element
 * @param {string} countId    – id of the results-count label (optional)
 */
async function setupBooksPage(searchId, gridId, loadMoreId, emptyMsgId, countId) {
  // 1. Show a loading state while JSON is fetching
  const container = document.getElementById(gridId);
  if (container) {
    container.innerHTML =
      '<p class="books-loading-msg">Loading books…</p>';
  }

  // 2. Fetch data
  const allBooks = await fetchBooks();

  // Clear loading message
  if (container) container.innerHTML = '';

  // 3. Read ?q= query param (set by homepage search redirect)
  const params       = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';

  // 4. Pre-fill search input if arriving from homepage
  const searchInput = document.getElementById(searchId);
  if (searchInput && initialQuery) {
    searchInput.value = initialQuery;
  }

  // 5. Filter helper
  const applyFilter = (query) => {
    const q = query.trim().toLowerCase();
    return q
      ? allBooks.filter(b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
        )
      : allBooks;
  };

  // 6. Render first page
  initPaginatedGrid(gridId, loadMoreId, emptyMsgId, countId, applyFilter(initialQuery));

  // 7. Wire debounced search (300 ms delay)
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce(() => {
        initPaginatedGrid(
          gridId, loadMoreId, emptyMsgId, countId,
          applyFilter(searchInput.value)
        );
      }, 300)
    );
  }

  // 8. Load More button
  const loadMoreBtn = document.getElementById(loadMoreId);
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      _appendNextPage(gridId, loadMoreId, emptyMsgId);
    });
  }
}

// ─────────────────────────────────────────
// HOMEPAGE SEARCH  (index.html)
// Redirects to books.html?q=<query>
// ─────────────────────────────────────────

/**
 * Wire the homepage search input.
 * Enter key → redirect immediately.
 * 600 ms idle after typing → redirect automatically.
 * @param {string} inputId – id of the homepage <input>
 */
function setupHomepageSearch(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const redirect = () => {
    const q = input.value.trim();
    window.location.href = q
      ? `books.html?q=${encodeURIComponent(q)}`
      : 'books.html';
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') redirect();
  });

  // Auto-redirect after 600 ms of inactivity (feels instant to user)
  input.addEventListener('input', debounce(redirect, 600));
}

// ─────────────────────────────────────────
// UTILITY: Simple hex color darkening
// ─────────────────────────────────────────
function darkenColor(hex, amount) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) - amount;
  let g = ((num >> 8) & 0xff) - amount;
  let b = (num & 0xff) - amount;
  return `#${[r, g, b].map(v => Math.max(0, v).toString(16).padStart(2, '0')).join('')}`;
}

// ─────────────────────────────────────────
// CART — localStorage helpers
// ─────────────────────────────────────────
const CART_KEY = 'pageturn_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Add a book to the cart.
 * async because it looks up book data from the fetch cache.
 */
async function addToCart(bookId) {
  const allBooks = await fetchBooks();
  const book     = allBooks.find(b => b.id === bookId);
  if (!book) return;

  const cart     = getCart();
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

function removeFromCart(bookId) {
  saveCart(getCart().filter(item => item.id !== bookId));
  updateCartBadge();
}

function updateQty(bookId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === bookId);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) { removeFromCart(bookId); return; }
  saveCart(cart);
  updateCartBadge();
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  const count = cartCount();

  // Update all badge elements (desktop + mobile)
  ['cartBadge', 'cartBadgeMobile'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent   = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';

    // Bounce animation on update
    badge.classList.remove('badge-pop');
    void badge.offsetWidth; // force reflow to restart animation
    if (count > 0) badge.classList.add('badge-pop');
  });
}

function showCartToast(title) {
  const old = document.getElementById('cartToast');
  if (old) old.remove();

  const toast     = document.createElement('div');
  toast.id        = 'cartToast';
  toast.className = 'cart-toast';
  toast.innerHTML = `<span>✓</span> <em>${title}</em> added to cart`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ─────────────────────────────────────────
// MOBILE HAMBURGER (shared across all pages)
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }
  updateCartBadge();
});