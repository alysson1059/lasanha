// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDAafuO1j1Wy2-yXytXA4U8bbtmjyUL6UQ",
  authDomain: "casa-da-lasanha-421c7.firebaseapp.com",
  projectId: "casa-da-lasanha-421c7",
  storageBucket: "casa-da-lasanha-421c7.firebasestorage.app",
  messagingSenderId: "77119265150",
  appId: "1:77119265150:web:d9766389b5551cf28abb2f"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cart = JSON.parse(localStorage.getItem('casaLasanhaCart')) || [];
let currentCategory = "Promoções";

function monitorStoreStatus() {
    const statusText = document.getElementById('store-status'); // Verifique se o ID no HTML é este
    
    if (!statusText) return;

    // Escuta em tempo real o documento de configurações que você criou
    onSnapshot(doc(db, "configuracoes", "loja"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (data.status === "open") {
                statusText.innerHTML = '<i class="fa-solid fa-circle" style="color: #82c91e; font-size: 0.7rem;"></i> Aberto Agora';
                statusText.className = "status open";
            } else {
                statusText.innerHTML = '<i class="fa-solid fa-circle" style="color: #ff6b6b; font-size: 0.7rem;"></i> Fechado no Momento';
                statusText.className = "status closed";
            }
        } else {
            // Caso o documento ainda não exista no Firebase
            statusText.innerText = "Status Indisponível";
        }
    });
}

// 1. ESCUTAR PRODUTOS EM TEMPO REAL
function loadProducts(categoryFilter = "Promoções") {
    const q = collection(db, "produtos");
    
    onSnapshot(q, (snapshot) => {
        const productsList = document.getElementById('products-list');
        if (!productsList) return;
        
        productsList.innerHTML = ''; 
        let hasItems = false;

        snapshot.forEach((doc) => {
            const product = doc.data();
            const id = doc.id;

            // LÓGICA DE FILTRO
            // Se for a aba 'Promoções', mostra só quem tem onSale: true
            // Se for outra aba, mostra se a categoria bater
            const matchPromo = (categoryFilter === "Promoções" && product.onSale === true);
            const matchCat = (product.category === categoryFilter);

            if (product.available !== false && (matchPromo || matchCat)) {
                hasItems = true;
                const productCard = `
                    <div class="product-card" style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <img src="${product.image || 'placeholder.jpg'}" style="width: 100%; height: 180px; object-fit: cover;">
                        <div style="padding: 15px;">
                            <h3 style="font-size: 1.1rem; color: #333;">${product.name}</h3>
                            <p style="font-size: 0.85rem; color: #777; margin: 5px 0;">${product.description}</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                <div>
                                   ${product.onSale ? `<small style="text-decoration:line-through; color:red">R$ ${(Number(product.price) / (1 - (Number(product.discount)/100))).toFixed(2)}</small><br>` : ''}
                                    <span style="font-weight: bold; color: var(--vinho-logo);">R$ ${parseFloat(product.price).toFixed(2)}</span>
                                </div>
                                <button onclick="addToCart('${id}', '${product.name}', ${product.price})" 
                                    style="background: var(--accent); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                productsList.innerHTML += productCard;
            }
        });

        // AVISO SE NÃO TIVER ITENS
        if (!hasItems) {
            productsList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #777;">
                    <i class="fa-solid fa-utensils" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.2;"></i>
                    <p>No momento não temos itens em <strong>${categoryFilter}</strong>.</p>
                </div>
            `;
        }
    });
}

// 2. LOGICA DOS BOTÕES DE CATEGORIA
// Crie esta função para configurar os cliques
function setupCategoryButtons() {
    const buttons = document.querySelectorAll('.cat-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 1. Muda a aparência (cor do botão)
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // 2. Pega o texto do botão (ex: "Lasanhas") e filtra
            const selectedCat = e.currentTarget.innerText;
            loadProducts(selectedCat);
        });
    });
}
// 2. LÓGICA DO CARRINHO
window.addToCart = (id, name, price) => {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    updateCartUI();
};

function updateCartUI() {
    localStorage.setItem('casaLasanhaCart', JSON.stringify(cart));
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        countElement.innerText = count;
    }
    renderCartItems();
}

function renderCartItems() {
    const cartContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    if (!cartContainer || !totalPriceElement) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        totalPriceElement.innerText = 'R$ 0,00';
        return;
    }

    let total = 0;
    cartContainer.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <span>${item.quantity}x ${item.name}</span>
                <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
    }).join('');
    totalPriceElement.innerText = `R$ ${total.toFixed(2)}`;
}

// 3. FINALIZAR NO WHATSAPP (COM CORREÇÃO PARA O ERRO NULL)
const checkoutBtn = document.querySelector('.btn-checkout');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert("Seu carrinho está vazio!");
        let message = "*Pedido Casa da Lasanha*\n\n";
        let total = 0;
        cart.forEach(item => {
            message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
            total += item.price * item.quantity;
        });
        message += `\n*Total: R$ ${total.toFixed(2)}*`;
        const phone = "5579991089557"; 
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        cart = [];
        updateCartUI();
        toggleCart();
    });
}

window.toggleCart = () => {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
        renderCartItems();
    }
};

// Inicializar tudo
document.addEventListener('DOMContentLoaded', () => {
    monitorStoreStatus();
    loadProducts("Promoções"); // Inicia mostrando as promoções
    updateCartUI();            // Atualiza o carrinho (se tiver algo salvo)
    setupCategoryButtons();    // Ativa os cliques nos botões
});
