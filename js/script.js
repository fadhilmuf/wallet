// =========================================
// 1. CONFIG FIREBASE
// =========================================
const firebaseConfig = {
    apiKey: "AIzaSyCfEM_BCzUpBHtzx2LPvGDXiZ44g-NTyLY",
    authDomain: "wallet.randomhub.online",
    projectId: "wallet-4da85",
    storageBucket: "wallet-4da85.firebasestorage.app",
    messagingSenderId: "824717163561",
    appId: "1:824717163561:web:f6ea7c049a4d5a5c677038",
    measurementId: "G-N8GZPJ1RVM"
};

// Initialize Firebase (Pencegahan biar gak dobel init)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// =========================================
// 2. TAMPILAN & ANIMASI (UI)
// =========================================

// --- SVG IKON ---
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>`;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

// --- FITUR DARK MODE ---
const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

themeToggleBtn.innerHTML = moonIcon;
if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = sunIcon;
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.innerHTML = sunIcon;
    } else {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.innerHTML = moonIcon;
    }
});

// --- ANIMASI TEKS BERGANTI ---
const words = ["effortlessly.", "securely.", "smartly.", "easily."];
let wordIndex = 0;
const changingWord = document.getElementById('changing-word');

setInterval(() => {
    changingWord.style.opacity = 0;
    changingWord.style.transform = "translateY(10px)";
    setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        changingWord.innerText = words[wordIndex];
        changingWord.style.opacity = 1;
        changingWord.style.transform = "translateY(0)";
    }, 400); 
}, 3000);


// =========================================
// 3. SISTEM LOGIN & AUTENTIKASI (ANTI-BUG)
// =========================================

// Variabel rem darurat biar Firebase gak mindahin halaman sebelum proses update nama kelar
let isLoginAction = false; 

// Pendeteksi user login (Auto-redirect kalau udah login sebelumnya)
firebase.auth().onAuthStateChanged(user => {
    // Kalau ada user DAN bukan lagi proses ngeklik tombol login = Pindah ke halaman utama
    if (user && !isLoginAction) {
        window.location.href = '/';
    }
});

// Tombol Sign in with Google
document.getElementById('google-login-btn').addEventListener('click', () => {
    isLoginAction = true; // Aktifin rem
    const provider = new firebase.auth.GoogleAuthProvider();
    
    firebase.auth().signInWithPopup(provider).then(() => {
        window.location.href = '/'; // Pindah kalau pop-up Google sukses
    }).catch(error => {
        isLoginAction = false; // Lepas rem kalau error/batal
        console.error("Google Login Error:", error);
        alert(error.message);
    });
});

// Tombol Continue as Guest
document.getElementById('guest-login-btn').addEventListener('click', () => {
    isLoginAction = true; 
    
    firebase.auth().signInAnonymously().then(result => {
        const animals = ["Capybara", "Otter", "Panda", "Koala", "Hamster", "Fox", "Sloth", "Badger"];
        const attributes = ["Strategic", "Dynamic", "Chill", "Clever", "Swift", "Silent"];
        
        const randomAttr = attributes[Math.floor(Math.random() * attributes.length)];
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        
        const customNickname = `${randomAttr} ${randomAnimal}`;

        // INI REMNYA: Tunggu proses update nama 100% selesai
        return result.user.updateProfile({ displayName: customNickname });
        
    }).then(() => {
        // BARU PINDAH HALAMAN DI SINI
        window.location.href = '/'; 
        
    }).catch(error => {
        isLoginAction = false;
        console.error("Guest Login Error:", error);
        alert(error.message);
    });
});