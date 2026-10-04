// TheNerdLoop storefront JS: cart drawer, add-to-bag, product gallery, photo personalization.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  /* ---------- featured product quick view ---------- */

  const quickViewModal = $('[data-quick-view-modal]');
  const quickViewFrame = $('[data-quick-view-frame]');

  const openQuickView = (url) => {
    if (!quickViewModal || !quickViewFrame) return;
    quickViewFrame.src = url;
    quickViewModal.hidden = false;
    quickViewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeQuickView = () => {
    if (!quickViewModal || !quickViewFrame) return;
    quickViewModal.hidden = true;
    quickViewModal.setAttribute('aria-hidden', 'true');
    quickViewFrame.src = 'about:blank';
    document.body.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-quick-view]');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      openQuickView(trigger.dataset.quickView);
      return;
    }
    if (e.target.closest('[data-quick-view-close]')) {
      e.preventDefault();
      closeQuickView();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && quickViewModal && !quickViewModal.hidden) closeQuickView();
  });

  const json = (url, opts) => fetch(url, opts).then(async (r) => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        d.description ||
        d.message ||
        d.error ||
        'Something went wrong'
      );
    }
    return d;
  });

  /* ---------- cart drawer ---------- */

  const drawer = $('[data-drawer]');

  const money = (cents, cur) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: cur || 'INR',
      minimumFractionDigits: 0
    }).format(cents / 100);

  const openDrawer = () => {
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.hidden = true;
    document.body.style.overflow = '';
  };

  async function render(cart) {
    cart = cart || (await json('/cart.js'));

    $$('[data-cart-count]').forEach((b) => {
      b.textContent = cart.item_count;
      b.hidden = !cart.item_count;
    });

    $('[data-cart-items]').innerHTML = cart.items.length
      ? cart.items.map((i, n) => {
          const props = Object.entries(i.properties || {})
            .filter(([k, v]) => v && !k.startsWith('_'));

          return `
          <div class="cart-item">
            <div class="mini-art">
              ${i.image
                ? `<img src="${esc(i.image)}" alt="${esc(i.product_title)}">`
                : ''}
            </div>

            <div class="cart-item-info">
              <b>${esc(i.product_title)}</b>

              ${
                i.variant_title && i.variant_title !== 'Default Title'
                  ? `<p>${esc(i.variant_title)}</p>`
                  : ''
              }

              ${
                props.length
                  ? '<p class="cart-custom-label">CUSTOMIZE IT</p>'
                  : ''
              }

              ${
                props.map(([k, v]) =>
                  `<p>${esc(k)}: ${esc(v)}</p>`
                ).join('')
              }

              <p>${money(i.final_price, cart.currency)}</p>

              <div class="cart-quantity">
                <button
                  type="button"
                  data-line="${n + 1}"
                  data-to="${i.quantity - 1}"
                  aria-label="Decrease quantity"
                >
                  −
                </button>

                <span>${i.quantity}</span>

                <button
                  type="button"
                  data-line="${n + 1}"
                  data-to="${i.quantity + 1}"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              data-line="${n + 1}"
              data-to="0"
              aria-label="Remove ${esc(i.product_title)}"
            >
              ✕
            </button>
          </div>`;
        }).join('')
      : `
        <div class="empty-cart">
          <p>YOUR BAG IS AS EMPTY AS THE VOID.</p>
          <button
            type="button"
            class="comic-button"
            data-drawer-close
          >
            GO FILL IT
          </button>
        </div>
      `;

    $('[data-cart-footer]').hidden = !cart.items.length;

    $('[data-cart-total]').textContent =
      money(cart.total_price, cart.currency);
  }

  const add = (id, quantity, properties) =>
    json('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          id: +id,
          quantity: +quantity || 1,
          properties
        }]
      })
    });

  /* ---------- events ---------- */

  document.addEventListener('click', async (e) => {
    const t = e.target;

    if (t.closest('[data-cart-open]')) {
      e.preventDefault();
      await render();
      openDrawer();
      return;
    }

    if (
      t.closest('[data-drawer-close]') ||
      t === drawer
    ) {
      closeDrawer();
      return;
    }

    const line = t.closest('[data-line]');

    if (line) {
      const cart = await json('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          line: +line.dataset.line,
          quantity: +line.dataset.to
        })
      });

      render(cart);
      return;
    }

    const quick = t.closest('[data-add]');

    if (quick) {
      quick.disabled = true;

      try {
        await add(quick.dataset.add, 1);
        await render();
        openDrawer();
      } catch (err) {
        alert(err.message);
      }

      quick.disabled = false;
      return;
    }

    const qty = t.closest('[data-qty-step]');

    if (qty) {
      const input = $('input[name=quantity]', qty.closest('form'));

      input.value = Math.max(
        1,
        (+input.value || 1) + +qty.dataset.qtyStep
      );

      return;
    }

    const thumb = t.closest('[data-thumb]');
    const step = t.closest('[data-gallery-step]');

    if (thumb || step) {
      const g = t.closest('[data-gallery]');
      const thumbs = $$('[data-thumb]', g);

      const cur = thumbs.findIndex((b) =>
        b.classList.contains('selected')
      );

      const next = thumb
        ? thumbs.indexOf(thumb)
        : (
            cur +
            +step.dataset.galleryStep +
            thumbs.length
          ) % thumbs.length;

      thumbs.forEach((b, i) =>
        b.classList.toggle('selected', i === next)
      );

      const img = $('[data-gallery-main]', g);

      img.removeAttribute('srcset');
      img.src = thumbs[next].dataset.thumb;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) {
      closeDrawer();
    }
  });

  /* ---------- live photo preview ---------- */

  function syncFrame(newFile) {
    const frame = $('[data-photo-frame]');
    const form = $('[data-add-form]');

    if (!frame || !form) return;

    const file = $('[data-photo]', form).files[0];

    if (newFile && file) {
      $('img', frame).src = URL.createObjectURL(file);
    }

    const thumbs = $$('[data-thumb]');
    const onFront =
      !thumbs.length ||
      thumbs[0].classList.contains('selected');

    const on =
      $('input[name=mode]:checked', form).value === 'personalized';

    frame.classList.toggle(
      'on',
      !!(on && file && onFront)
    );
  }

  document.addEventListener(
    'click',
    () => setTimeout(syncFrame)
  );

  /* ---------- dropzone state ---------- */

  function syncDropzone(form) {
    const dz = $('[data-dropzone]', form);
    const file = $('[data-photo]', form).files[0];

    dz.classList.remove('error');
    dz.classList.toggle('has-file', !!file);

    if (file) {
      $('[data-dz-thumb]', dz).src =
        URL.createObjectURL(file);

      $('[data-dz-name]', dz).textContent =
        file.name;
    }
  }

  ['dragenter', 'dragover'].forEach((ev) => {
    document.addEventListener(ev, (e) => {
      const d =
        e.target.closest &&
        e.target.closest('[data-dropzone]');

      if (d) d.classList.add('drag');
    });
  });

  ['dragleave', 'drop'].forEach((ev) => {
    document.addEventListener(ev, (e) => {
      const d =
        e.target.closest &&
        e.target.closest('[data-dropzone]');

      if (d) d.classList.remove('drag');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-dz-remove]')) return;

    const form = e.target.closest('form');

    $('[data-photo]', form).value = '';

    syncDropzone(form);
    syncFrame();
  });

  /* ---------- as-is / customize toggle ---------- */

  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-photo]')) {
      const form = e.target.closest('form');
      const f = e.target.files[0];

      if (
        f &&
        !/^image\/(jpeg|png|webp)$/.test(f.type)
      ) {
        e.target.value = '';

        $('[data-form-status]', form).textContent =
          'Please choose a JPG, PNG or WEBP photo.';
      } else {
        $('[data-form-status]', form).textContent = '';
      }

      syncDropzone(form);
      return syncFrame(true);
    }

    if (e.target.name !== 'mode') return;

    const form = e.target.closest('form');

    $$('.card-purchase-option', form).forEach((l) => {
      const on = $('input', l).checked;

      l.classList.toggle('selected', on);

      $('.purchase-option-indicator', l).textContent =
        on ? '●' : '○';
    });

    $('[data-personalize]', form).classList.toggle(
      'open',
      e.target.value === 'personalized'
    );

    syncFrame();
  });

  /* ---------- product form: native Shopify file upload ---------- */

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-add-form]');

    if (!form) return;

    e.preventDefault();

    const btn = $('[type=submit]', form);
    const status = $('[data-form-status]', form);
    const label = btn.textContent;

    status.textContent = '';
    btn.disabled = true;

    try {
      const mode =
        $('input[name=mode]:checked', form)?.value ||
        'as-is';

      const photoInput = $('[data-photo]', form);
      const nameInput = $('[data-card-name]', form);
      const notesInput = $('[data-print-notes]', form);

      /*
       * Clear customization property names before every submission.
       * This prevents stale customization data from being sent when
       * switching between CUSTOMIZE IT and BUY AS-IS.
       */

      photoInput.removeAttribute('name');
      nameInput.removeAttribute('name');
      notesInput.removeAttribute('name');

      if (mode === 'personalized') {
        const file = photoInput.files[0];
        const cardName = nameInput.value.trim();

        if (!cardName) {
          throw new Error(
            'Please enter the name to print.'
          );
        }

        if (!file) {
          $('[data-dropzone]', form).classList.add('error');

          throw new Error(
            'Upload a photo first, or switch to Buy as-is.'
          );
        }

        if (
          !/^image\/(jpeg|png|webp)$/.test(file.type)
        ) {
          throw new Error(
            'Please choose a JPG, PNG or WEBP photo.'
          );
        }

        /*
         * Native Shopify line-item properties.
         *
         * The underscore-prefixed photo property is private,
         * so it isn't displayed to the customer in the
         * storefront cart.
         */

        nameInput.name = 'properties[Name]';

        photoInput.name =
          'properties[_Customer Photo]';

        notesInput.name =
          'properties[Instructions]';
      }

      btn.textContent =
        mode === 'personalized'
          ? 'UPLOADING…'
          : 'ADDING…';

      /*
       * Use multipart FormData so the actual File object
       * is sent to Shopify.
       */

      const formData = new FormData(form);

      if (mode === 'personalized') {
        formData.append(
          'properties[Customization]',
          'Personalized'
        );
      }

      const routesRoot =
        (window.Shopify &&
          window.Shopify.routes &&
          window.Shopify.routes.root) ||
        '/';

      const response = await fetch(
        routesRoot + 'cart/add.js',
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.description ||
          data.message ||
          'Unable to add this product to your cart.'
        );
      }

      await render();

      if (window.parent && window.parent !== window) {
        // Inside the quick-view iframe: let the parent page close the
        // modal and open its own bag drawer.
        window.parent.postMessage({ type: 'tnl:cart-updated' }, window.location.origin);
      } else {
        openDrawer();
      }

      btn.textContent = 'ADDED TO BAG!';

      setTimeout(() => {
        btn.textContent = label;
      }, 2000);

    } catch (err) {
      status.textContent = err.message;
      btn.textContent = label;
    }

    btn.disabled = false;
  });
  /* ---------- quick view -> parent bag sync ---------- */

  window.addEventListener('message', async (e) => {
    if (e.origin !== window.location.origin) return;
    if (!e.data || e.data.type !== 'tnl:cart-updated') return;
    if (!drawer) return;

    closeQuickView();
    await render();
    openDrawer();
  });

  /* ---------- mobile menu ---------- */

  const navEl = $('.site-header nav');
  const menuBtn = $('[data-mobile-menu-toggle]');

  const setMenu = (open) => {
    if (!navEl || !menuBtn) return;
    navEl.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };

  document.addEventListener('click', (e) => {
    if (!navEl || !menuBtn) return;

    if (e.target.closest('[data-mobile-menu-toggle]')) {
      setMenu(!navEl.classList.contains('nav-open'));
    } else if (navEl.classList.contains('nav-open')) {
      // tapping a link, or anywhere outside the menu, closes it
      if (e.target.closest('.site-header nav a') || !e.target.closest('.site-header nav')) {
        setMenu(false);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  window
    .matchMedia('(min-width: 801px)')
    .addEventListener('change', (m) => {
      if (m.matches) setMenu(false);
    });
})();