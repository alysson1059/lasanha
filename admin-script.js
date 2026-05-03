import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// --- 1. CONTROLE DE ACESSO ---
const loginBtn = document.getElementById('btn-login');
if (loginBtn) {
    loginBtn.onclick = () => {
        const email = document.getElementById('admin-email').value;
        const pass = document.getElementById('admin-password').value;
        signInWithEmailAndPassword(auth, email, pass)
            .then(() => { 
                document.getElementById('login-overlay').style.display = 'none'; 
                document.getElementById('admin-content').style.display = 'block'; 

                loadStoreConfigs();
            })
            .catch(err => alert("Erro ao acessar: " + err.message));
    };
}

// --- 2. CONFIGURAÇÕES DE FRETE E STATUS DA LOJA ---
window.getCurrentLocation = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            // Aqui você pode salvar as coordenadas ou usar uma API para converter em texto
            document.getElementById('store-address').value = `${latitude}, ${longitude}`;
            alert("Localização capturada com sucesso!");
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
            document.getElementById('free-km').value = data.freeKm || '';
            document.getElementById('km-value').value = data.kmValue || '';
            document.getElementById('fixed-delivery').value = data.fixedValue || '';
            console.log("Configurações carregadas!");
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

// --- SALVAR CONFIGURAÇÕES ---
document.getElementById('btn-save-configs').onclick = async () => {
    const config = {
        status: document.getElementById('store-status-select').value,
        address: document.getElementById('store-address').value,
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

loadStoreConfigs();
