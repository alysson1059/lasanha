import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

window.getCurrentLocation = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            storeLat = position.coords.latitude;
            storeLng = position.coords.longitude;

            document.getElementById('store-address').value = `${storeLat}, ${storeLng}`;

            alert("Localização do restaurante capturada com sucesso!");
        }, (error) => {
            alert("Erro ao pegar localização: " + error.message);
        });
    } else {
        alert("Geolocalização não suportada pelo navegador.");
    }
};

// --- CARREGAR CONFIGURAÇÕES AO INICIAR ---
async function loadStoreConfigs() {
    try {
        const docRef = doc(db, "configuracoes", "loja");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('store-status-select').value = data.status || 'closed';
            document.getElementById('store-address').value = data.address || '';
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

    // Se o endereço estiver no formato: -10.855102, -37.126385
    if (enderecoDigitado.includes(',')) {
        const partes = enderecoDigitado.split(',');

        const latDigitada = parseFloat(partes[0].trim());
        const lngDigitada = parseFloat(partes[1].trim());

        if (!isNaN(latDigitada) && !isNaN(lngDigitada)) {
            storeLat = latDigitada;
            storeLng = lngDigitada;
        }
    }

    const enderecoTexto = document.getElementById('store-address').value.trim();

if (enderecoTexto.includes(',')) {
    const partes = enderecoTexto.split(',');

    storeLat = parseFloat(partes[0].trim());
    storeLng = parseFloat(partes[1].trim());

    console.log("NOVA LAT:", storeLat);
    console.log("NOVA LNG:", storeLng);
}

  const config = {
    status: document.getElementById('store-status-select').value,

    // GPS usado apenas para cálculo do frete
    address: enderecoDigitado,
    storeLat: storeLat,
    storeLng: storeLng,

    // Endereço bonito que aparece para o cliente
    storeVisibleAddress: document.getElementById('store-visible-address').value.trim(),

    freeKm: Number(document.getElementById('free-km').value),
    kmValue: document.getElementById('km-value').value,
    fixedValue: document.getElementById('fixed-delivery').value
};

    try {
        await setDoc(doc(db, "configuracoes", "loja"), config);
        alert("Configurações da Casa da Lasanha salvas com sucesso!");
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
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
    try {
        await updateDoc(doc(db, "pedidos", id), { status: novoStatus });
    } catch (error) {
        alert("Erro ao atualizar status: " + error.message);
    }
};

window.cancelarPedidoAdmin = async (id) => {
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

loadStoreConfigs();
