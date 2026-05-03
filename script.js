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
import { getFirestore, collection, onSnapshot,updateDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const perfilForm = document.getElementById('perfil-form');

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
    
    // FEEDBACK VISUAL:
    mostrarAviso(`${name} adicionado!`);
    
    updateCartUI();
};

function mostrarAviso(texto) {
    const aviso = document.createElement('div');
    aviso.innerText = texto;
    aviso.style = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: var(--accent); color: white; padding: 10px 20px;
        border-radius: 50px; z-index: 3000; font-weight: bold;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2); animation: fadeInOut 2s forwards;
    `;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 2000);
}

function updateCartUI() {
    localStorage.setItem('casaLasanhaCart', JSON.stringify(cart));
    
    const btnFlutuante = document.getElementById('btn-carrinho-flutuante');
    const countElement = document.getElementById('cart-count');
    
    const totalItens = cart.reduce((total, item) => total + item.quantity, 0);

    if (countElement) {
        countElement.innerText = totalItens;
    }

    // MOSTRAR OU ESCONDER O BOTÃO FLUTUANTE
    if (btnFlutuante) {
        if (totalItens > 0) {
            btnFlutuante.style.display = 'flex'; // Aparece se tiver algo
        } else {
            btnFlutuante.style.display = 'none'; // Some se estiver vazio
        }
    }
    
    renderCartItems();
}

function renderCartItems() {
    const cartContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    if (!cartContainer || !totalPriceElement) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div style="text-align:center; margin-top:30px; color:#aaa;">
                <i class="fa-solid fa-cart-shopping" style="font-size:3rem; opacity:0.2;"></i>
                <p>Sua sacola está vazia</p>
            </div>`;
        totalPriceElement.innerText = 'R$ 0,00';
        return;
    }

    let total = 0;
    cartContainer.innerHTML = cart.map((item, index) => {
        total += item.price * item.quantity;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <div style="flex: 1;">
                    <strong style="display:block; color:#333;">${item.name}</strong>
                    <small style="color:var(--vinho-logo);">R$ ${(item.price * item.quantity).toFixed(2)}</small>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; background: #f8f9fa; padding: 5px 10px; border-radius: 50px;">
                    <button onclick="changeQuantity(${index}, -1)" style="background:none; border:none; color:var(--vinho-logo); cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-circle-minus"></i></button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.quantity}</span>
                    <button onclick="changeQuantity(${index}, 1)" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-circle-plus"></i></button>
                </div>

                <button onclick="removeItem(${index})" style="background:none; border:none; color:#e74c3c; margin-left:10px; cursor:pointer;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');
    totalPriceElement.innerText = `R$ ${total.toFixed(2)}`;
}

// Funções auxiliares para os botões da sacola
window.changeQuantity = (index, delta) => {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        removeItem(index);
    } else {
        updateCartUI();
    }
};

window.removeItem = (index) => {
    cart.splice(index, 1);
    updateCartUI();
};
// 3. FINALIZAR NO WHATSAPP (COM CORREÇÃO PARA O ERRO NULL)
// --- FINALIZAR NO WHATSAPP (CORRIGIDO) ---
const checkoutBtn = document.querySelector('.btn-checkout');

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        const perfil = JSON.parse(localStorage.getItem('perfilCasaLasanha'));
        
        // 1. Captura os valores dos campos de pagamento e troco
        const formaPagamento = document.getElementById('payment-method').value;
        const trocoPara = document.getElementById('troco-valor').value;

        // 2. Validação de perfil (campos obrigatórios)
        if (!perfil || !perfil.telefone || !perfil.rua || !perfil.numero) {
            alert("Por favor, preencha seu endereço e telefone no Perfil antes de pedir.");
            trocarAba('aba-perfil', document.querySelectorAll('.nav-item')[2]); 
            return;
        }

        // 3. Validação de carrinho vazio
        if (cart.length === 0) return alert("Seu carrinho está vazio!");

        // 4. Cálculo do valor total (Essencial para a validação do troco)
        let totalPedido = 0;
        cart.forEach(item => {
            totalPedido += item.price * item.quantity;
        });

        // 5. Validação do troco (se a forma de pagamento for Dinheiro)
        if (formaPagamento === 'Dinheiro' && trocoPara) {
           const valorTrocoNum = parseFloat(trocoPara.replace(/\./g, "").replace(",", "."));
          if (valorTrocoNum <= totalPedido) {
        alert(`O valor para troco (R$ ${valorTrocoNum.toFixed(2).replace(".", ",")}) deve ser maior que o total do pedido!`);
        return;
    }
}

        // 6. Montagem da mensagem (Declarada apenas UMA vez aqui)
        const enderecoCompleto = `${perfil.rua}, Nº ${perfil.numero}${perfil.cep ? ', CEP: ' + perfil.cep : ''} (${perfil.referencia || 'Sem ref.'})`;

        let message = `*Pedido Casa da Lasanha*\n\n`;
        message += `*Cliente:* ${perfil.nome}\n`;
        message += `*Telefone:* ${perfil.telefone}\n`;
        message += `*Endereço:* ${enderecoCompleto}\n`;
        message += `*Pagamento:* ${formaPagamento}\n`;
        
        if (formaPagamento === 'Dinheiro' && trocoPara) {
            message += `*Troco para:* R$ ${parseFloat(trocoPara).toFixed(2)}\n`;
        }
        
        message += `\n*ITENS DO PEDIDO:*\n`;
        
        cart.forEach(item => {
            message += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });

        message += `\n*TOTAL: R$ ${totalPedido.toFixed(2)}*`;

        // 7. Configuração do telefone da loja e abertura do WhatsApp
        const phoneLoja = "5579996737203"; 
        window.open(`https://wa.me/${phoneLoja}?text=${encodeURIComponent(message)}`, '_blank');

        // 8. Limpeza do carrinho e fechamento do modal
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

// --- GEOLOCALIZAÇÃO REVERSA (Transformar GPS em Rua) ---
window.getUserLocation = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Usando o OpenStreetMap (Gratuito) para buscar o endereço
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                
                if (data.address) {
                    document.getElementById('user-street').value = data.address.road || '';
                    document.getElementById('user-cep').value = data.address.postcode || '';
                    mostrarAviso("Localização aproximada carregada!");
                }
            } catch (error) {
                mostrarAviso("Erro ao converter localização.");
            }
        });
    }
};

// --- SALVAR E CARREGAR ---
function carregarDadosPerfil() {
    const dados = JSON.parse(localStorage.getItem('perfilCasaLasanha'));
    if (dados) {
        document.getElementById('user-name').value = dados.nome || '';
        document.getElementById('user-phone').value = dados.telefone || '';
        document.getElementById('user-street').value = dados.rua || '';
        document.getElementById('user-number').value = dados.numero || '';
        document.getElementById('user-cep').value = dados.cep || '';
        document.getElementById('user-ref').value = dados.referencia || '';
    }
}

document.getElementById('perfil-form').onsubmit = (e) => {
    e.preventDefault();
    
    const telefone = document.getElementById('user-phone').value;
    
    // Validação: Um telefone formatado (XX) XXXXX-XXXX tem entre 14 e 15 caracteres
    if (telefone.length < 14) {
        alert("Por favor, insira o número de WhatsApp completo com DDD.");
        return;
    }

    const perfil = {
        nome: document.getElementById('user-name').value,
        telefone: telefone,
        rua: document.getElementById('user-street').value,
        numero: document.getElementById('user-number').value,
        cep: document.getElementById('user-cep').value,
        referencia: document.getElementById('user-ref').value
    };
    
    localStorage.setItem('perfilCasaLasanha', JSON.stringify(perfil));
    carregarHistoricoPedidos(perfil.telefone); 
    mostrarAviso("Perfil Salvo!");
};


// FUNÇÃO PARA TROCAR AS ABAS
window.trocarAba = (idAba, elemento) => {
    // 1. Esconde todas as seções
    document.querySelectorAll('.secao-aba').forEach(aba => {
        aba.style.display = 'none';
    });

    // 2. Mostra a aba clicada
    document.getElementById(idAba).style.display = 'block';

    // 3. Muda a cor do ícone no menu inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    elemento.classList.add('active');

    // 4. Se mudar de aba, sobe para o topo da página
    window.scrollTo(0, 0);
};

function carregarHistoricoPedidos(telefone) {
    const listaHistorico = document.getElementById('lista-historico');
    if (!telefone || !listaHistorico) return;

    // Filtra pedidos onde o telefone do cliente é igual ao salvo no perfil
    const q = query(
        collection(db, "pedidos"), 
        where("telefoneCliente", "==", telefone),
        orderBy("data", "desc")
    );

    onSnapshot(q, (snapshot) => {
        listaHistorico.innerHTML = '';
        
        if (snapshot.empty) {
            listaHistorico.innerHTML = '<p style="text-align:center;">Nenhum pedido encontrado para este número.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const pedido = docSnap.data();
            const id = docSnap.id;
            const statusCor = pedido.status === 'cancelado' ? '#ff6b6b' : (pedido.status === 'finalizado' ? '#82c91e' : '#f39c12');

            listaHistorico.innerHTML += `
                <div class="admin-card" style="border-left: 5px solid ${statusCor}; margin-bottom: 10px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong>Pedido #${id.slice(-5)}</strong><br>
                            <small>${new Date(pedido.data.seconds * 1000).toLocaleString()}</small>
                        </div>
                        <span style="background: ${statusCor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase;">
                            ${pedido.status}
                        </span>
                    </div>
                    <p style="font-size: 0.85rem; margin: 10px 0;">${pedido.resumoItens}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>Total: R$ ${pedido.total.toFixed(2)}</strong>
                        ${pedido.status === 'pendente' ? `
                            <button onclick="cancelarPedido('${id}')" style="background:none; border:none; color:red; cursor:pointer; font-size: 0.8rem;">
                                <i class="fa-solid fa-trash"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    });
}

// Função para o usuário deletar/cancelar o pedido se estiver pendente
window.cancelarPedido = async (id) => {
    if (confirm("Deseja realmente cancelar este pedido?")) {
        try {
            await updateDoc(doc(db, "pedidos", id), { status: 'cancelado' });
            alert("Pedido cancelado.");
        } catch (error) {
            alert("Erro ao cancelar: " + error.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    monitorStoreStatus();
    loadProducts("Promoções");
    updateCartUI(); 
    setupCategoryButtons();
    carregarDadosPerfil(); // <--- NÃO ESQUEÇA ESTA
});

window.maskPhone = (input) => {
    let value = input.value.replace(/\D/g, ""); // Remove tudo que não é número
    
    if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos

    // Aplica a formatação (XX) XXXXX-XXXX
    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{4,5})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (value.length > 0) {
        value = value.replace(/^(\d*)/, "($1");
    }
    
    input.value = value;
};
// Monitora a mudança na forma de pagamento
document.addEventListener('change', (e) => {
    if (e.target.id === 'payment-method') {
        const trocoContainer = document.getElementById('troco-container');
        if (e.target.value === 'Dinheiro') {
            trocoContainer.style.display = 'block';
        } else {
            trocoContainer.style.display = 'none';
            document.getElementById('troco-valor').value = ''; // Limpa o valor se mudar de ideia
        }
    }
});

window.maskMoney = (input) => {
    let value = input.value.replace(/\D/g, ""); // Remove tudo que não é número
    
    // Converte para decimal (ex: 500 vira 5.00)
    value = (value / 100).toFixed(2) + "";
    
    // Troca o ponto por vírgula para o padrão brasileiro
    value = value.replace(".", ",");
    
    // Adiciona separador de milhar se necessário
    value = value.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
    value = value.replace(/(\d)(\d{3}),/g, "$1.$2,");
    
    input.value = value;
};

