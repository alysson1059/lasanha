let deferredPrompt = null;

const installBox = document.getElementById("install-pwa-box");
const installBtn = document.getElementById("btn-install-pwa");
const installText = document.getElementById("install-pwa-text");

function isAppInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js")
            .then(() => console.log("Service Worker registrado"))
            .catch((error) => console.log("Erro no Service Worker:", error));
    });
}

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    if (!isAppInstalled() && installBox) {
        installBox.style.display = "block";
    }
});

if (installBtn) {
    installBtn.addEventListener("click", async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();

            const result = await deferredPrompt.userChoice;
            deferredPrompt = null;

            if (installBox) {
                installBox.style.display = "none";
            }
        }
    });
}

window.addEventListener("load", () => {
    if (isAppInstalled()) return;

    if (isIOS() && installBox) {
        installText.innerText = "No iPhone: toque em Compartilhar e depois em 'Adicionar à Tela de Início'.";
        installBtn.style.display = "none";
        installBox.style.display = "block";
    }
});