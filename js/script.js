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
// 2. OTENTIKASI & LOGOUT
// =========================================
auth.onAuthStateChanged(user => {
    if (!user) {
        // Kalau belum login, tendang ke halaman login
        window.location.href = '/login';
    } else {
        // Kalau udah login, tampilin nama
        const greeting = document.getElementById('user-greeting');
        if (greeting) {
            greeting.innerText = `Hello, ${user.displayName || 'User'}!`;
        }
        // Load data keuangan user tersebut
        loadTransactions(user.uid);
    }
});

// Fungsi Logout (Dipanggil sama tombol di index.html)
window.logout = function() {
    auth.signOut().then(() => {
        window.location.href = '/login';
    });
};

// =========================================
// 3. TEMA DARK MODE (Untuk Dashboard)
// =========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>`;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

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
// 4. SISTEM TRACKER KEUANGAN (DASHBOARD)
// =========================================
const typeBtns = document.querySelectorAll('.type-btn');
const typeInput = document.getElementById('type');

// Logika buat tombol ubah Income/Expense
if (typeBtns && typeInput) {
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            typeInput.value = btn.dataset.type;
        });
    });
}

// Logika buat Nampilin Data ke layar
function loadTransactions(uid) {
    const list = document.getElementById('expense-list');
    if (!list) return;

    db.collection('users').doc(uid).collection('transactions')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
          list.innerHTML = '';
          let total = 0;

          snapshot.forEach(doc => {
              const data = doc.data();
              const amount = Number(data.amount);
              
              if (data.type === 'income') total += amount;
              else total -= amount;

              // Format tanggal
              let dateStr = '';
              if (data.createdAt) {
                  dateStr = data.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
                      <button class="delete-btn" onclick="deleteTx('${doc.id}')">✕</button>
                  </div>
              `;
              list.appendChild(li);
          });

          // Update total saldo
          const balanceEl = document.getElementById('total-balance');
          if (balanceEl) balanceEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
      });
}

// Logika Input Data Baru
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const type = document.getElementById('type').value;
        const desc = document.getElementById('desc').value;
        const amount = document.getElementById('amount').value;

        db.collection('users').doc(user.uid).collection('transactions').add({
            type: type,
            desc: desc,
            amount: Number(amount),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            expenseForm.reset();
            // Kembalikan tombol ke default (Expense)
            typeBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('[data-type="expense"]').classList.add('active');
            typeInput.value = 'expense';
        }).catch(err => alert("Gagal menambah data: " + err.message));
    });
}

// Logika Hapus Data
window.deleteTx = function(id) {
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).collection('transactions').doc(id).delete()
          .catch(err => alert("Gagal menghapus: " + err.message));
    }
};