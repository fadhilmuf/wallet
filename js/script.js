// =========================================
// CONFIG FIREBASE (DIKEMBALIKAN KE BAWAAN FIREBASE)
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

// Pastikan Firebase belum terinisialisasi sebelum init ulang
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// --- KODE SVG UNTUK IKON ---
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


// --- INITIALIZE DOM ELEMENTS ---
const form = document.getElementById('expense-form');
const typeInput = document.getElementById('type'); 
const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const expenseList = document.getElementById('expense-list');
const totalBalanceDisplay = document.getElementById('total-balance');

// --- LOGIKA TOMBOL TIPE TRANSAKSI ---
const typeBtns = document.querySelectorAll('.type-btn');
typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        typeInput.value = btn.getAttribute('data-type');
    });
});

let transactions = [];
let previousBalance = 0; 
let justSubmitted = false; 
let unsubscribeStore = null; 

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID').format(amount);
};

// --- AUTH STATE MONITOR ---
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('user-greeting').innerText = `Hello, ${user.displayName || user.email || 'User'}!`;
        listenToUserTransactions(user.uid);
    }
});

window.logout = function() {
    if (unsubscribeStore) unsubscribeStore(); 
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
};

// --- ANIMASI ROLLING NUMBER ---
function animateBalance(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * (end - start) + start);

        if (currentVal < 0) {
            totalBalanceDisplay.innerText = `-Rp ${formatCurrency(Math.abs(currentVal))}`;
            totalBalanceDisplay.style.color = 'var(--danger)';
        } else {
            totalBalanceDisplay.innerText = `Rp ${formatCurrency(currentVal)}`;
            totalBalanceDisplay.style.color = currentVal === 0 ? 'var(--text-main)' : 'var(--success)';
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            if (end < 0) {
                totalBalanceDisplay.innerText = `-Rp ${formatCurrency(Math.abs(end))}`;
                totalBalanceDisplay.style.color = 'var(--danger)';
            } else {
                totalBalanceDisplay.innerText = `Rp ${formatCurrency(end)}`;
                totalBalanceDisplay.style.color = end === 0 ? 'var(--text-main)' : 'var(--success)';
            }
        }
    };
    window.requestAnimationFrame(step);
}

// --- FIRESTORE REAL-TIME FETCH ---
function listenToUserTransactions(uid) {
    unsubscribeStore = db.collection('transactions')
        .where('userId', '==', uid)
        .onSnapshot(snapshot => {
            transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            
            transactions.sort((a, b) => new Date(a.dateRaw) - new Date(b.dateRaw));
            
            renderTransactions();
        }, error => {
            console.error("Firestore Listen Error:", error);
        });
}

function renderTransactions() {
    expenseList.innerHTML = '';
    let currentBalance = 0;

    transactions.forEach((item) => {
        if (item.type === 'income') {
            currentBalance += item.amount;
        } else {
            currentBalance -= item.amount;
        }
    });

    let displayIndex = 0;
    for (let i = transactions.length - 1; i >= 0; i--) {
        const item = transactions[i];
        const isIncome = item.type === 'income';
        const sign = isIncome ? '+' : '-';
        const colorClass = isIncome ? 'text-success' : 'text-danger';

        const li = document.createElement('li');
        
        if (justSubmitted && i === transactions.length - 1) {
            if (item.type === 'income') {
                li.classList.add('expense-item', 'flash-income');
            } else {
                li.classList.add('expense-item', 'flash-expense');
            }
        } else {
            li.classList.add('expense-item');
            const delay = Math.min(displayIndex * 0.08, 1);
            li.style.animationDelay = `${delay}s`;
        }
        displayIndex++;

        li.innerHTML = `
            <div class="expense-info">
                <strong>${item.desc}</strong>
                <small>${item.date}</small>
            </div>
            <div class="expense-actions">
                <span class="expense-price ${colorClass}">${sign} Rp ${formatCurrency(item.amount)}</span>
                <button class="delete-btn" onclick="deleteTransaction('${item.id}')">X</button>
            </div>
        `;
        expenseList.appendChild(li);
    }

    animateBalance(previousBalance, currentBalance, 800);
    previousBalance = currentBalance; 
    justSubmitted = false; 
}

// --- SUBMIT TRANSACTION TO FIRESTORE ---
form.addEventListener('submit', function(e) {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const finalDescription = descInput.value.trim() !== '' ? descInput.value : 'No description';

    const newTransaction = {
        userId: currentUser.uid, 
        type: typeInput.value,
        desc: finalDescription,
        amount: parseInt(amountInput.value),
        date: timestamp,
        dateRaw: now.toISOString() 
    };

    justSubmitted = true;

    db.collection('transactions').add(newTransaction)
        .then(() => {
            form.reset();
            typeBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.type-btn[data-type="expense"]').classList.add('active');
            typeInput.value = 'expense';
        })
        .catch(error => {
            console.error("Error adding document: ", error);
        });
});

// --- DELETE FROM FIRESTORE ---
window.deleteTransaction = function(docId) {
    db.collection('transactions').doc(docId).delete()
        .catch(error => {
            console.error("Error removing document: ", error);
        });
};