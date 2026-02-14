(function () {
  'use strict';

  let products = [];
  let clients = [];
  let clientCounter = 0;
  let currentClientId = null;

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => el.querySelectorAll(sel);

  const clientsGrid = $('#clients-grid');
  const totalValue = $('#total-value');
  const btnGeneratePdf = $('#btn-generate-pdf');
  const overlay = $('#persona-overlay');
  const overlayBackdrop = $('#overlay-backdrop');
  const overlayContent = $('#overlay-content');
  const personaName = $('#persona-name');
  const btnEditName = $('#btn-edit-name');
  const btnDelete = $('#btn-delete');
  const productList = $('#product-list');
  const personaTotalValue = $('#persona-total-value');
  const btnClose = $('#btn-close');

  function uuid() {
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getNextClientName() {
    clientCounter++;
    return 'Cliente ' + clientCounter;
  }

  function loadProducts() {
    return fetch('products.json')
      .then((r) => r.json())
      .then((data) => {
        products = data;
      })
      .catch((err) => {
        console.error('Errore caricamento prodotti:', err);
        products = [];
      });
  }

  function addClient() {
    const id = uuid();
    const order = {};
    products.forEach((p) => (order[p.id] = 0));
    clients.push({
      id,
      name: getNextClientName(),
      order,
    });
    renderHome();
    openOverlay(id);
  }

  function getClientById(id) {
    return clients.find((c) => c.id === id);
  }

  function getClientTotal(client) {
    return products.reduce((sum, p) => sum + (client.order[p.id] || 0) * p.price, 0);
  }

  function getGrandTotal() {
    return clients.reduce((sum, c) => sum + getClientTotal(c), 0);
  }

  function renderHome() {
    let html = '';

    clients.forEach((client) => {
      const total = getClientTotal(client);
      const items = products
        .filter((p) => (client.order[p.id] || 0) > 0)
        .map((p) => ({
          qty: client.order[p.id],
          name: p.name,
        }));

      html += `
        <article class="client-card" data-client-id="${client.id}">
          <h3 class="client-card-name">${escapeHtml(client.name)}</h3>
          <ul class="client-card-products">
            ${items.map((i) => `<li><span class="qty">${i.qty}x</span> ${escapeHtml(i.name)}</li>`).join('')}
          </ul>
          <div class="client-card-total">${total}€</div>
        </article>
      `;
    });

    html += `
      <div class="add-client-card" id="add-client-card">
        <span class="icon-plus">+</span>
      </div>
    `;

    clientsGrid.innerHTML = html;
    totalValue.textContent = getGrandTotal() + '€';

    $('#add-client-card').addEventListener('click', addClient);
    $$('.client-card[data-client-id]').forEach((card) => {
      card.addEventListener('click', () => openOverlay(card.dataset.clientId));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function openOverlay(clientId) {
    currentClientId = clientId;
    const client = getClientById(clientId);
    if (!client) return;

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');

    personaName.textContent = client.name;
    personaName.style.display = '';
    if ($('.persona-name-input')) {
      const inp = $('.persona-name-input');
      if (inp && inp.parentNode) inp.parentNode.removeChild(inp);
    }

    productList.innerHTML = products
      .map(
        (p) => `
      <li class="product-row" data-product-id="${p.id}">
        <div class="product-row-info">
          <span class="product-row-qty">${client.order[p.id] || 0}x</span>
          <span class="product-row-name">${escapeHtml(p.name)}</span>
          <span class="product-row-price">${p.price}€</span>
        </div>
        <div class="product-row-actions">
          <button type="button" class="btn-qty btn-minus" data-product-id="${p.id}">−</button>
          <button type="button" class="btn-qty btn-plus" data-product-id="${p.id}">+</button>
        </div>
      </li>
    `
      )
      .join('');

    productList.querySelectorAll('.btn-plus').forEach((btn) => {
      btn.addEventListener('click', () => updateQuantity(btn.dataset.productId, 1));
    });
    productList.querySelectorAll('.btn-minus').forEach((btn) => {
      btn.addEventListener('click', () => updateQuantity(btn.dataset.productId, -1));
    });

    updatePersonaTotal();
  }

  function updateQuantity(productId, delta) {
    const client = getClientById(currentClientId);
    if (!client) return;
    const current = client.order[productId] || 0;
    const next = Math.max(0, current + delta);
    client.order[productId] = next;

    const row = $(`.product-row[data-product-id="${productId}"]`);
    if (row) {
      row.querySelector('.product-row-qty').textContent = next + 'x';
      row.querySelector('.btn-minus').disabled = next === 0;
    }
    updatePersonaTotal();
    renderHome();
  }

  function updatePersonaTotal() {
    const client = getClientById(currentClientId);
    personaTotalValue.textContent = (client ? getClientTotal(client) : 0) + '€';
  }

  function closeOverlay() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    currentClientId = null;
  }

  function startEditName() {
    const client = getClientById(currentClientId);
    if (!client) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'persona-name-input';
    input.value = client.name;
    input.placeholder = 'Nome cliente';
    personaName.style.display = 'none';
    personaName.parentNode.insertBefore(input, personaName);
    input.focus();
    input.select();

    const finish = () => {
      const val = input.value.trim();
      if (val) client.name = val;
      input.parentNode.removeChild(input);
      personaName.textContent = client.name;
      personaName.style.display = '';
      renderHome();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
    });
  }

  function deleteClient() {
    const client = getClientById(currentClientId);
    if (!client) return;
    if (!confirm('Eliminare questo cliente?')) return;
    clients = clients.filter((c) => c.id !== currentClientId);
    closeOverlay();
    renderHome();
  }

  function generatePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(16);
    doc.text('Ordini', 14, 20);
    doc.setFontSize(10);
    doc.text(dateStr, 14, 28);

    let y = 40;
    let grandTotal = 0;

    clients.forEach((client) => {
      const total = getClientTotal(client);
      grandTotal += total;

      doc.setFont(undefined, 'bold');
      doc.text(client.name, 14, y);
      doc.setFont(undefined, 'normal');
      y += 6;

      products.forEach((p) => {
        const qty = client.order[p.id] || 0;
        if (qty > 0) {
          doc.text(`${qty}x ${p.name} - ${p.price}€`, 20, y);
          y += 5;
        }
      });

      doc.setFont(undefined, 'bold');
      doc.text('Totale: ' + total + '€', 20, y);
      doc.setFont(undefined, 'normal');
      y += 10;
    });

    doc.setFont(undefined, 'bold');
    doc.text('Totale generale: ' + grandTotal + '€', 14, y + 5);

    doc.save('ordini-' + now.toISOString().slice(0, 10) + '.pdf');
  }

  overlayBackdrop.addEventListener('click', closeOverlay);
  btnClose.addEventListener('click', closeOverlay);
  btnEditName.addEventListener('click', startEditName);
  btnDelete.addEventListener('click', deleteClient);
  btnGeneratePdf.addEventListener('click', generatePdf);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeOverlay();
  });

  loadProducts().then(() => {
    renderHome();
  });
})();
