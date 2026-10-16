/* ==========================================================================
   CONFIGURACIÓN — edita estos datos con la información real de tu equipo
   ========================================================================== */
const CONFIG = {
  // Correo donde deben llegar las solicitudes de cotización (con copia).
  quoteEmail: "ejecutivo.comercial3@ip7.com.co",
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
    // Prendas (no gorras): enlace a la guía de tallas junto a las características.
    if (product.category === "vestuario" && !/^gorra/.test(product.id)) {
      const sizeLink = document.createElement("button");
      sizeLink.type = "button";
      sizeLink.className = "size-link js-open-size-guide";
      sizeLink.textContent = "📏 Ver guía de tallas";
      featuresEl.insertAdjacentElement("afterend", sizeLink);
    }
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

      const sizeBtn = cat.slug === "vestuario"
        ? '<button type="button" class="size-guide-btn js-open-size-guide">📏 Guía de tallas</button>'
        : "";
      section.innerHTML = `
        <div class="category-block-head">
          <div class="category-block-title">
            <h3>${cat.label}</h3>
            ${sizeBtn}
          </div>
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
  const sizeGuideModal = document.getElementById("sizeGuideModal");

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
    sizeGuideModal.classList.remove("is-open");
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
      `(Precio de referencia: no incluye IVA, fletes ni costos adicionales. Incluye 1 logo, 1 tinta, 1 marca. Sujeto a disponibilidad de inventario. Estos valores son simulados — la cotización final será compartida por su ejecutivo asignado.)\n\n` +
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
  const heroBgVideo = document.getElementById("heroBgVideo");

  // Hero: el globo 3D (WebGL) muestra la Tierra de día y de noche. Solo si WebGL no está
  // disponible ("failed") se usan los respaldos: foto fija de día y video de noche.
  // El video únicamente se reproduce en ese caso (así no gasta datos ni batería).
  let heroGLState = "pending"; // pending | ready | failed
  function syncHeroMedia(isDark) {
    if (!heroBgVideo) return;
    if (isDark && heroGLState === "failed") heroBgVideo.play().catch(() => {});
    else heroBgVideo.pause();
  }

  // El giro de día oscila alrededor del centro del globo de la foto (círculo ajustado al
  // borde del planeta: centro (502, 926), radio 635 sobre una imagen de 1023 x 612 px).
  const heroEl = document.querySelector(".hero");
  const heroDaySpin = document.getElementById("heroDaySpin");
  function layoutHeroDay() {
    if (!heroEl || !heroDaySpin) return;
    const IW = 1023, IH = 612, POS_Y = 0.32; // POS_Y = object-position vertical (center 32%)
    const w = heroEl.clientWidth, h = heroEl.clientHeight;
    const scale = Math.max(w / IW, h / IH);
    const offX = (w - IW * scale) / 2;
    const offY = (h - IH * scale) * POS_Y;
    const ox = offX + 502 * scale, oy = offY + 926 * scale;
    heroDaySpin.style.transformOrigin = ox + "px " + oy + "px";

    // Zoom mínimo (aplicado al centro del hero) para que, al girar ±1.6° alrededor del
    // globo, la imagen siempre cubra todo el hero sin dejar bordes vacíos.
    const th = (1.6 * Math.PI) / 180;
    const hx = w / 2, hy = h / 2;
    let s = 1.02;
    for (; s < 1.8; s += 0.01) {
      let ok = true;
      [-1, 1].forEach((sign) => {
        const c = Math.cos(sign * th), sn = Math.sin(sign * th);
        [[0, 0], [w, 0], [0, h], [w, h]].forEach(([px, py]) => {
          const dx = px - ox, dy = py - oy;
          const rx = ox + dx * c - dy * sn, ry = oy + dx * sn + dy * c; // esquina girada
          const qx = hx + (rx - hx) / s, qy = hy + (ry - hy) / s;       // deshacer el zoom
          if (qx < 0 || qx > w || qy < 0 || qy > h) ok = false;
        });
      });
      if (ok) break;
    }
    heroDaySpin.style.setProperty("--hd-scale", (s + 0.015).toFixed(3));
  }
  layoutHeroDay();
  window.addEventListener("resize", layoutHeroDay);

  // Globo 3D (WebGL puro, sin librerías): esfera con texturas de la NASA ("Blue Marble" de día,
  // luces de ciudades de noche), nubes procedurales y atmósfera. Gira de oeste a este de forma
  // continua y el mismo globo sirve para los dos temas (se funde entre uno y otro). Si WebGL o la
  // textura fallan, de día queda la foto fija (oscilación CSS) y de noche el video.
  function initHeroGL() {
    const wrap = document.getElementById("heroDay");
    const canvas = document.getElementById("heroDayGL");
    if (!wrap || !canvas || !heroEl) { heroGLState = "failed"; return; }
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) { heroGLState = "failed"; return; }

    const VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    const FS = `
      precision highp float;
      uniform vec2 uRes;      // tamaño del canvas en px
      uniform vec2 uCenter;   // centro del globo en px (origen arriba-izquierda)
      uniform float uR;       // radio en px
      uniform float uLon;     // longitud (rad) bajo el centro del disco
      uniform float uCloud;   // desfase de las nubes (rad)
      uniform float uNight;   // 0 = día, 1 = noche (se anima al cambiar de tema)
      uniform sampler2D uTexDay;
      uniform sampler2D uTexNight;
      const float PI = 3.14159265;
      const float LAT0 = 0.0;  // latitud bajo el centro del disco (inclinación de cámara)

      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vnoise(vec3 x){
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main(){
        vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
        vec2 q = (frag - uCenter) / uR; q.y = -q.y;       // y hacia arriba, radio = 1
        float d = length(q);

        // ---- fondo ----
        float h = clamp(frag.y / max(uCenter.y - uR, 1.0), 0.0, 1.0);
        vec3 skyDay = mix(vec3(0.34, 0.60, 0.78), vec3(0.50, 0.73, 0.88), smoothstep(0.0, 1.0, h));
        float over = max(d - 1.0, 0.0);
        vec3 colDay = mix(skyDay, vec3(0.74, 0.90, 0.97), exp(-over * 9.0) * 0.85);

        vec3 colNight = mix(vec3(0.012, 0.006, 0.030), vec3(0.020, 0.030, 0.085), smoothstep(0.0, 1.0, h));
        vec2 cell = floor(frag / 2.0);                    // estrellas
        float st = h2(cell);
        colNight += step(0.9975, st) * (0.35 + 0.65 * h2(cell + 3.7)) * vec3(0.8, 0.85, 1.0) * smoothstep(1.0, 1.04, d);
        colNight += vec3(0.16, 0.42, 1.0) * (exp(-over * 38.0) * 0.55 + exp(-over * 9.0) * 0.16);

        if (d < 1.0) {
          float z = sqrt(1.0 - d * d);
          vec3 n = vec3(q, z);
          // de coordenadas de cámara a mundo (norte = +y), inclinando LAT0
          float cl = cos(LAT0), sl = sin(LAT0);
          vec3 w = vec3(n.x, n.y * cl + n.z * sl, n.z * cl - n.y * sl);
          float lat = asin(clamp(w.y, -1.0, 1.0));
          float lon = atan(w.x, w.z) + uLon;
          vec2 uv = vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 - lat / PI);

          // nubes que giran un poco distinto al suelo
          float ca = uCloud, cc = cos(ca), cs = sin(ca);
          vec3 cp = vec3(cc * w.x + cs * w.z, w.y, -cs * w.x + cc * w.z);
          float c = fbm(cp * 3.2 + vec3(0.0, 0.0, 4.0));
          c += 0.35 * (fbm(cp * 7.0) - 0.5);
          float cloud = smoothstep(0.52, 0.80, c);

          float edge = smoothstep(1.0, 1.0 - 2.5 / uR, d);
          float fr = pow(1.0 - z, 2.6);

          if (uNight < 0.999) {
            vec3 land = texture2D(uTexDay, uv).rgb;
            land = pow(land, vec3(0.92)) * 1.08;
            vec3 L = normalize(vec3(-0.45, 0.55, 0.70));
            float lit = 0.62 + 0.55 * max(dot(n, L), 0.0);
            vec3 surf = mix(land, vec3(1.0), cloud * 0.85) * lit;
            surf = mix(surf, vec3(0.50, 0.76, 1.0), fr * 0.80);
            surf += vec3(0.30, 0.50, 0.72) * pow(1.0 - z, 5.0) * 0.8;
            colDay = mix(colDay, surf, edge);
          }
          if (uNight > 0.001) {
            vec3 lights = texture2D(uTexNight, uv).rgb;
            // resplandor: se promedian vecinos para que cada ciudad "sangre" luz alrededor
            vec2 o = vec2(3.0 / 4096.0, 3.0 / 2048.0);
            vec3 bloom = texture2D(uTexNight, uv + vec2(o.x, 0.0)).rgb + texture2D(uTexNight, uv - vec2(o.x, 0.0)).rgb
                       + texture2D(uTexNight, uv + vec2(0.0, o.y)).rgb + texture2D(uTexNight, uv - vec2(0.0, o.y)).rgb;
            // en esta textura el suelo es azul-verdoso y las luces son cálidas: el canal rojo las aísla
            float lr = max(lights.r - 0.07, 0.0) + max(bloom.r * 0.45 - 0.03, 0.0);
            vec3 glow = vec3(1.0, 0.60, 0.20) * pow(lr, 0.75) * 2.7;      // dorado cálido
            glow += vec3(1.0, 0.80, 0.45) * smoothstep(0.55, 1.0, lr) * 0.6;
            glow += lights.gb.xxy * vec3(0.0, 0.10, 0.20) * 0.7;           // pista tenue de continentes
            glow *= (1.0 - cloud * 0.55);                  // las nubes tapan algo de luz
            glow *= 1.25 - 0.35 * fr;                      // se apagan hacia el borde
            // luz de luna / amanecer: el borde superior del planeta recibe luz azul
            float up = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 base = vec3(0.006, 0.014, 0.042) + vec3(0.014, 0.034, 0.085) * up;
            base += vec3(0.10, 0.17, 0.30) * cloud * smoothstep(0.35, 1.0, up) * 0.7;
            vec3 surf = base + glow;
            surf += vec3(0.12, 0.40, 1.0) * pow(1.0 - z, 3.0) * (0.55 + 0.9 * up);
            surf += vec3(0.25, 0.55, 1.0) * pow(1.0 - z, 8.0) * 1.1;
            colNight = mix(colNight, surf, edge);
          }
        }
        gl_FragColor = vec4(mix(colDay, colNight, uNight), 1.0);
      }`;

    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { heroGLState = "failed"; return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { heroGLState = "failed"; return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes"), uCenter = U("uCenter"), uR = U("uR"), uLon = U("uLon"),
          uCloud = U("uCloud"), uNight = U("uNight");
    gl.uniform1i(U("uTexDay"), 0);
    gl.uniform1i(U("uTexNight"), 1);

    const DEG = Math.PI / 180;
    const LON0 = 60 * DEG;        // Europa / Medio Oriente / Asia al inicio
    const SPIN = 1.6 * DEG;       // grados por segundo (oeste → este)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDarkNow = () => document.documentElement.getAttribute("data-theme") === "dark";
    let running = false, visible = true, raf = 0;
    let elapsed = 0, t0 = performance.now(), last = 0;
    let mix = isDarkNow() ? 1 : 0;           // 0 día … 1 noche
    const loaded = { day: false, night: false };

    // Mismo encuadre que la foto fija: centro (502, 926) y radio 635 en una imagen de 1023 x 612.
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = heroEl.clientWidth, h = heroEl.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const IW = 1023, IH = 612, POS_Y = 0.32;
      const k = Math.max(w / IW, h / IH);
      const offX = (w - IW * k) / 2, offY = (h - IH * k) * POS_Y;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uCenter, (offX + 502 * k) * dpr, (offY + 926 * k) * dpr);
      gl.uniform1f(uR, 635 * k * dpr);
      draw(running ? performance.now() - t0 : elapsed);
    }
    function draw(ms) {
      const s = ms / 1000;
      gl.uniform1f(uLon, LON0 - s * SPIN);
      gl.uniform1f(uCloud, -s * SPIN * 0.35);
      gl.uniform1f(uNight, mix);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function frame(now) {
      raf = 0;
      if (!running) return;
      const target = isDarkNow() ? 1 : 0;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (mix !== target) mix = target > mix ? Math.min(target, mix + dt / 0.7) : Math.max(target, mix - dt / 0.7);
      draw(now - t0);
      raf = requestAnimationFrame(frame);
    }
    function isReady() { return isDarkNow() ? loaded.night : loaded.day; }
    // Se anima solo cuando se ve (pestaña activa y hero en pantalla); al reanudar continúa
    // desde donde quedó el giro, sin saltos.
    function update() {
      const ready = isReady();
      if (ready && heroGLState !== "ready") {
        heroGLState = "ready";
        heroEl.classList.add("gl-ready");
        wrap.classList.add("gl-ready");
        syncHeroMedia(isDarkNow());
        resize();
      }
      const want = ready && visible && !document.hidden && !reduced;
      if (want && !running) { running = true; last = 0; t0 = performance.now() - elapsed; raf = requestAnimationFrame(frame); }
      else if (!want && running) { elapsed = performance.now() - t0; running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
      if (!running && ready) { mix = isDarkNow() ? 1 : 0; draw(elapsed); }   // sin animación: cambio directo
    }

    function loadTex(unit, name, key) {
      const tex = gl.createTexture();
      const img = new Image();
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        loaded[key] = true;
        update();
      };
      img.onerror = () => {
        // sin la textura del tema activo no hay globo: se vuelve al respaldo (foto / video)
        if (heroGLState !== "ready" && (isDarkNow() === (key === "night"))) {
          heroGLState = "failed";
          syncHeroMedia(isDarkNow());
        }
      };
      img.src = "assets/img/brand/" + name;
    }
    // Primero la textura del tema activo; la otra se pide después, sin competir con la primera.
    const first = isDarkNow() ? ["night", 1, "earth-night.jpg"] : ["day", 0, "earth-blue-marble.jpg"];
    const second = isDarkNow() ? ["day", 0, "earth-blue-marble.jpg"] : ["night", 1, "earth-night.jpg"];
    loadTex(first[1], first[2], first[0]);
    window.addEventListener("load", () => setTimeout(() => loadTex(second[1], second[2], second[0]), 400));

    window.addEventListener("resize", () => { if (isReady()) resize(); });
    document.addEventListener("visibilitychange", update);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => { visible = e[0].isIntersecting; update(); }).observe(heroEl);
    }
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  initHeroGL();

  function applyTheme(theme) {
    // Evita que las transiciones de color queden "atascadas" al cambiar de tema.
    document.documentElement.classList.add("theme-switching");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.documentElement.classList.remove("theme-switching"));
    });

    // El interruptor (SVG en el HTML) refleja el estado: "prendido" en modo
    // claro/día, "apagado" en modo oscuro/noche — la animación la hace el CSS.
    syncHeroMedia(theme === "dark");
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

  // Los enlaces de "guía de tallas" también se crean dinámicamente (catálogo).
  document.addEventListener("click", (e) => {
    if (e.target.closest(".js-open-size-guide")) {
      e.preventDefault();
      openPanel(sizeGuideModal);
    }
  });

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
});
