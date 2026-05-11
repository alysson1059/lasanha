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
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    updateDoc, 
    doc, 
    query, 
    where, 
    orderBy, 
    addDoc, 
    serverTimestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const perfilForm = document.getElementById('perfil-form');

let cart = JSON.parse(localStorage.getItem('casaLasanhaCart')) || [];
let currentCategory = "Promoções";
let storeConfigs = null;
let currentDeliveryFee = 0;
let gpsValidado = false; // Começa como falso

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
                        <img src="${product.image || 'placeholder.jpg'}" class="product-image-square">
                        <div style="padding: 15px;">
                            <h3 style="font-size: 1.1rem; color: #333;">${product.name}</h3>
                          <p style="font-size: 0.85rem; color: #777; margin: 5px 0;">${product.description || 'Saborosa e feita com ingredientes selecionados.'}</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                <div>
                                  ${product.onSale ? `
    <small style="text-decoration:line-through; color:red">
        R$ ${Number(product.price).toFixed(2)}
    </small><br>
    <span style="font-weight: bold; color: var(--vinho-logo);">
        R$ ${(Number(product.price) - (Number(product.price) * Number(product.discount) / 100)).toFixed(2)}
    </span>
` : `
    <span style="font-weight: bold; color: var(--vinho-logo);">
        R$ ${Number(product.price).toFixed(2)}
    </span>
`}
                                </div>
                              <button onclick="addToCart('${id}', '${product.name}', ${product.onSale ? (Number(product.price) - (Number(product.price) * Number(product.discount) / 100)) : product.price})"
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
   let totalComFrete = total + currentDeliveryFee; 
    totalPriceElement.innerText = `R$ ${totalComFrete.toFixed(2).replace('.', ',')}`;
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
// --- FINALIZAR NO WHATSAPP E SALVAR NO FIREBASE ---
const checkoutBtn = document.querySelector('.btn-checkout');

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
        const perfil = JSON.parse(localStorage.getItem('perfilCasaLasanha'));
        const metodoEnvio = document.getElementById('metodo-envio').value; // Pega se é entrega ou retirada

        // --- PASSO C: TRAVA DE SEGURANÇA ---
        // Se for entrega E o GPS não foi validado E não temos coordenadas salvas...
        if (metodoEnvio === 'entrega' && !gpsValidado && (!perfil || !perfil.lat)) {
            alert("⚠️ Atenção: Para pedidos de entrega, você precisa validar sua localização no 'Perfil' usando o botão GPS para calcularmos o frete corretamente.");
            
            // Leva o usuário automaticamente para a aba de Perfil para ele clicar no botão
            const navItems = document.querySelectorAll('.nav-item');
            trocarAba('aba-perfil', navItems[2]); 
            return; // Interrompe o envio do pedido aqui
        }

        // --- RESTANTE DO SEU CÓDIGO DE CHECKOUT (Pagamento, WhatsApp, Firebase...) ---
        const formaPagamento = document.getElementById('payment-method').value;
        const trocoPara = document.getElementById('troco-valor').value;

        // 1. Validações
        if (!perfil || !perfil.telefone || !perfil.rua || !perfil.numero) {
            alert("Por favor, preencha seu endereço e telefone no Perfil antes de pedir.");
            trocarAba('aba-perfil', document.querySelectorAll('.nav-item')[2]); 
            return;
        }

        if (cart.length === 0) return alert("Seu carrinho está vazio!");

        // 2. Cálculos
        let totalPedido = 0;
        cart.forEach(item => {
            totalPedido += item.price * item.quantity;
        });

        // 3. Validação do Troco
        if (formaPagamento === 'Dinheiro' && trocoPara) {
            const valorTrocoNum = parseFloat(trocoPara.replace(/\./g, "").replace(",", "."));
            if (valorTrocoNum <= totalPedido) {
                alert(`O valor para troco (R$ ${valorTrocoNum.toFixed(2).replace(".", ",")}) deve ser maior que o total do pedido!`);
                return;
            }
        }

        const enderecoCompleto = `${perfil.rua}, Nº ${perfil.numero}${perfil.cep ? ', CEP: ' + perfil.cep : ''} (${perfil.referencia || 'Sem ref.'})`;
        const resumoItens = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');

       try {
            // NOVO: Pega se o cliente escolheu entrega ou retirada no momento do clique
            const metodoEnvio = document.getElementById('metodo-envio').value;

            // 4. SALVA O PEDIDO NO FIREBASE (Atualizado com frete e método)
            await addDoc(collection(db, "pedidos"), {
                clienteNome: perfil.nome,
                telefoneCliente: perfil.telefone,
                endereco: enderecoCompleto,
                resumoItens: resumoItens,
                total: totalPedido + currentDeliveryFee, // Salva o total já com o frete
                metodo: metodoEnvio,                      // NOVO: Salva se é entrega ou retirada
                taxaEntrega: currentDeliveryFee,          // NOVO: Salva o valor do frete cobrado
                formaPagamento: formaPagamento,
                status: "pendente",
                data: serverTimestamp()
            });

            // 5. MONTA A MENSAGEM PARA WHATSAPP
            let message = `*Pedido Casa da Lasanha*\n\n`;
            message += `*Cliente:* ${perfil.nome}\n`;
            message += `*Telefone:* ${perfil.telefone}\n`;
            message += `*Endereço:* ${enderecoCompleto}\n`;
            message += `*Método:* ${metodoEnvio === 'entrega' ? 'Entrega em Casa' : 'Retirar no Local'}\n`;
            message += `*Pagamento:* ${formaPagamento}\n`;
            
            if (formaPagamento === 'Dinheiro' && trocoPara) {
                message += `*Troco para:* R$ ${parseFloat(trocoPara.replace(/\./g, "").replace(",", ".")).toFixed(2).replace(".", ",")}\n`;
            }
            
            message += `\n*ITENS DO PEDIDO:*\n`;
            cart.forEach(item => {
                message += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
            });
            message += `\n*TOTAL: R$ ${totalPedido.toFixed(2)}*`;

            // 6. ABRE WHATSAPP E LIMPA TUDO
            const phoneLoja = "5579996737203"; 
            window.open(`https://wa.me/${phoneLoja}?text=${encodeURIComponent(message)}`, '_blank');

            cart = [];
            updateCartUI();
            toggleCart();
            mostrarAviso("Pedido enviado!");

        } catch (error) {
            console.error("Erro ao salvar pedido:", error);
            alert("Erro ao enviar pedido para o sistema. Tente novamente.");
        }
    });
}

// --- FUNÇÕES DE INTERFACE E HISTÓRICO ---

window.toggleCart = () => {
    const modal = document.getElementById('cart-modal');

    if (modal) {
        modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';

        const metodoEnvio = document.getElementById('metodo-envio')?.value || 'entrega';

        toggleEntrega(metodoEnvio);
    }
};

function carregarHistoricoPedidos(telefone) {
    const listaHistorico = document.getElementById('lista-historico');
    if (!listaHistorico) return;

    if (!telefone) {
        listaHistorico.innerHTML = '<p style="text-align:center; margin-top: 50px; color: #777;">Digite seu telefone no perfil para ver seu histórico.</p>';
        return;
    }

    const q = query(
        collection(db, "pedidos"), 
        where("telefoneCliente", "==", telefone),
        orderBy("data", "desc")
    );

    onSnapshot(q, (snapshot) => {
        listaHistorico.innerHTML = '';
        
        if (snapshot.empty) {
            listaHistorico.innerHTML = `
                <div style="text-align:center; margin-top:50px; color:#aaa;">
                    <i class="fa-solid fa-receipt" style="font-size:3rem; opacity:0.2;"></i>
                    <p>Você ainda não tem pedidos realizados.</p>
                </div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const pedido = docSnap.data();
            const id = docSnap.id;
            const statusCor = pedido.status === 'cancelado' ? '#ff6b6b' : (pedido.status === 'finalizado' ? '#82c91e' : '#f39c12');
            const dataPedido = pedido.data ? new Date(pedido.data.seconds * 1000).toLocaleString() : 'Enviando...';

            listaHistorico.innerHTML += `
                <div class="admin-card" style="border-left: 5px solid ${statusCor}; margin-bottom: 10px; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong>Pedido #${id.slice(-5).toUpperCase()}</strong><br>
                            <small>${dataPedido}</small>
                        </div>
                        <span style="background: ${statusCor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; font-weight: bold;">
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
                </div>`;
        });
    });
}

window.cancelarPedido = async (id) => {
    if (confirm("Deseja realmente cancelar este pedido?")) {
        try {
            await updateDoc(doc(db, "pedidos", id), { status: 'cancelado' });
            mostrarAviso("Pedido cancelado.");
        } catch (error) {
            alert("Erro ao cancelar: " + error.message);
        }
    }
};

// --- FUNÇÃO PARA TROCAR AS ABAS (CARDÁPIO, PEDIDOS, PERFIL) ---
window.trocarAba = (idAba, elemento) => {
    // 1. Esconde todas as seções (sections) que têm a classe 'secao-aba'
    document.querySelectorAll('.secao-aba').forEach(aba => {
        aba.style.display = 'none';
    });

    // 2. Mostra apenas a aba que foi clicada
    const abaParaMostrar = document.getElementById(idAba);
    if (abaParaMostrar) {
        abaParaMostrar.style.display = 'block';
    }

    // 3. Gerencia a aparência dos botões no menu inferior (cor preta/cinza)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Se um elemento foi passado (o botão clicado), marca como ativo
    if (elemento) {
        elemento.classList.add('active');
    }

    // 4. Sobe a tela para o topo automaticamente
    window.scrollTo(0, 0);
};


// 1. Defina a função primeiro
function carregarDadosPerfil() {
    const dados = JSON.parse(localStorage.getItem('perfilCasaLasanha'));
    if (dados) {
        const nameField = document.getElementById('user-name');
        const phoneField = document.getElementById('user-phone');
        const streetField = document.getElementById('user-street');
        const numberField = document.getElementById('user-number');
        const cepField = document.getElementById('user-cep');
        const refField = document.getElementById('user-ref');

        if (nameField) nameField.value = dados.nome || '';
        if (phoneField) phoneField.value = dados.telefone || '';
        if (streetField) streetField.value = dados.rua || '';
        if (numberField) numberField.value = dados.numero || '';
        if (cepField) cepField.value = dados.cep || '';
        if (refField) refField.value = dados.referencia || '';
        
        if (dados.telefone) {
            carregarHistoricoPedidos(dados.telefone);
        }
    }
}

// 2. Depois configure o evento que vai chamar ela
document.addEventListener('DOMContentLoaded', () => {
    monitorStoreStatus();
    loadProducts("Promoções");
    updateCartUI(); 
    setupCategoryButtons();
    carregarDadosPerfil(); // Agora o JS já conhece a função acima
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

window.toggleEntrega = async (metodo) => {
    const infoRetirada = document.getElementById('info-retirada');
    const infoEntrega = document.getElementById('info-entrega');
    const enderecoLoja = document.getElementById('endereco-loja-exibicao');

    if (!storeConfigs) {
        const docSnap = await getDoc(doc(db, "configuracoes", "loja"));
        if (docSnap.exists()) {
            storeConfigs = docSnap.data();
        }
    }

    if (metodo === 'retirada') {
        currentDeliveryFee = 0;

        if (infoRetirada) infoRetirada.style.display = 'block';
        if (infoEntrega) infoEntrega.style.display = 'none';

        if (enderecoLoja) {
           enderecoLoja.innerText = storeConfigs?.storeVisibleAddress || 'Endereço da loja não cadastrado';
        }

        renderCartItems();
        return;
    }

    if (metodo === 'entrega') {
        if (infoRetirada) infoRetirada.style.display = 'none';
        if (infoEntrega) infoEntrega.style.display = 'block';

        calcularFreteAutomatico();
    }
};

function converterNumero(valor) {
    if (!valor) return 0;
    return parseFloat(String(valor).replace(',', '.')) || 0;
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // raio da Terra em KM

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

async function calcularFreteAutomatico() {
    if (!storeConfigs) {
        const docSnap = await getDoc(doc(db, "configuracoes", "loja"));
        if (docSnap.exists()) storeConfigs = docSnap.data();
    }

    const perfil = JSON.parse(localStorage.getItem('perfilCasaLasanha'));
    const textoFrete = document.getElementById('calculo-frete-texto');
    const enderecoLoja = document.getElementById('endereco-loja-exibicao');

    if (storeConfigs && enderecoLoja) {
       enderecoLoja.innerText = storeConfigs.storeVisibleAddress || 'Endereço não informado';
    }

    if (!storeConfigs || !perfil || !perfil.lat || !perfil.lng || !storeConfigs.storeLat || !storeConfigs.storeLng) {
        currentDeliveryFee = converterNumero(storeConfigs?.fixedValue);

        if (textoFrete) {
            textoFrete.innerText = `Taxa de Entrega: R$ ${currentDeliveryFee.toFixed(2).replace('.', ',')}`;
        }

        renderCartItems();
        return;
    }

  console.log("===== DEBUG FRETE =====");
console.log("Configurações da loja:", storeConfigs);
console.log("Lat loja:", storeConfigs.storeLat);
console.log("Lng loja:", storeConfigs.storeLng);

console.log("Perfil cliente:", perfil);
console.log("Lat cliente:", perfil.lat);
console.log("Lng cliente:", perfil.lng);
console.log("=======================");

    const distanciaKm = calcularDistanciaKm(
        Number(storeConfigs.storeLat),
        Number(storeConfigs.storeLng),
        Number(perfil.lat),
        Number(perfil.lng)
    );

    const freeKm = converterNumero(storeConfigs.freeKm);
    const valorPorKm = converterNumero(storeConfigs.kmValue);
    const taxaFixa = converterNumero(storeConfigs.fixedValue);

    let taxa = 0;

    if (distanciaKm <= freeKm) {
        taxa = 0;
    } else {
        const kmExtra = distanciaKm - freeKm;
        taxa = taxaFixa + (kmExtra * valorPorKm);
    }

    currentDeliveryFee = taxa;

    if (textoFrete) {
        textoFrete.innerText = taxa === 0
            ? `Entrega Grátis! Distância aproximada: ${distanciaKm.toFixed(1)} km`
            : `Taxa de Entrega: R$ ${taxa.toFixed(2).replace('.', ',')} | Distância aproximada: ${distanciaKm.toFixed(1)} km`;
    }

    renderCartItems();
}

// --- PASSO B: CAPTURAR LOCALIZAÇÃO E VALIDAR GPS ---
window.getUserLocation = () => {
    if ("geolocation" in navigator) {
        // Mostra um aviso de "carregando" enquanto busca o sinal
        mostrarAviso("Buscando sua localização...");

        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            
            // 1. Salva as coordenadas no Perfil do usuário (LocalStorage)
            const perfilAtual = JSON.parse(localStorage.getItem('perfilCasaLasanha')) || {};
            perfilAtual.lat = latitude;
            perfilAtual.lng = longitude;
            localStorage.setItem('perfilCasaLasanha', JSON.stringify(perfilAtual));

            // 2. Marca o GPS como validado para liberar o botão de finalizar
            gpsValidado = true;

            // 3. Esconde o aviso amarelo (se ele existir no HTML)
            const avisoGps = document.getElementById('aviso-gps-pendente');
            if (avisoGps) avisoGps.style.display = 'none';

            alert("Localização validada com sucesso! Agora você pode finalizar seu pedido.");
            
            // 4. Recalcula o frete automaticamente agora que temos o GPS
            calcularFreteAutomatico();
        }, (error) => {
            alert("Erro ao obter localização: " + error.message + ". Por favor, tente novamente.");
        });
    } else {
        alert("Seu navegador não suporta geolocalização.");
    }
};

