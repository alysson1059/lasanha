import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    setDoc, 
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDAafuO1j1Wy2-yXytXA4U8bbtmjyUL6UQ",
    authDomain: "casa-da-lasanha-421c7.firebaseapp.com",
    projectId: "casa-da-lasanha-421c7",
    storageBucket: "casa-da-lasanha-421c7.firebasestorage.app",
    messagingSenderId: "77119265150",
    appId: "1:77119265150:web:d9766389b5551cf28abb2f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFub2tlZmYiLCJhIjoiY21wYTY1eHpkMHZkNjJ0b280b2xyYmZmeiJ9.jpj9V94TBtGVzghcmAQu4A";

async function iniciarAuthAdmin() {
    await setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
            loadStoreConfigs();
        } else {
            document.getElementById('login-overlay').style.display = 'flex';
            document.getElementById('admin-content').style.display = 'none';
        }
    });
}

iniciarAuthAdmin();

window.logoutAdmin = async () => {
    await signOut(auth);
};

// --- 1. CONTROLE DE ACESSO ---
const loginBtn = document.getElementById('btn-login');
if (loginBtn) {
   loginBtn.onclick = async () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-password').value;

    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        alert("Erro ao acessar: " + err.message);
    }
};
}

// Função para trocar as abas do Painel
window.trocarAbaAdmin = (idAba, btn) => {
    document.querySelectorAll('.secao-admin').forEach(s => s.style.display = 'none');
    document.getElementById(idAba).style.display = 'block';
    document.querySelectorAll('.btn-nav-admin').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

// --- 2. CONFIGURAÇÕES DE FRETE E STATUS DA LOJA ---

let storeLat = null;
let storeLng = null;
let pedidosConhecidos = new Set();
let primeiraCargaPedidos = true;
let alarmePedidoAtivo = false;

function pedirPermissaoNotificacao() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function tocarSomNovoPedido() {
    const audio = document.getElementById("som-novo-pedido");

    if (!audio) return;

    audio.currentTime = 0;
    audio.loop = true;

    audio.play().catch(() => {
        console.log("O navegador bloqueou o som até haver interação do usuário.");
    });

    alarmePedidoAtivo = true;
}

function pararSomNovoPedido() {
    const audio = document.getElementById("som-novo-pedido");

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    alarmePedidoAtivo = false;
}

function mostrarNotificacaoNovoPedido(pedido) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification("Novo pedido recebido!", {
            body: `${pedido.clienteNome || "Cliente"} - R$ ${Number(pedido.total || 0).toFixed(2)}`,
            icon: "icon-192.png"
        });
    }
}

document.addEventListener("click", pedirPermissaoNotificacao, { once: true });


// --- CARREGAR CONFIGURAÇÕES AO INICIAR ---
async function loadStoreConfigs() {
    try {
        const docRef = doc(db, "configuracoes", "loja");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('store-status-select').value = data.status || 'closed';
            document.getElementById('store-address').value = data.address || '';
            document.getElementById('store-number').value = data.storeNumber || '';
            document.getElementById('store-cep').value = data.storeCep || '';
            document.getElementById('store-visible-address').value = data.storeVisibleAddress || '';
            document.getElementById('free-km').value = data.freeKm || '';
            document.getElementById('km-value').value = data.kmValue || '';
            document.getElementById('fixed-delivery').value = data.fixedValue || '';
            storeLat = data.storeLat || null;
            storeLng = data.storeLng || null;
            console.log("Configurações carregadas!");
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

// --- SALVAR CONFIGURAÇÕES ---
document.getElementById('btn-save-configs').onclick = async () => {
    const enderecoDigitado = document.getElementById('store-address').value.trim();
    const numeroLoja = document.getElementById('store-number').value.trim();
    const cepLoja = document.getElementById('store-cep').value.trim();

    if (!enderecoDigitado || !numeroLoja) {
        alert("Informe o endereço e o número da loja.");
        return;
    }

    const enderecoBusca = `${enderecoDigitado}, ${numeroLoja}, ${cepLoja}, Sergipe, Brasil`;

    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(enderecoBusca)}.json?country=BR&language=pt&access_token=${MAPBOX_TOKEN}`;

        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.features && dados.features.length > 0) {
            storeLng = dados.features[0].center[0];
            storeLat = dados.features[0].center[1];
        } else {
            alert("Endereço da loja não encontrado. Verifique rua, número e CEP.");
            return;
        }

        const config = {
            status: document.getElementById('store-status-select').value,

            address: enderecoDigitado,
            storeNumber: numeroLoja,
            storeCep: cepLoja,

            storeLat: storeLat,
            storeLng: storeLng,

            storeVisibleAddress: document.getElementById('store-visible-address').value.trim(),

            freeKm: Number(document.getElementById('free-km').value),
            kmValue: document.getElementById('km-value').value,
            fixedValue: document.getElementById('fixed-delivery').value
        };

        await setDoc(doc(db, "configuracoes", "loja"), config);

        alert("Configurações salvas e endereço da loja validado!");

    } catch (error) {
        console.error(error);
        alert("Erro ao validar/salvar endereço da loja.");
    }
};

// --- 3. MÁSCARAS E RECORTE (Mantendo sua lógica) ---
const priceInput = document.getElementById('p-price');
if (priceInput) {
    priceInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        value = (value / 100).toFixed(2).replace(".", ",");
        e.target.value = value;
    });
}

let cropper = null;
const imageInput = document.getElementById('p-image-file');
const cropContainer = document.getElementById('crop-area');

if (imageInput) {
    imageInput.addEventListener('change', function() {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (cropper) cropper.destroy();
            cropper = new Croppie(cropContainer, {
                viewport: { width: 300, height: 300, type: 'square' },
                boundary: { width: 400, height: 400 }
            });
            cropper.bind({ url: e.target.result });
        }
        reader.readAsDataURL(this.files[0]);
    });
}

// --- 4. SALVAR / EDITAR ITEM ---
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-form');
    const editId = e.target.dataset.editId;

    let imageBase64 = "";
    if (cropper) {
        imageBase64 = await cropper.result({ type: 'base64', size: { width: 500, height: 500 } });
    }

  const product = {
        name: document.getElementById('p-name').value,
        description: document.getElementById('p-description').value, // ADICIONE ESTA LINHA
        category: document.getElementById('p-category').value,
        price: parseFloat(document.getElementById('p-price').value.replace(',', '.')),
        onSale: document.getElementById('p-onsale').checked,
        discount: document.getElementById('p-discount').value || 0
    };

    if (imageBase64) product.image = imageBase64;

    try {
        if (editId) {
            await updateDoc(doc(db, "produtos", editId), product);
            alert("Item atualizado!");
        } else {
            product.available = true;
            await addDoc(collection(db, "produtos"), product);
            alert("Item cadastrado!");
        }
        location.reload(); // Recarrega para limpar tudo
    } catch (err) {
        alert("Erro: " + err.message);
    }
};

// --- 5. LISTAGEM POR GAVETAS (CATEGORIAS) ---
onSnapshot(collection(db, "produtos"), (snapshot) => {
    const container = document.getElementById('category-groups');
    container.innerHTML = '';
    
    const categories = ["Panquecas", "Lasanhas", "Refrigerantes"];
    const products = [];
    snapshot.forEach(d => products.push({ id: d.id, ...d.data() }));

    categories.forEach(cat => {
        const catItems = products.filter(p => p.category === cat);
        if (catItems.length === 0) return;

        const accordion = document.createElement('div');
        accordion.className = 'accordion';
        accordion.innerHTML = `
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('active')">
                <strong>${cat.toUpperCase()} (${catItems.length})</strong>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="accordion-content">
                ${catItems.map(item => `
                    <div class="admin-item-card">
                        <img src="${item.image}" width="50" style="border-radius:5px">
                        <div style="flex:1">
                            <strong>${item.name}</strong><br>
                            <small style="color: #666; display: block; margin-bottom: 4px;">${item.description || 'Sem descrição'}</small> <!-- ADICIONE ESTA LINHA -->
                            R$ ${item.price.toFixed(2)} | ${item.available ? '✅' : '❌'}
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button class="btn-action btn-edit" onclick="editItem('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-action btn-status" onclick="toggleStatus('${item.id}', ${item.available})"><i class="fa-solid fa-sync"></i></button>
                            <button class="btn-action btn-delete" onclick="deleteItem('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(accordion);
    });
});

// --- FUNÇÕES GLOBAIS ---
window.editItem = async (id) => {
    const snap = await getDoc(doc(db, "produtos", id));
    const p = snap.data();
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-description').value = p.description || '';
    document.getElementById('p-category').value = p.category;
    document.getElementById('p-price').value = p.price.toFixed(2).replace('.', ',');
    document.getElementById('p-onsale').checked = p.onSale;
    document.getElementById('p-discount').value = p.discount;
    document.getElementById('product-form').dataset.editId = id;
    document.getElementById('btn-submit-form').innerText = "Atualizar Produto";
    document.getElementById('add-item-accordion').classList.add('active');
    window.scrollTo(0, 0);
};

window.toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "produtos", id), { available: !current });
};

window.deleteItem = async (id) => {
    if(confirm("Excluir permanentemente?")) await deleteDoc(doc(db, "produtos", id));
};

// --- 6. GESTÃO DE PEDIDOS EM TEMPO REAL E DASHBOARD ---
onSnapshot(collection(db, "pedidos"), (snapshot) => {
    const listaPedidos = document.getElementById('lista-pedidos-admin');
    const faturamentoElement = document.getElementById('dash-faturamento');
    const qtdPedidosElement = document.getElementById('dash-qtd-pedidos');
    
    if (!listaPedidos) return;

    let faturamentoTotal = 0;
    let totalPedidos = 0;
    listaPedidos.innerHTML = '';

    snapshot.forEach((docSnap) => {
        const pedido = docSnap.data();
        const id = docSnap.id;
        totalPedidos++;

        // Soma faturamento apenas de pedidos finalizados
        if (pedido.status === 'finalizado') {
            faturamentoTotal += pedido.total;
        }

        // Não mostra pedidos finalizados ou cancelados na lista ativa de trabalho
       if (pedido.status === 'finalizado') return;

        const dataPedido = pedido.data ? new Date(pedido.data.seconds * 1000).toLocaleTimeString() : '...';

        const card = document.createElement('div');
        card.className = `pedido-admin-card status-${pedido.status}`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong>#${id.slice(-5).toUpperCase()} - ${pedido.clienteNome}</strong><br>
                    <small>${dataPedido} | ${pedido.formaPagamento}</small>
                </div>
                <span class="badge-status">${pedido.status}</span>
            </div>
            <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
            <p style="font-size:0.9rem;">${pedido.resumoItens}</p>
            <p><strong>Total: R$ ${pedido.total.toFixed(2)}</strong></p>
           <div id="acoes-${id}">   
   ${renderBotaoStatus(id, pedido.status, pedido.metodo)}
${pedido.status !== 'cancelado' ? `
    <button onclick="cancelarPedidoAdmin('${id}')" class="btn-save" style="background:#e74c3c; padding:8px; margin-top:8px;">
        Cancelar Pedido
    </button>
` : `
    <p style="color:#e74c3c; font-weight:bold; margin-top:8px;">
        Pedido cancelado
    </p>
`}
</div>
        `;
        listaPedidos.prepend(card);
    });

    // Atualiza Dashboard
    if (faturamentoElement) faturamentoElement.innerText = `R$ ${faturamentoTotal.toFixed(2)}`;
    if (qtdPedidosElement) qtdPedidosElement.innerText = totalPedidos;
});

snapshot.docChanges().forEach((change) => {
    const pedido = change.doc.data();
    const id = change.doc.id;

    if (change.type === "added" && pedido.status === "pendente") {
        if (!primeiraCargaPedidos && !pedidosConhecidos.has(id)) {
            tocarSomNovoPedido();
            mostrarNotificacaoNovoPedido(pedido);

            if ("vibrate" in navigator) {
                navigator.vibrate([500, 300, 500, 300, 500]);
            }
        }

        pedidosConhecidos.add(id);
    }
});

primeiraCargaPedidos = false;

// Função Auxiliar para renderizar o botão certo conforme o status
// Função Inteligente: Muda o texto do botão conforme a escolha do cliente
function renderBotaoStatus(id, status, metodo) {
    if (status === 'pendente') {
        return `<button onclick="alterarStatusPedido('${id}', 'preparando')" class="btn-save" style="background:#3498db; padding:8px;">Aceitar e Preparar</button>`;
    }
    
    if (status === 'preparando') {
        // Se for entrega, o próximo passo é sair para a rua. Se for retirada, é avisar que está pronto.
        const textoBotao = (metodo === 'entrega') ? 'Saiu para Entrega' : 'Pronto para Retirada';
        const novoStatus = (metodo === 'entrega') ? 'a caminho' : 'pronto';
        
        return `<button onclick="alterarStatusPedido('${id}', '${novoStatus}')" class="btn-save" style="background:var(--accent); padding:8px;">${textoBotao}</button>`;
    }
    
    if (status === 'a caminho' || status === 'pronto') {
        return `<button onclick="alterarStatusPedido('${id}', 'finalizado')" class="btn-save" style="background:var(--vinho-logo); padding:8px;">Finalizar Pedido (Concluído)</button>`;
    }
    
    return '';
}

// Função Global para mudar o status no Firebase
window.alterarStatusPedido = async (id, novoStatus) => {
    pararSomNovoPedido();
    try {
        await updateDoc(doc(db, "pedidos", id), { status: novoStatus });
    } catch (error) {
        alert("Erro ao atualizar status: " + error.message);
    }
};

window.cancelarPedidoAdmin = async (id) => {
    pararSomNovoPedido();
    if (confirm("Deseja realmente cancelar este pedido?")) {
        try {
            await updateDoc(doc(db, "pedidos", id), { 
                status: "cancelado",
                canceladoPor: "admin"
            });

            alert("Pedido cancelado com sucesso!");
        } catch (error) {
            alert("Erro ao cancelar pedido: " + error.message);
        }
    }
};

// ===============================
// DASHBOARD FINANCEIRO AVANÇADO
// ===============================

let dadosDashboard = {
    pedidos: [],
    vendasExternas: [],
    pagamentos: {},
    totalSite: 0,
    totalExterno: 0,
    totalGeral: 0,
    finalizados: 0,
    cancelados: 0,
    inicio: null,
    fim: null
};

function formatarMoeda(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function valorParaNumero(valor) {
    if (!valor) return 0;
    return parseFloat(String(valor).replace(/\./g, '').replace(',', '.')) || 0;
}

function dataFirestoreParaDate(data) {
    if (!data) return null;

    if (data.seconds) {
        return new Date(data.seconds * 1000);
    }

    return new Date(data);
}

function dataHojeInput() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterPeriodoSelecionado() {
    const inicialInput = document.getElementById('dash-data-inicial');
    const finalInput = document.getElementById('dash-data-final');

    if (!inicialInput || !finalInput) return null;

    if (!inicialInput.value) inicialInput.value = dataHojeInput();
    if (!finalInput.value) finalInput.value = dataHojeInput();

    const inicio = new Date(`${inicialInput.value}T00:00:00`);
    const fim = new Date(`${finalInput.value}T23:59:59`);

    return { inicio, fim };
}

function estaNoPeriodo(data, inicio, fim) {
    if (!data) return false;
    return data >= inicio && data <= fim;
}

function registrarPagamento(nome, valor) {
    const pagamento = nome || 'Não informado';

    if (!dadosDashboard.pagamentos[pagamento]) {
        dadosDashboard.pagamentos[pagamento] = {
            quantidade: 0,
            total: 0
        };
    }

    dadosDashboard.pagamentos[pagamento].quantidade++;
    dadosDashboard.pagamentos[pagamento].total += Number(valor || 0);
}

window.carregarDashboardFinanceiro = async () => {
    const periodo = obterPeriodoSelecionado();
    if (!periodo) return;

    dadosDashboard = {
        pedidos: [],
        vendasExternas: [],
        pagamentos: {},
        totalSite: 0,
        totalExterno: 0,
        totalGeral: 0,
        finalizados: 0,
        cancelados: 0,
        inicio: periodo.inicio,
        fim: periodo.fim
    };

    const pedidosSnap = await getDoc(doc(db, "configuracoes", "loja"));

    // Busca pedidos do site
    onSnapshot(collection(db, "pedidos"), (snapshot) => {
        processarDashboard(snapshot, null, periodo.inicio, periodo.fim);
    });

    // Busca vendas externas
    onSnapshot(collection(db, "vendas_externas"), (snapshot) => {
        processarDashboard(null, snapshot, periodo.inicio, periodo.fim);
    });
};

let ultimoSnapshotPedidos = null;
let ultimoSnapshotExternas = null;

function processarDashboard(snapshotPedidos, snapshotExternas, inicio, fim) {
    if (snapshotPedidos) ultimoSnapshotPedidos = snapshotPedidos;
    if (snapshotExternas) ultimoSnapshotExternas = snapshotExternas;

    dadosDashboard = {
        pedidos: [],
        vendasExternas: [],
        pagamentos: {},
        totalSite: 0,
        totalExterno: 0,
        totalGeral: 0,
        finalizados: 0,
        cancelados: 0,
        inicio,
        fim
    };

    if (ultimoSnapshotPedidos) {
        ultimoSnapshotPedidos.forEach((docSnap) => {
            const pedido = docSnap.data();
            const dataPedido = dataFirestoreParaDate(pedido.data);

            if (!estaNoPeriodo(dataPedido, inicio, fim)) return;

            const item = {
                id: docSnap.id,
                origem: 'Site',
                clienteNome: pedido.clienteNome || '',
                telefoneCliente: pedido.telefoneCliente || '',
                formaPagamento: pedido.formaPagamento || 'Não informado',
                total: Number(pedido.total || 0),
                status: pedido.status || '',
                resumoItens: pedido.resumoItens || '',
                data: dataPedido
            };

            dadosDashboard.pedidos.push(item);

            if (pedido.status === 'finalizado') {
                dadosDashboard.finalizados++;
                dadosDashboard.totalSite += Number(pedido.total || 0);
                registrarPagamento(pedido.formaPagamento, pedido.total);
            }

            if (pedido.status === 'cancelado') {
                dadosDashboard.cancelados++;
            }
        });
    }

    if (ultimoSnapshotExternas) {
        ultimoSnapshotExternas.forEach((docSnap) => {
            const venda = docSnap.data();
            const dataVenda = dataFirestoreParaDate(venda.data);

            if (!estaNoPeriodo(dataVenda, inicio, fim)) return;

          const item = {
    id: docSnap.id,
    origem: venda.plataforma || 'Venda externa',
    clienteNome: venda.clienteNome || `Total ${venda.plataforma || 'Venda externa'}`,
    telefoneCliente: venda.telefoneCliente || '',
    formaPagamento: venda.formaPagamento || 'Não informado',
    total: Number(venda.total || 0),
    status: 'total externo',
    resumoItens: venda.observacao || `Total vendido em ${venda.plataforma || 'plataforma externa'}`,
    data: dataVenda
};

            dadosDashboard.vendasExternas.push(item);
            dadosDashboard.totalExterno += Number(venda.total || 0);
            registrarPagamento(venda.formaPagamento, venda.total);
        });
    }

    dadosDashboard.totalGeral = dadosDashboard.totalSite + dadosDashboard.totalExterno;

    atualizarTelaDashboard();
}

function atualizarTelaDashboard() {
    const elFinalizados = document.getElementById('dash-finalizados');
    const elCancelados = document.getElementById('dash-cancelados');
    const elSite = document.getElementById('dash-vendas-site');
    const elExternas = document.getElementById('dash-vendas-externas');
    const elTotal = document.getElementById('dash-total-geral');
    const elPagamentos = document.getElementById('dash-pagamentos');

    if (elFinalizados) elFinalizados.innerText = dadosDashboard.finalizados;
    if (elCancelados) elCancelados.innerText = dadosDashboard.cancelados;
    if (elSite) elSite.innerText = formatarMoeda(dadosDashboard.totalSite);
    if (elExternas) elExternas.innerText = formatarMoeda(dadosDashboard.totalExterno);
    if (elTotal) elTotal.innerText = formatarMoeda(dadosDashboard.totalGeral);

    if (elPagamentos) {
        const pagamentos = Object.entries(dadosDashboard.pagamentos);

        if (pagamentos.length === 0) {
            elPagamentos.innerHTML = '<p style="color:#999;">Nenhum pagamento encontrado.</p>';
        } else {
            elPagamentos.innerHTML = pagamentos.map(([nome, info]) => `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:8px 0;">
                    <span><strong>${nome}</strong> (${info.quantidade})</span>
                    <span>${formatarMoeda(info.total)}</span>
                </div>
            `).join('');
        }
    }

    atualizarSugestoesClientes();
}

window.salvarVendaExterna = async () => {
    const plataforma = document.getElementById('ext-plataforma').value;
    const totalNovo = valorParaNumero(document.getElementById('ext-valor').value);
    const observacao = document.getElementById('ext-observacao').value.trim();

    if (totalNovo <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    try {
        await addDoc(collection(db, "vendas_externas"), {
            plataforma,
            clienteNome: `Total ${plataforma}`,
            telefoneCliente: '',
           formaPagamento: "Venda externa",
            total: totalNovo,
            observacao: observacao || `Total vendido na plataforma ${plataforma}`,
            tipo: "total_plataforma",
            data: serverTimestamp()
        });

        document.getElementById('ext-valor').value = '';
        document.getElementById('ext-observacao').value = '';

        alert("Total da venda externa salvo com sucesso!");
        carregarDashboardFinanceiro();

    } catch (error) {
        alert("Erro ao salvar venda externa: " + error.message);
    }
};

function todasAsVendasDashboard() {
    return [
        ...dadosDashboard.pedidos,
        ...dadosDashboard.vendasExternas
    ].sort((a, b) => b.data - a.data);
}

function atualizarSugestoesClientes() {
    const datalist = document.getElementById('sugestoes-clientes');
    if (!datalist) return;

    const vendas = todasAsVendasDashboard();
    const sugestoes = new Set();

    vendas.forEach(venda => {
        if (venda.clienteNome) sugestoes.add(venda.clienteNome);
        if (venda.telefoneCliente) sugestoes.add(venda.telefoneCliente);
    });

    datalist.innerHTML = Array.from(sugestoes).map(item => `
        <option value="${item}">
    `).join('');
}

document.addEventListener('input', (e) => {
    if (e.target.id === 'dash-busca') {
        pesquisarVendaDashboard(e.target.value);
    }
});

function pesquisarVendaDashboard(termo) {
    const container = document.getElementById('dash-resultados-busca');
    if (!container) return;

    const busca = termo.trim().toLowerCase();

    if (!busca) {
        container.innerHTML = '<p style="color:#999;">Digite para pesquisar.</p>';
        return;
    }

    const resultados = todasAsVendasDashboard().filter(venda => {
        return (
            venda.clienteNome.toLowerCase().includes(busca) ||
            venda.telefoneCliente.toLowerCase().includes(busca)
        );
    });

    if (resultados.length === 0) {
        container.innerHTML = '<p style="color:#999;">Nenhuma venda encontrada.</p>';
        return;
    }

    container.innerHTML = resultados.map(venda => `
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; margin-bottom:8px;">
            <strong>${venda.clienteNome || 'Cliente não informado'}</strong><br>
            <small>${venda.telefoneCliente || 'Sem telefone'} | ${venda.origem}</small><br>
            <small>${venda.data ? venda.data.toLocaleString() : 'Sem data'}</small>
            <p style="margin:6px 0;">${venda.resumoItens || 'Sem descrição'}</p>
            <strong>${formatarMoeda(venda.total)}</strong>
            <span style="float:right; color:${venda.status === 'cancelado' ? '#e74c3c' : '#5D7D2B'};">
                ${venda.status}
            </span>
        </div>
    `).join('');
}

window.baixarRelatorioPDF = () => {
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF();
    const vendas = todasAsVendasDashboard();

    let y = 15;

    pdf.setFontSize(18);
    pdf.text("Casa da Lasanha", 14, y);

    y += 8;
    pdf.setFontSize(13);
    pdf.text("Relatório Financeiro", 14, y);

    y += 10;
    pdf.setFontSize(10);
    pdf.text(`Período: ${dadosDashboard.inicio?.toLocaleDateString() || '-'} até ${dadosDashboard.fim?.toLocaleDateString() || '-'}`, 14, y);

    y += 10;
    pdf.setFontSize(12);
    pdf.text(`Pedidos finalizados: ${dadosDashboard.finalizados}`, 14, y);
    y += 7;
    pdf.text(`Pedidos cancelados: ${dadosDashboard.cancelados}`, 14, y);
    y += 7;
    pdf.text(`Vendas do site: ${formatarMoeda(dadosDashboard.totalSite)}`, 14, y);
    y += 7;
    pdf.text(`Vendas externas: ${formatarMoeda(dadosDashboard.totalExterno)}`, 14, y);
    y += 7;
    pdf.text(`Total geral: ${formatarMoeda(dadosDashboard.totalGeral)}`, 14, y);

    y += 12;
    pdf.setFontSize(13);
    pdf.text("Formas de pagamento", 14, y);

    y += 8;
    pdf.setFontSize(10);

    Object.entries(dadosDashboard.pagamentos).forEach(([nome, info]) => {
        pdf.text(`${nome}: ${info.quantidade} venda(s) - ${formatarMoeda(info.total)}`, 14, y);
        y += 6;
    });

    y += 8;
    pdf.setFontSize(13);
    pdf.text("Detalhamento de vendas", 14, y);

    y += 8;
    pdf.setFontSize(9);

    if (vendas.length === 0) {
        pdf.text("Nenhuma venda encontrada no período.", 14, y);
    }

    vendas.forEach((venda) => {
        if (y > 270) {
            pdf.addPage();
            y = 15;
        }

        pdf.setFontSize(9);
        pdf.text(`Cliente: ${venda.clienteNome || 'Não informado'}`, 14, y);
        y += 5;
        pdf.text(`Telefone: ${venda.telefoneCliente || 'Não informado'}`, 14, y);
        y += 5;
        pdf.text(`Origem: ${venda.origem} | Status: ${venda.status} | Pagamento: ${venda.formaPagamento}`, 14, y);
        y += 5;
        pdf.text(`Data: ${venda.data ? venda.data.toLocaleString() : '-'}`, 14, y);
        y += 5;
        pdf.text(`Total: ${formatarMoeda(venda.total)}`, 14, y);
        y += 5;

        const texto = venda.resumoItens || 'Sem detalhes';
        const linhas = pdf.splitTextToSize(`Detalhes: ${texto}`, 180);
        pdf.text(linhas, 14, y);
        y += linhas.length * 5;

        y += 4;
        pdf.line(14, y, 196, y);
        y += 6;
    });

    pdf.save("relatorio-casa-da-lasanha.pdf");
};

// Inicia o dashboard com o dia atual
document.addEventListener('DOMContentLoaded', () => {
    const inicial = document.getElementById('dash-data-inicial');
    const final = document.getElementById('dash-data-final');

    if (inicial && final) {
        inicial.value = dataHojeInput();
        final.value = dataHojeInput();
        carregarDashboardFinanceiro();
    }
});

loadStoreConfigs();
