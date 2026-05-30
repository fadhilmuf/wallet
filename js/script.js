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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// =========================================
// 2. ICONS
// =========================================
const moonIcon     = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>`;
const sunIcon      = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const eyeOpenIcon  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeClosedIcon= `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// =========================================
// 3. TEMA DARK MODE (pakai localStorage, ini oke karena bukan data user)
// =========================================
const themeToggleBtn = document.getElementById('theme-toggle');

if (themeToggleBtn) {
    const currentTheme = localStorage.getItem('theme');
    themeToggleBtn.innerHTML = moonIcon;
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = sunIcon;
    }
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
    });
}

// =========================================
// 4. INCOME/EXPENSE TOGGLE
// =========================================
const typeBtns = document.querySelectorAll('.type-btn');
const typeInput = document.getElementById('type');

if (typeBtns && typeInput) {
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            typeInput.value = btn.dataset.type;
        });
    });
}

// =========================================
// 5. HIDE / SHOW BALANCE — state di Firestore
// =========================================
let isBalanceHidden = true; // default selalu hidden sebelum Firestore di-load
let lastKnownBalance = 0;

const balanceToggleBtn = document.getElementById('balance-toggle');
const balanceEl = document.getElementById('total-balance');

// Render tampilan balance sesuai state saat ini
function applyBalanceVisibility() {
    if (!balanceEl || !balanceToggleBtn) return;
    if (isBalanceHidden) {
        balanceEl.innerText = 'Rp ••••••';
        balanceToggleBtn.innerHTML = eyeClosedIcon;
    } else {
        balanceEl.innerText = `Rp ${lastKnownBalance.toLocaleString('id-ID')}`;
        balanceToggleBtn.innerHTML = eyeOpenIcon;
    }
}

// Langsung apply hidden sebelum apapun — biar Rp 0 di HTML ga sempat keliatan
applyBalanceVisibility();

// Simpan preference ke Firestore
function saveBalancePreference(uid, hidden) {
    db.collection('users').doc(uid).set(
        { balanceHidden: hidden },
        { merge: true }
    ).catch(err => console.error('Gagal simpan preference:', err));
}

if (balanceToggleBtn) {
    balanceToggleBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        isBalanceHidden = !isBalanceHidden;
        applyBalanceVisibility();
        if (user) saveBalancePreference(user.uid, isBalanceHidden);
    });
}

// =========================================
// 6. OTENTIKASI & INIT
// =========================================
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '/login';
        return;
    }

    // Tampilkan nama user
    const greeting = document.getElementById('user-greeting');
    if (greeting) {
        greeting.innerText = `Hello, ${user.displayName || 'User'}!`;
    }

    // Load preference hide/show dari Firestore dulu, baru load transaksi
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && typeof doc.data().balanceHidden !== 'undefined') {
            isBalanceHidden = doc.data().balanceHidden;
        }
        // Kalau field belum ada (user baru), default tetap true (hidden)
        applyBalanceVisibility();
        loadTransactions(user.uid);
    }).catch(() => {
        // Kalau gagal ambil preference, tetap load transaksi dengan default hidden
        loadTransactions(user.uid);
    });
});

window.logout = function () {
    auth.signOut().then(() => {
        window.location.href = '/login';
    });
};

// =========================================
// 7. LOAD TRANSAKSI
// =========================================
function loadTransactions(uid) {
    const list = document.getElementById('expense-list');
    if (!list) return;

    // Loading placeholder untuk list (bukan balance — balance tetap ••••••)
    list.innerHTML = `<li class="loading-placeholder">Loading transactions...</li>`;

    db.collection('users').doc(uid).collection('transactions')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            list.innerHTML = '';
            let total = 0;

            if (snapshot.empty) {
                list.innerHTML = `<li class="empty-state">No transactions yet. Add your first one!</li>`;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const amount = Number(data.amount);

                if (data.type === 'income') total += amount;
                else total -= amount;

                let dateStr = '';
                if (data.createdAt) {
                    dateStr = data.createdAt.toDate().toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    });
                }

                const li = document.createElement('li');
                li.className = `expense-item flash-${data.type}`;
                li.innerHTML = `
                    <div class="expense-info">
                        <strong>${data.desc || (data.type === 'income' ? 'Income' : 'Expense')}</strong>
                        <small>${dateStr}</small>
                    </div>
                    <div class="expense-actions">
                        <span class="expense-price ${data.type === 'income' ? 'text-success' : 'text-danger'}">
                            ${data.type === 'income' ? '+' : '-'} Rp ${amount.toLocaleString('id-ID')}
                        </span>
                        <button class="delete-btn" data-id="${doc.id}" title="Delete transaction">✕</button>
                    </div>
                `;

                li.querySelector('.delete-btn').addEventListener('click', () => {
                    deleteTx(doc.id);
                });

                list.appendChild(li);
            });

            // Update balance tanpa ganggu visibility state
            lastKnownBalance = total;
            if (balanceEl) {
                balanceEl.classList.toggle('balance-negative', total < 0);
                balanceEl.classList.toggle('balance-positive', total > 0);
            }
            applyBalanceVisibility();

        }, err => {
            console.error("Firestore error:", err);
            list.innerHTML = `<li class="empty-state">Failed to load transactions. Please refresh.</li>`;
        });
}

// =========================================
// 8. TAMBAH TRANSAKSI
// =========================================
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const submitBtn = expenseForm.querySelector('button[type="submit"]');
        const type = document.getElementById('type').value;
        const desc = document.getElementById('desc').value.trim();
        const amount = document.getElementById('amount').value;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        db.collection('users').doc(user.uid).collection('transactions').add({
            type,
            desc,
            amount: Number(amount),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            expenseForm.reset();
            typeBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-type="expense"]').classList.add('active');
            typeInput.value = 'expense';
        }).catch(err => {
            alert("Gagal menambah data: " + err.message);
        }).finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Transaction';
        });
    });
}

// =========================================
// 9. HAPUS TRANSAKSI
// =========================================
function deleteTx(id) {
    const user = auth.currentUser;
    if (!user) return;
    if (!confirm('Delete this transaction?')) return;

    db.collection('users').doc(user.uid).collection('transactions').doc(id).delete()
        .catch(err => alert("Gagal menghapus: " + err.message));
}