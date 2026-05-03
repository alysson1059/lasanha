import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// COLE SEU CONFIG AQUI (O que você pegou no Firebase)
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
loginBtn.onclick = () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => { document.getElementById('login-overlay').style.display = 'none'; document.getElementById('admin-content').style.display = 'block'; })
        .catch(err => alert("Erro ao acessar: " + err.message));
};

document.getElementById('btn-logout').onclick = () => signOut(auth).then(() => location.reload());

// --- 2. MÁSCARA DE DINHEIRO (500 -> 5,00) ---
const priceInput = document.getElementById('p-price');
priceInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    value = (value / 100).toFixed(2).replace(".", ",");
    e.target.value = value;
});

// --- 3. LÓGICA DE RECORTE DE IMAGEM ---
let cropper = null;
const imageInput = document.getElementById('p-image-file'); // Mude o input no HTML para type="file"
const cropContainer = document.getElementById('crop-area'); // Crie uma div id="crop-area" no HTML

imageInput.addEventListener('change', function() {
    const reader = new FileReader();
    reader.onload = function(e) {
        if (cropper) cropper.destroy();
        cropper = new Croppie(cropContainer, {
            viewport: { width: 300, height: 300, type: 'square' }, // 1:1 proporcional a 500x500
            boundary: { width: 400, height: 400 }
        });
        cropper.bind({ url: e.target.result });
    }
    reader.readAsDataURL(this.files[0]);
});

// --- 4. SALVAR ITEM ---
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    
    // Pegar imagem recortada
    const croppedImg = await cropper.result({ type: 'base64', size: { width: 500, height: 500 } });

    const product = {
        name: document.getElementById('p-name').value,
        category: document.getElementById('p-category').value,
        price: parseFloat(document.getElementById('p-price').value.replace(',', '.')),
        image: croppedImg,
        available: true,
        onSale: document.getElementById('p-onsale').checked, // Checkbox no HTML
        discount: document.getElementById('p-discount').value || 0
    };

    try {
        await addDoc(collection(db, "produtos"), product);
        alert("Sucesso! Lasanha cadastrada.");
        e.target.reset();
        cropper.destroy();
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
};

// --- 5. LISTAR E EDITAR ITENS ---
onSnapshot(collection(db, "produtos"), (snapshot) => {
    const list = document.getElementById('admin-product-list');
    list.innerHTML = '';
    snapshot.forEach((docData) => {
        const p = docData.data();
        const id = docData.id;
        list.innerHTML += `
            <div class="admin-item-card" style="display:flex; gap:10px; border-bottom:1px solid #ddd; padding:10px;">
                <img src="${p.image}" width="50">
                <div style="flex:1">
                    <strong>${p.name}</strong> - R$ ${p.price.toFixed(2)}
                    <br><small>${p.available ? 'Disponível' : 'Indisponível'}</small>
                </div>
                <button onclick="toggleAvailability('${id}', ${p.available})">Status</button>
                <button onclick="deleteItem('${id}')" style="color:red">Excluir</button>
            </div>
        `;
    });
});

window.toggleAvailability = async (id, current) => {
    await updateDoc(doc(db, "produtos", id), { available: !current });
};

window.deleteItem = async (id) => {
    if(confirm("Deseja excluir este item?")) await deleteDoc(doc(db, "produtos", id));
};