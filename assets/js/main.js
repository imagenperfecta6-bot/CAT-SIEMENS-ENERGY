/* ==========================================================================
   CONFIGURACIÓN — edita estos datos con la información real de tu equipo
   ========================================================================== */
const CONFIG = {
  // Correo donde deben llegar las solicitudes de cotización (con copia).
  quoteEmail: "mercadeo@ip7.com.co",
};

// Cantidad mínima por defecto, solo se usa si un producto no trae su propio
// campo `minQty` en products.js.
const DEFAULT_MIN_QTY = 5;

// Ejecutivo de cuenta dedicado a Siemens Energy — todas las solicitudes de
// cotización (correo) y los botones "Hablar con un ejecutivo" van directo
// a esta persona. Si en algún momento cambia el ejecutivo asignado, solo
// hay que editar este objeto.
const ACCOUNT_EXECUTIVE = {
  name: "Sevastian Velosa",
  email: "ejecutivo.comercial3@ip7.com.co",
  phone: "573001715355",
};

/* ==========================================================================
   ENVÍO DE LA SOLICITUD DE COTIZACIÓN
   --------------------------------------------------------------------------
   Esta página no depende de un backend: hoy arma el mensaje y lo entrega
   por correo (mailto) o portapapeles.
   Para conectar un envío automático (sin depender del cliente de correo del
   usuario), reemplaza el cuerpo de esta función por una llamada a tu propio
   servicio, por ejemplo con EmailJS, Formspree o una función serverless:

   async function sendQuoteRequest(payload) {
     await fetch("https://TU-ENDPOINT/api/cotizaciones", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(payload),
     });
   }

   `payload` ya viene armado como { nombre, empresa, correo, telefono, ciudad,
   comentarios, productos: [{nombre, codigo, cantidad}], mensaje } listo para
   enviar tal cual a la API que elijas.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------------------------------------------------
     ESTADO: carrito de selección (persistido en localStorage)
     --------------------------------------------------------------------- */
  const CART_KEY = "ip7_siemens_energy_cart";
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  /* ---------------------------------------------------------------------
     ACCESO CON CLAVE — un solo usuario/contraseña, definido aquí abajo.
     Como el sitio es estático, esta validación corre en el navegador:
     sirve para que los precios NO se vean a simple vista sin la clave,
     no como una barrera de seguridad real (alguien técnico podría verla
     en el código). Para un candado real haría falta un servidor.
     --------------------------------------------------------------------- */
  const AUTH_KEY = "ip7_siemens_energy_auth";
  const AUTH_USER = "Energy";
  const AUTH_PASS = "Energy2001";

  function isAuthed() {
    try {
      return localStorage.getItem(AUTH_KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  function setAuthed(v) {
    try {
      if (v) localStorage.setItem(AUTH_KEY, "1");
      else localStorage.removeItem(AUTH_KEY);
    } catch (e) {}
  }
  function pricesVisible() {
    return isAuthed();
  }
  function productById(id) {
    return PRODUCTS.find((p) => p.id === id);
  }
  function minQtyOf(product) {
    return product && product.minQty ? product.minQty : DEFAULT_MIN_QTY;
  }
  function cartCount() {
    return Object.keys(cart).length;
  }
  function formatPrice(v) {
    return "$" + v.toLocaleString("es-CO");
  }
  // Elige el precio unitario según la escala de cantidad del producto
  // (10 a 50 / 51 a 100 / 101 o más). Devuelve null si el producto es
  // de cotización especial (sin precio de lista).
  function unitPriceFor(product, qty) {
    if (!product || !product.priceTiers || !product.priceTiers.length) return null;
    const tiers = product.priceTiers;
    if (qty <= 50) return tiers[0].price;
    if (qty <= 100) return tiers[1].price;
    return tiers[2].price;
  }

  /* ---------------------------------------------------------------------
     RENDER DEL CATÁLOGO
     --------------------------------------------------------------------- */
  const catalogSections = document.getElementById("catalogSections");
  const cardTemplate = document.getElementById("cardTemplate");

  function buildCard(product) {
    const node = cardTemplate.content.cloneNode(true);
    const article = node.querySelector(".card");
    article.dataset.id = product.id;
    article.dataset.category = product.category;
    article.dataset.search = (product.name + " " + product.description + " " + product.code).toLowerCase();

    const images = product.images && product.images.length ? product.images : [product.image];
    const media = node.querySelector(".card-media");
    const img = media.querySelector("img");
    const prevBtn = media.querySelector(".gallery-prev");
    const nextBtn = media.querySelector(".gallery-next");
    const dotsWrap = media.querySelector(".gallery-dots");
    let activeIndex = 0;

    img.alt = product.name;
    img.onerror = () => {
      const stage = img.dataset.fallbackStage || "0";
      if (stage === "0") {
        // Mientras no haya foto real del producto, se muestra una imagen de
        // referencia por categoría (a reemplazar más adelante por la foto real).
        img.dataset.fallbackStage = "1";
        media.classList.add("is-reference");
        img.src = `assets/img/productos/_ref/${product.category}.svg`;
      } else {
        // Si hasta la imagen de referencia falla, cae al ícono genérico.
        media.classList.remove("is-reference");
        media.classList.add("is-placeholder");
        img.style.display = "none";
        media.querySelector(".placeholder-icon")?.remove();
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.classList.add("placeholder-icon");
        icon.innerHTML = '<path d="M4 16.5V7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5Z" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="10.5" r="1.6" stroke="currentColor" stroke-width="1.4"/><path d="m6 16 4-4 3 3 2.5-2.5L20 16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
        media.appendChild(icon);
      }
    };

    function renderImage() {
      media.classList.remove("is-reference", "is-placeholder");
      media.querySelector(".placeholder-icon")?.remove();
      img.style.display = "";
      img.dataset.fallbackStage = "0";
      img.src = images[activeIndex];
      dotsWrap.querySelectorAll("button").forEach((d, i) => d.classList.toggle("is-active", i === activeIndex));
    }

    if (images.length > 1) {
      media.classList.add("has-gallery");
      images.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Ver foto ${i + 1}`);
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          activeIndex = i;
          renderImage();
        });
        dotsWrap.appendChild(dot);
      });
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + images.length) % images.length;
        renderImage();
      });
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % images.length;
        renderImage();
      });

      let touchStartX = null;
      media.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
      media.addEventListener("touchend", (e) => {
        if (touchStartX === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 40) {
          activeIndex = delta < 0
            ? (activeIndex + 1) % images.length
            : (activeIndex - 1 + images.length) % images.length;
          renderImage();
        }
        touchStartX = null;
      });
    } else {
      prevBtn.remove();
      nextBtn.remove();
    }

    renderImage();

    node.querySelector(".card-code").textContent = product.code;
    node.querySelector(".card-title").textContent = product.name;
    node.querySelector(".card-desc").textContent = product.description;

    const featuresEl = node.querySelector(".card-features");
    product.features.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      featuresEl.appendChild(li);
    });

    const priceEl = node.querySelector(".card-price");
    if (product.priceTiers && product.priceTiers.length) {
      if (pricesVisible()) {
        priceEl.innerHTML = "";
        const list = document.createElement("ul");
        list.className = "price-tiers";
        product.priceTiers.forEach((tier) => {
          const li = document.createElement("li");
          li.innerHTML = `<span class="tier-qty">${tier.qty} und.</span><span class="tier-price">${formatPrice(tier.price)}</span>`;
          list.appendChild(li);
        });
        priceEl.appendChild(list);
      } else {
        priceEl.innerHTML =
          '<span class="price-locked">🔒 Precios visibles al <button type="button" class="js-open-login">iniciar sesión</button></span>';
      }
    } else {
      priceEl.textContent = "Cotización especial";
      priceEl.classList.add("is-quote");
    }

    const qtyInput = node.querySelector(".qty-input");
    const minusBtn = node.querySelector(".qty-minus");
    const plusBtn = node.querySelector(".qty-plus");
    const minQty = minQtyOf(product);

    function clampQty(v) {
      v = parseInt(v, 10);
      if (isNaN(v) || v < minQty) v = minQty;
      if (v > 50000) v = 50000;
      return v;
    }
    qtyInput.min = minQty;
    qtyInput.value = minQty;
    minusBtn.addEventListener("click", () => {
      const next = clampQty(qtyInput.value) - 1;
      qtyInput.value = next < minQty ? minQty : next;
    });
    plusBtn.addEventListener("click", () => {
      qtyInput.value = clampQty(qtyInput.value) + 1;
    });
    qtyInput.addEventListener("change", () => {
      qtyInput.value = clampQty(qtyInput.value);
    });

    const presetsWrap = node.querySelector(".qty-presets");
    presetsWrap.innerHTML = "";
    [1, 2, 5, 10].forEach((mult) => {
      const qty = Math.min(minQty * mult, 50000);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.qty = qty;
      btn.textContent = qty.toLocaleString("es-CO");
      btn.addEventListener("click", () => {
        qtyInput.value = clampQty(btn.dataset.qty);
      });
      presetsWrap.appendChild(btn);
    });

    const addBtn = node.querySelector(".card-add");
    addBtn.addEventListener("click", () => {
      const qty = clampQty(qtyInput.value);
      cart[product.id] = qty;
      saveCart();
      renderCartUI();
      addBtn.textContent = "✓ Agregado al carrito";
      addBtn.classList.add("is-added");
      showToast(`${product.name} agregado al carrito (${qty.toLocaleString("es-CO")} und.)`);
      setTimeout(() => {
        addBtn.textContent = "Agregar al carrito";
        addBtn.classList.remove("is-added");
      }, 1800);
    });

    return node;
  }

  function renderCatalog() {
    catalogSections.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const products = PRODUCTS.filter((p) => p.category === cat.slug);
      if (!products.length) return;

      const section = document.createElement("section");
      section.className = "category-block";
      section.id = "cat-" + cat.slug;
      section.dataset.category = cat.slug;

      section.innerHTML = `
        <div class="category-block-head">
          <h3>${cat.label}</h3>
          <span class="category-count">${products.length} producto${products.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="grid"></div>
      `;

      const grid = section.querySelector(".grid");
      products.forEach((p) => grid.appendChild(buildCard(p)));

      catalogSections.appendChild(section);
    });

    observeCards();
  }

  /* ---------------------------------------------------------------------
     FILTROS + BÚSQUEDA
     --------------------------------------------------------------------- */
  const searchInput = document.getElementById("searchInput");
  const filterPills = document.querySelectorAll(".pill");
  const noResults = document.getElementById("noResults");
  let activeFilter = "todos";

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function applyFilters() {
    const query = normalize(searchInput.value.trim());
    let visibleCount = 0;

    document.querySelectorAll(".category-block").forEach((section) => {
      const cat = section.dataset.category;
      let sectionVisible = 0;

      section.querySelectorAll(".card").forEach((card) => {
        const matchesCategory = activeFilter === "todos" || card.dataset.category === activeFilter;
        const matchesQuery = !query || normalize(card.dataset.search).includes(query);
        const show = matchesCategory && matchesQuery;
        card.style.display = show ? "" : "none";
        if (show) sectionVisible++;
      });

      section.style.display = sectionVisible ? "" : "none";
      section.querySelector(".category-count").textContent =
        sectionVisible + " producto" + (sectionVisible !== 1 ? "s" : "");
      visibleCount += sectionVisible;
    });

    noResults.hidden = visibleCount !== 0;
  }

  searchInput.addEventListener("input", applyFilters);

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeFilter = pill.dataset.filter;
      applyFilters();
      if (activeFilter !== "todos") {
        const target = document.getElementById("cat-" + activeFilter);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        }
      }
    });
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    searchInput.value = "";
    filterPills.forEach((p) => p.classList.remove("is-active"));
    document.querySelector('.pill[data-filter="todos"]').classList.add("is-active");
    activeFilter = "todos";
    applyFilters();
  });

  /* ---------------------------------------------------------------------
     CARRITO — UI (chip, fab, barra móvil, drawer)
     --------------------------------------------------------------------- */
  const cartChipText = document.getElementById("cartChipText");
  const cartFabCount = document.getElementById("cartFabCount");
  const mobileCartBadge = document.getElementById("mobileCartBadge");
  const drawerList = document.getElementById("drawerList");
  const drawerEmpty = document.getElementById("drawerEmpty");
  const goToQuoteBtn = document.getElementById("goToQuoteBtn");
  const drawerTotal = document.getElementById("drawerTotal");
  const drawerTotalValue = document.getElementById("drawerTotalValue");

  function renderCartUI() {
    const count = cartCount();
    cartChipText.textContent = `${count} producto${count !== 1 ? "s" : ""} seleccionado${count !== 1 ? "s" : ""}`;
    cartFabCount.textContent = count;
    mobileCartBadge.textContent = count;
    mobileCartBadge.hidden = count === 0;
    goToQuoteBtn.disabled = count === 0;

    drawerList.innerHTML = "";
    const ids = Object.keys(cart);
    drawerEmpty.style.display = ids.length ? "none" : "block";

    let grandTotal = 0;
    let hasQuoteOnlyItem = false;

    ids.forEach((id) => {
      const product = productById(id);
      if (!product) return;
      const itemMinQty = minQtyOf(product);
      const qty = cart[id];
      const hasTiers = product.priceTiers && product.priceTiers.length;
      const unitPrice = pricesVisible() ? unitPriceFor(product, qty) : null;
      let priceHtml;
      if (hasTiers && !pricesVisible()) {
        priceHtml = `<span class="is-locked">🔒 Inicia sesión para ver el precio</span>`;
      } else if (unitPrice != null) {
        const lineTotal = unitPrice * qty;
        grandTotal += lineTotal;
        priceHtml = `<span>${formatPrice(unitPrice)} c/u</span><strong>${formatPrice(lineTotal)}</strong>`;
      } else {
        hasQuoteOnlyItem = true;
        priceHtml = `<span class="is-quote">Cotización especial</span>`;
      }
      const li = document.createElement("li");
      li.className = "drawer-item";
      li.innerHTML = `
        <img src="${product.images[0]}" alt="${product.name}" onerror="this.style.visibility='hidden'">
        <div class="drawer-item-info">
          <h5>${product.name}</h5>
          <span>${product.code}</span>
          <div class="drawer-item-controls">
            <input type="number" min="${itemMinQty}" max="50000" value="${cart[id]}" data-id="${id}">
            <button type="button" class="drawer-item-remove" data-id="${id}">Quitar</button>
          </div>
          <div class="drawer-item-price">${priceHtml}</div>
        </div>
      `;
      drawerList.appendChild(li);
    });

    drawerTotal.hidden = ids.length === 0 || !pricesVisible();
    drawerTotalValue.textContent = formatPrice(grandTotal) + (hasQuoteOnlyItem ? " +" : "");

    drawerList.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        const itemMinQty = minQtyOf(productById(input.dataset.id));
        let v = parseInt(input.value, 10);
        if (isNaN(v) || v < itemMinQty) v = itemMinQty;
        if (v > 50000) v = 50000;
        input.value = v;
        cart[input.dataset.id] = v;
        saveCart();
        renderCartUI();
      });
    });
    drawerList.querySelectorAll(".drawer-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        delete cart[btn.dataset.id];
        saveCart();
        renderCartUI();
      });
    });

    renderQuoteSummary();
  }

  /* ---------------------------------------------------------------------
     PANELES: drawer / modales
     --------------------------------------------------------------------- */
  const backdrop = document.getElementById("backdrop");
  const cartDrawer = document.getElementById("cartDrawer");
  const quoteModal = document.getElementById("quoteModal");
  const pricingNoticeModal = document.getElementById("pricingNoticeModal");
  const loginModal = document.getElementById("loginModal");

  function openPanel(panel) {
    closeAllPanels();
    backdrop.classList.add("is-visible");
    panel.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeAllPanels() {
    backdrop.classList.remove("is-visible");
    cartDrawer.classList.remove("is-open");
    quoteModal.classList.remove("is-open");
    pricingNoticeModal.classList.remove("is-open");
    loginModal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".js-open-drawer").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel(cartDrawer);
    })
  );
  document.querySelectorAll(".js-open-pricing-notice").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel(pricingNoticeModal);
    })
  );
  // Muestra el aviso de condiciones de precio una vez por sesión de navegación.
  const PRICING_NOTICE_KEY = "ip7_pricing_notice_seen";
  try {
    if (!sessionStorage.getItem(PRICING_NOTICE_KEY)) {
      setTimeout(() => openPanel(pricingNoticeModal), 900);
      sessionStorage.setItem(PRICING_NOTICE_KEY, "1");
    }
  } catch (e) {}
  // Todos los botones de WhatsApp van directo al ejecutivo de cuenta asignado.
  const whatsappGreeting = "Hola, vengo del catálogo de Siemens Energy y quisiera asesoría.";
  const whatsappLink = `https://wa.me/${ACCOUNT_EXECUTIVE.phone}?text=${encodeURIComponent(whatsappGreeting)}`;
  document.querySelectorAll(".js-open-whatsapp").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      window.open(whatsappLink, "_blank", "noopener");
    })
  );
  document.querySelectorAll(".js-close-panels").forEach((el) =>
    el.addEventListener("click", () => closeAllPanels())
  );
  backdrop.addEventListener("click", closeAllPanels);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllPanels();
  });

  document.getElementById("goToQuoteBtn").addEventListener("click", () => {
    openPanel(quoteModal);
  });

  /* ---------------------------------------------------------------------
     RESUMEN DE COTIZACIÓN + ENVÍO
     --------------------------------------------------------------------- */
  const quoteSummaryList = document.getElementById("quoteSummaryList");

  function renderQuoteSummary() {
    quoteSummaryList.innerHTML = "";
    const ids = Object.keys(cart);
    if (!ids.length) {
      quoteSummaryList.innerHTML = '<li class="quote-summary-empty">Aún no has seleccionado productos.</li>';
      return;
    }
    ids.forEach((id) => {
      const product = productById(id);
      if (!product) return;
      const qty = cart[id];
      const hasTiers = product.priceTiers && product.priceTiers.length;
      const unitPrice = pricesVisible() ? unitPriceFor(product, qty) : null;
      const priceText = (hasTiers && !pricesVisible())
        ? "🔒 Inicia sesión"
        : (unitPrice != null
            ? `${formatPrice(unitPrice * qty)} (${formatPrice(unitPrice)} c/u)`
            : "Cotización especial");
      const li = document.createElement("li");
      li.innerHTML = `<span>${product.name} <em style="color:var(--text-faint); font-style:normal;">(${product.code})</em> — ${qty.toLocaleString("es-CO")} und.</span><span>${priceText}</span>`;
      quoteSummaryList.appendChild(li);
    });
  }

  function buildQuotePayload(formData) {
    let grandTotal = 0;
    let hasQuoteOnlyItem = false;
    const productos = Object.keys(cart)
      .map((id) => {
        const p = productById(id);
        if (!p) return null;
        const cantidad = cart[id];
        const unitPrice = pricesVisible() ? unitPriceFor(p, cantidad) : null;
        if (unitPrice != null) grandTotal += unitPrice * cantidad;
        else hasQuoteOnlyItem = true;
        return { nombre: p.name, codigo: p.code, cantidad, unitPrice };
      })
      .filter(Boolean);

    const lineasProductos = productos
      .map((p) => {
        const precioTxt = p.unitPrice != null
          ? `${formatPrice(p.unitPrice)} c/u — total ${formatPrice(p.unitPrice * p.cantidad)}`
          : (pricesVisible() ? "cotización especial" : "precio a confirmar por el ejecutivo");
        return `• ${p.nombre} (${p.codigo}) — ${p.cantidad.toLocaleString("es-CO")} und. — ${precioTxt}`;
      })
      .join("\n");

    const totalTxt = !pricesVisible()
      ? "a confirmar por el ejecutivo"
      : formatPrice(grandTotal) + (hasQuoteOnlyItem ? " + ítems de cotización especial" : "");

    const mensaje =
      `Solicitud de cotización — Catálogo Siemens Energy\n\n` +
      `Comercial: ${ACCOUNT_EXECUTIVE.name}\n\n` +
      `Nombre: ${formData.nombre}\n` +
      `Empresa: ${formData.empresa}\n` +
      `Correo: ${formData.correo}\n` +
      `Teléfono: ${formData.telefono}\n` +
      `Ciudad: ${formData.ciudad || "-"}\n\n` +
      `Productos:\n${lineasProductos || "(sin productos seleccionados)"}\n\n` +
      `Valor total estimado: ${totalTxt}\n` +
      `(Precio de referencia: no incluye fletes ni costos adicionales. Incluye 1 logo, 1 tinta, 1 marca. Sujeto a disponibilidad de inventario. Estos valores son simulados — la cotización final será compartida por su ejecutivo asignado.)\n\n` +
      `Comentarios: ${formData.comentarios || "-"}`;

    return { ...formData, productos, mensaje };
  }

  function getFormData() {
    const form = document.getElementById("quoteForm");
    const fd = new FormData(form);
    return {
      nombre: fd.get("nombre") || "",
      empresa: fd.get("empresa") || "",
      correo: fd.get("correo") || "",
      telefono: fd.get("telefono") || "",
      ciudad: fd.get("ciudad") || "",
      comentarios: fd.get("comentarios") || "",
    };
  }

  function validateForm() {
    const form = document.getElementById("quoteForm");
    if (!form.reportValidity()) return false;
    if (cartCount() === 0) {
      showToast("Selecciona al menos un producto antes de enviar tu solicitud.");
      return false;
    }
    return true;
  }

  const quoteForm = document.getElementById("quoteForm");
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = buildQuotePayload(getFormData());
    // sendQuoteRequest(payload); // <- conecta aquí tu backend/API cuando esté listo
    const subject = encodeURIComponent("Solicitud de cotización — Catálogo Siemens Energy");
    const body = encodeURIComponent(payload.mensaje);
    window.location.href = `mailto:${ACCOUNT_EXECUTIVE.email}?cc=${CONFIG.quoteEmail}&subject=${subject}&body=${body}`;
    showToast(`Abriendo tu cliente de correo para enviar la solicitud a ${ACCOUNT_EXECUTIVE.name}…`);
  });

  document.getElementById("copyRequestBtn").addEventListener("click", async () => {
    if (!validateForm()) return;
    const payload = buildQuotePayload(getFormData());
    try {
      await navigator.clipboard.writeText(payload.mensaje);
      showToast("Solicitud copiada. Puedes pegarla donde prefieras enviarla.");
    } catch (e) {
      showToast("No se pudo copiar automáticamente. Selecciona el texto manualmente.");
    }
  });

  /* ---------------------------------------------------------------------
     TOAST
     --------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  /* ---------------------------------------------------------------------
     PRENDER / APAGAR LA LUZ (modo claro/oscuro, con temática de energía)
     --------------------------------------------------------------------- */
  const THEME_KEY = "ip7_theme";
  const themeToggle = document.getElementById("themeToggle");
  const themeToggleText = document.getElementById("themeToggleText");

  function applyTheme(theme) {
    // Evita que las transiciones de color queden "atascadas" al cambiar de tema.
    document.documentElement.classList.add("theme-switching");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.documentElement.classList.remove("theme-switching"));
    });

    // El hero usa el mismo video de fondo de día y de noche — el toggle de
    // luz solo cambia la paleta del resto del sitio (ver tokens en CSS).
    // El interruptor (SVG en el HTML) refleja el estado: "prendido" en modo
    // claro/día, "apagado" en modo oscuro/noche — la animación la hace el CSS.
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggle.classList.remove("lights-on");
      themeToggleText.textContent = "Prender la luz";
      themeToggle.setAttribute("aria-label", "Prender la luz");
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggle.classList.add("lights-on");
      themeToggleText.textContent = "Apagar la luz";
      themeToggle.setAttribute("aria-label", "Apagar la luz");
    }
  }

  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  /* ---------------------------------------------------------------------
     NAV MÓVIL
     --------------------------------------------------------------------- */
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    hamburger.classList.toggle("is-open", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen);
  });
  navLinks.querySelectorAll("[data-close]").forEach((a) =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      hamburger.classList.remove("is-open");
    })
  );

  /* ---------------------------------------------------------------------
     DESPLEGABLE "EXPLORAR PRODUCTOS" (hero) — catálogo + portafolios IP7
     --------------------------------------------------------------------- */
  const exploreDropdown = document.getElementById("exploreDropdown");
  const exploreDropdownToggle = document.getElementById("exploreDropdownToggle");
  if (exploreDropdown && exploreDropdownToggle) {
    const closeExploreDropdown = () => {
      exploreDropdown.classList.remove("is-open");
      exploreDropdownToggle.setAttribute("aria-expanded", "false");
    };
    exploreDropdownToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = exploreDropdown.classList.toggle("is-open");
      exploreDropdownToggle.setAttribute("aria-expanded", isOpen);
    });
    document.addEventListener("click", (e) => {
      if (!exploreDropdown.contains(e.target)) closeExploreDropdown();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeExploreDropdown();
    });
    exploreDropdown.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", closeExploreDropdown)
    );
  }

  /* ---------------------------------------------------------------------
     LOGIN / ACCESO — un solo usuario y clave (ver AUTH_* arriba)
     --------------------------------------------------------------------- */
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const accessToggles = document.querySelectorAll(".js-toggle-access");

  function refreshAccessUI() {
    const authed = isAuthed();
    document.body.classList.toggle("is-authed", authed);
    accessToggles.forEach((el) => {
      el.textContent = authed ? "Cerrar sesión" : "Acceder";
    });
  }

  function openLogin() {
    if (!loginForm) return;
    loginForm.reset();
    if (loginError) loginError.hidden = true;
    openPanel(loginModal);
    setTimeout(() => {
      const first = loginForm.querySelector('[name="usuario"]');
      if (first) first.focus();
    }, 120);
  }

  function refreshAfterAuthChange() {
    refreshAccessUI();
    renderCatalog();
    renderCartUI();
    applyFilters();
    // El catálogo se vuelve a construir para mostrar/ocultar precios; se marcan
    // las tarjetas como visibles de una vez para no repetir la animación de entrada.
    document.querySelectorAll(".card").forEach((c) => c.classList.add("in-view"));
  }

  function toggleAccess() {
    if (isAuthed()) {
      setAuthed(false);
      refreshAfterAuthChange();
      showToast("Sesión cerrada. Los precios vuelven a quedar ocultos.");
    } else {
      openLogin();
    }
  }
  accessToggles.forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      toggleAccess();
    })
  );

  // Los enlaces "iniciar sesión" dentro de las tarjetas se crean dinámicamente,
  // por eso se escuchan por delegación.
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".js-open-login");
    if (trigger) {
      e.preventDefault();
      openLogin();
    }
  });

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      const u = (fd.get("usuario") || "").trim();
      const p = (fd.get("clave") || "").trim();
      if (u === AUTH_USER && p === AUTH_PASS) {
        setAuthed(true);
        refreshAfterAuthChange();
        closeAllPanels();
        showToast("Acceso concedido. Ya puedes ver los precios.");
      } else if (loginError) {
        loginError.hidden = false;
      }
    });
  }

  /* ---------------------------------------------------------------------
     CARRUSEL "PRODUCTOS ADICIONALES TRABAJADOS"
     Avanza una foto a la izquierda cada 3 s, en bucle infinito. Pausa al
     pasar el mouse por encima y cuando la pestaña no está visible.
     Las fotos salen de assets/img/productos-adicionales/ numeradas
     01.jpg, 02.jpg, 03.jpg … SIN saltos: el carrusel prueba 01, 02, 03…
     y se detiene en el primer número que falte.
     --------------------------------------------------------------------- */
  (function initWorkedCarousel() {
    const wc = document.getElementById("workedCarousel");
    const track = document.getElementById("workedTrack");
    if (!wc || !track) return;

    const MAX_SLIDES = 99; // tope de seguridad
    const INTERVAL = 3000;
    const GAP = 20; // debe coincidir con el gap del CSS (.wc-track)
    const section = wc.closest("section");

    let idx = 0;
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      setup();
    }
    function probeNext() {
      idx += 1;
      if (idx > MAX_SLIDES) return finish();
      const n = String(idx).padStart(2, "0");
      const img = new Image();
      img.alt = "Producto trabajado " + idx;
      img.onload = () => {
        const slide = document.createElement("div");
        slide.className = "wc-slide";
        slide.appendChild(img);
        track.appendChild(slide);
        probeNext();
      };
      img.onerror = finish; // primer hueco -> fin de la lista
      img.src = "assets/img/productos-adicionales/" + n + ".jpg";
    }
    probeNext();

    function setup() {
      const viewport = wc.querySelector(".wc-viewport");
      const prevBtn = wc.querySelector(".wc-prev");
      const nextBtn = wc.querySelector(".wc-next");
      const count = track.querySelectorAll(".wc-slide").length;

      if (!count) {
        if (section) section.hidden = true;
        return;
      }

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const fits = track.scrollWidth <= viewport.clientWidth + 4;
      const DUR = 600;
      let animating = false;
      let timer = null;

      function step() {
        const first = track.querySelector(".wc-slide");
        return first ? first.getBoundingClientRect().width + GAP : 0;
      }
      // Avanza: la primera foto sale por la izquierda y se recicla al final.
      function goNext() {
        const d = step();
        if (animating || fits || !d) return;
        animating = true;
        track.style.transition = "transform " + DUR + "ms cubic-bezier(.4,0,.2,1)";
        track.style.transform = "translateX(-" + d + "px)";
        setTimeout(() => {
          track.style.transition = "none";
          track.appendChild(track.firstElementChild);
          track.style.transform = "translateX(0px)";
          void track.offsetWidth;
          animating = false;
        }, DUR + 30);
      }
      // Retrocede: la última foto entra desde la izquierda.
      function goPrev() {
        const d = step();
        if (animating || fits || !d) return;
        animating = true;
        track.style.transition = "none";
        track.insertBefore(track.lastElementChild, track.firstElementChild);
        track.style.transform = "translateX(-" + d + "px)";
        void track.offsetWidth;
        track.style.transition = "transform " + DUR + "ms cubic-bezier(.4,0,.2,1)";
        track.style.transform = "translateX(0px)";
        setTimeout(() => {
          track.style.transition = "none";
          track.style.transform = "translateX(0px)";
          animating = false;
        }, DUR + 30);
      }

      function start() {
        if (fits || reduce) return;
        stop();
        timer = setInterval(goNext, INTERVAL);
      }
      function stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      nextBtn.addEventListener("click", () => {
        goNext();
        start();
      });
      prevBtn.addEventListener("click", () => {
        goPrev();
        start();
      });
      wc.addEventListener("mouseenter", stop);
      wc.addEventListener("mouseleave", start);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else start();
      });

      if (fits) {
        prevBtn.hidden = true;
        nextBtn.hidden = true;
      }
      start();
    }
  })();

  /* ---------------------------------------------------------------------
     SCROLL REVEAL PARA LAS TARJETAS
     --------------------------------------------------------------------- */
  let cardObserver;
  function observeCards() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".card").forEach((c) => c.classList.add("in-view"));
      return;
    }
    if (cardObserver) cardObserver.disconnect();
    cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".card:not(.in-view)").forEach((c) => cardObserver.observe(c));
  }

  /* ---------------------------------------------------------------------
     CURSOR DECORATIVO (anillo verde energía que sigue el mouse — solo desktop)
     --------------------------------------------------------------------- */
  const cursorRing = document.getElementById("cursor-ring");
  const cursorDot = document.getElementById("cursor-dot");
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  if (finePointer && cursorRing && cursorDot) {
    let mouseX = -100,
      mouseY = -100;
    let ringX = -100,
      ringY = -100;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    const hoverSelector = 'a, button, .card, input, .pill, [role="button"]';
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverSelector)) cursorRing.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverSelector)) cursorRing.classList.remove("is-hover");
    });
  }

  /* ---------------------------------------------------------------------
     INIT
     --------------------------------------------------------------------- */
  refreshAccessUI();
  renderCatalog();
  renderCartUI();
  applyFilters();

  // Refuerzo por si el atributo autoplay no alcanza en algún navegador.
  const heroBgVideo = document.getElementById("heroBgVideo");
  if (heroBgVideo) heroBgVideo.play().catch(() => {});
});
