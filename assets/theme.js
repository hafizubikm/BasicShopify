(function () {
  'use strict';

  // Mobile nav toggle
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('is-open');
      const expanded = nav.classList.contains('is-open');
      navToggle.setAttribute('aria-expanded', expanded);
    });
  }

  // Product page: variant selection + ATC
  const productForm = document.querySelector('[data-product-form]');
  if (productForm) {
    const productJsonEl = document.querySelector('[data-product-json]');
    let product = null;
    try { product = JSON.parse(productJsonEl.textContent); } catch (e) { /* noop */ }

    const variantInput = productForm.querySelector('[data-variant-id]');
    const submitBtn = productForm.querySelector('[data-add-to-cart]');
    const submitText = productForm.querySelector('[data-add-to-cart-text]');
    const optionButtons = productForm.querySelectorAll('[data-option-value]');

    function getSelectedOptions() {
      const selected = [];
      productForm.querySelectorAll('.product__option').forEach((group) => {
        const active = group.querySelector('.is-selected');
        if (active) selected.push(active.dataset.optionValue);
      });
      return selected;
    }

    function updateVariant() {
      if (!product) return;
      const selected = getSelectedOptions();
      const match = product.variants.find((v) =>
        v.options.every((opt, i) => opt === selected[i])
      );
      if (!match) return;

      variantInput.value = match.id;

      if (match.available) {
        submitBtn.disabled = false;
        submitText.textContent = 'Add to cart';
      } else {
        submitBtn.disabled = true;
        submitText.textContent = 'Sold out';
      }

      const priceEl = document.querySelector('.product__price .price');
      if (priceEl && match.price != null) {
        let html = '';
        const formatted = formatMoney(match.price);
        if (match.compare_at_price && match.compare_at_price > match.price) {
          html = `<span class="price__sale">${formatted}</span><s class="price__compare">${formatMoney(match.compare_at_price)}</s>`;
        } else {
          html = `<span class="price__regular">${formatted}</span>`;
        }
        priceEl.innerHTML = html;
      }
    }

    optionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.product__option');
        group.querySelectorAll('[data-option-value]').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        updateVariant();
      });
    });

    // AJAX add to cart
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitText.textContent = 'Adding...';

      const formData = new FormData(productForm);
      try {
        const res = await fetch(window.Shopify ? '/cart/add.js' : '/cart/add.js', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        });
        if (!res.ok) throw new Error('Add to cart failed');
        await res.json();
        await refreshCartCount();
        showCartNotification();
        submitText.textContent = 'Added';
        setTimeout(() => {
          submitText.textContent = 'Add to cart';
          submitBtn.disabled = false;
        }, 1500);
      } catch (err) {
        submitText.textContent = 'Try again';
        setTimeout(() => {
          submitText.textContent = 'Add to cart';
          submitBtn.disabled = false;
        }, 1500);
      }
    });

    // Thumbnail switching
    document.querySelectorAll('.product__thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const main = document.querySelector('.product__media-main img');
        const img = thumb.querySelector('img');
        if (main && img) {
          main.src = img.src.replace(/(_)\d+x(\.[a-z]+)/, '$11200x$2');
        }
        document.querySelectorAll('.product__thumb').forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }

  // Cart quantity updates
  document.querySelectorAll('[data-qty-change]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrapper = btn.parentElement;
      const input = wrapper.querySelector('[data-qty-input]');
      const delta = parseInt(btn.dataset.qtyChange, 10);
      const newVal = Math.max(0, (parseInt(input.value, 10) || 0) + delta);
      input.value = newVal;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  document.querySelectorAll('[data-qty-input]').forEach((input) => {
    let debounce;
    input.addEventListener('change', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const key = input.dataset.key;
        const quantity = parseInt(input.value, 10) || 0;
        try {
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id: key, quantity }),
          });
          window.location.reload();
        } catch (err) { /* noop */ }
      }, 350);
    });
  });

  // Helpers
  async function refreshCartCount() {
    try {
      const res = await fetch('/cart.js');
      const data = await res.json();
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = data.item_count;
      });
    } catch (err) { /* noop */ }
  }

  function showCartNotification() {
    const note = document.getElementById('cart-notification');
    if (!note) return;
    note.hidden = false;
    setTimeout(() => { note.hidden = true; }, 3000);
  }

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }
})();
