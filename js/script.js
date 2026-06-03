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
const moonIcon      = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>`;
const sunIcon       = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const eyeOpenIcon   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeClosedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// =========================================
// 3. TEMA DARK MODE & SINKRONISASI GRAFIK
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
        updateChartTheme();
    });
}

// =========================================
// 4. INCOME/EXPENSE TOGGLE
// =========================================
const typeBtns  = document.querySelectorAll('.type-btn');
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
// 5. HIDE / SHOW BALANCE
// =========================================
let isBalanceHidden    = true;
let lastKnownBalance   = 0;
let currentDailyExpense  = 0;
let currentWeeklyExpense = 0;

const balanceToggleBtn = document.getElementById('balance-toggle');
const balanceEl        = document.getElementById('total-balance');

function applyBalanceVisibility() {
    if (!balanceEl || !balanceToggleBtn) return;
    const spendTodayEl = document.getElementById('spend-today');
    const spendWeekEl  = document.getElementById('spend-week');

    if (isBalanceHidden) {
        balanceEl.innerText = 'Rp ••••••';
        if (spendTodayEl) spendTodayEl.innerText = 'Rp ••••••';
        if (spendWeekEl)  spendWeekEl.innerText  = 'Rp ••••••';
        balanceToggleBtn.innerHTML = eyeClosedIcon;
    } else {
        balanceEl.innerText = `Rp ${lastKnownBalance.toLocaleString('id-ID')}`;
        if (spendTodayEl) spendTodayEl.innerText = `Rp ${currentDailyExpense.toLocaleString('id-ID')}`;
        if (spendWeekEl)  spendWeekEl.innerText  = `Rp ${currentWeeklyExpense.toLocaleString('id-ID')}`;
        balanceToggleBtn.innerHTML = eyeOpenIcon;
    }
}

applyBalanceVisibility();

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
// 6. CHART — income vs expense per hari
// =========================================
let expenseChart;
let allTransactions = [];

function getLocalYYYYMMDD(dateObj) {
    const year  = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day   = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function initChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";

    expenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Income',
                    data: [],
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderRadius: 3,
                    borderSkipped: false,
                },
                {
                    label: 'Expense',
                    data: [],
                    backgroundColor: 'rgba(239, 68, 68, 0.75)',
                    borderRadius: 3,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` Rp ${ctx.raw.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 }
                },
                y: {
                    border: { display: false },
                    beginAtZero: true,
                    ticks: {
                        maxTicksLimit: 5,
                        font: { size: 10 },
                        callback: v => v >= 1000000
                            ? (v / 1000000).toFixed(1) + 'jt'
                            : v >= 1000 ? (v / 1000).toFixed(0) + 'rb' : v
                    }
                }
            }
        }
    });

    updateChartTheme();
}

function updateChartTheme() {
    if (!expenseChart) return;
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#a1a1aa' : '#71717a';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

    expenseChart.options.scales.x.ticks.color = textColor;
    expenseChart.options.scales.y.ticks.color = textColor;
    expenseChart.options.scales.y.grid.color  = gridColor;
    expenseChart.update();
}

// =========================================
// 6.2. MONTH FILTER
// =========================================
function populateMonthFilter() {
    const select = document.getElementById('month-filter');
    if (!select) return;

    const months = new Set();
    allTransactions.forEach(tx => {
        if (tx.createdAt) {
            const d   = tx.createdAt.toDate();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.add(key);
        }
    });

    const now        = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentKey);

    const sorted   = Array.from(months).sort().reverse();
    const prevVal  = select.value || currentKey;

    select.innerHTML = sorted.map(m => {
        const [y, mo] = m.split('-');
        const label   = new Date(y, mo - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        return `<option value="${m}" ${m === prevVal ? 'selected' : ''}>${label}</option>`;
    }).join('');

    if (!select.dataset.bound) {
        select.addEventListener('change', () => renderChartForMonth(select.value));
        select.dataset.bound = '1';
    }
}

function getSelectedMonth() {
    const select = document.getElementById('month-filter');
    if (select && select.value) return select.value;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function renderChartForMonth(monthKey) {
    if (!expenseChart) return;
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth   = new Date(year, month, 0).getDate();

    const incomeByDay  = Array(daysInMonth).fill(0);
    const expenseByDay = Array(daysInMonth).fill(0);

    allTransactions.forEach(tx => {
        if (!tx.createdAt) return;
        const d = tx.createdAt.toDate();
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
            const idx = d.getDate() - 1;
            if (tx.type === 'income') incomeByDay[idx]  += Number(tx.amount);
            else                       expenseByDay[idx] += Number(tx.amount);
        }
    });

    expenseChart.data.labels              = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    expenseChart.data.datasets[0].data    = incomeByDay;
    expenseChart.data.datasets[1].data    = expenseByDay;
    expenseChart.update();
}

// =========================================
// 6.3. SWIPE / CAROUSEL
// =========================================
window.goToSlide = function(index) {
    const swiper = document.getElementById('swipe-area');
    if (swiper) {
        const width = swiper.clientWidth;
        swiper.style.scrollSnapType  = 'none';
        swiper.style.scrollBehavior  = 'smooth';
        swiper.scrollTo({ left: index * width });
        setTimeout(() => { swiper.style.scrollSnapType = 'x mandatory'; }, 300);
    }
};

const swiper = document.getElementById('swipe-area');
if (swiper) {
    swiper.addEventListener('scroll', () => {
        const activeIndex = Math.round(swiper.scrollLeft / swiper.clientWidth);
        document.getElementById('dot-1').classList.toggle('active', activeIndex === 0);
        document.getElementById('dot-2').classList.toggle('active', activeIndex === 1);
    });

    let isDown = false, startX, scrollLeft;

    swiper.addEventListener('mousedown', e => {
        if (e.target.closest('input, button, a, select')) return;
        isDown = true;
        swiper.style.scrollSnapType = 'none';
        swiper.style.scrollBehavior = 'auto';
        startX     = e.pageX - swiper.offsetLeft;
        scrollLeft = swiper.scrollLeft;
    });

    const stopDragAndSnap = () => {
        if (!isDown) return;
        isDown = false;
        const activeIndex = Math.round(swiper.scrollLeft / swiper.clientWidth);
        swiper.style.scrollBehavior = 'smooth';
        swiper.scrollTo({ left: activeIndex * swiper.clientWidth });
        setTimeout(() => { swiper.style.scrollSnapType = 'x mandatory'; }, 300);
    };

    swiper.addEventListener('mouseleave', stopDragAndSnap);
    swiper.addEventListener('mouseup',    stopDragAndSnap);
    swiper.addEventListener('mousemove',  e => {
        if (!isDown) return;
        e.preventDefault();
        const walk = (e.pageX - swiper.offsetLeft - startX) * 1.5;
        swiper.scrollLeft = scrollLeft - walk;
    });
}

// =========================================
// 6.4. DRAG RECENT TRANSACTIONS
// =========================================
const txList = document.getElementById('expense-list');
if (txList) {
    let isTxDown = false, txStartX, txScrollLeft;

    txList.addEventListener('mousedown', e => {
        if (e.target.closest('.delete-btn')) return;
        isTxDown    = true;
        txList.style.scrollSnapType = 'none';
        txList.style.scrollBehavior = 'auto';
        txStartX    = e.pageX - txList.offsetLeft;
        txScrollLeft = txList.scrollLeft;
    });

    const stopTxDrag = () => {
        if (!isTxDown) return;
        isTxDown = false;
        const card = txList.querySelector('.expense-item');
        if (card) {
            const gap       = parseFloat(window.getComputedStyle(txList).gap) || 0;
            const cardWidth = card.offsetWidth + gap;
            const activeIdx = Math.round(txList.scrollLeft / cardWidth);
            txList.style.scrollBehavior = 'smooth';
            txList.scrollTo({ left: activeIdx * cardWidth });
        }
        setTimeout(() => { txList.style.scrollSnapType = 'x mandatory'; }, 300);
    };

    txList.addEventListener('mouseleave', stopTxDrag);
    txList.addEventListener('mouseup',    stopTxDrag);
    txList.addEventListener('mousemove',  e => {
        if (!isTxDown) return;
        e.preventDefault();
        txList.scrollLeft = txScrollLeft - (e.pageX - txList.offsetLeft - txStartX) * 1.5;
    });
}

// =========================================
// 7. OTENTIKASI & INIT
// =========================================
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    const greeting = document.getElementById('user-greeting');
    if (greeting) greeting.innerText = `Hello, ${user.displayName || 'User'}!`;

    initChart();

    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && typeof doc.data().balanceHidden !== 'undefined') {
            isBalanceHidden = doc.data().balanceHidden;
        }
        applyBalanceVisibility();
        loadTransactions(user.uid);
    }).catch(() => {
        loadTransactions(user.uid);
    });
});

window.logout = function() {
    auth.signOut().then(() => { window.location.href = '/login.html'; });
};

// =========================================
// 8. LOAD TRANSAKSI
// =========================================
let knownTxIds      = new Set();
let isInitialTxLoad = true;

function loadTransactions(uid) {
    const list = document.getElementById('expense-list');
    if (!list) return;

    if (isInitialTxLoad) {
        list.innerHTML = `<li class="loading-placeholder">Loading transactions...</li>`;
    }

    db.collection('users').doc(uid).collection('transactions')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            list.innerHTML = '';
            allTransactions  = [];
            let total        = 0;
            currentDailyExpense  = 0;
            currentWeeklyExpense = 0;

            const currentIds = new Set();
            const today      = new Date();
            today.setHours(0, 0, 0, 0);

            const last7DaysDates = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                last7DaysDates.push(getLocalYYYYMMDD(d));
            }

            if (snapshot.empty) {
                list.innerHTML = `<li class="empty-state">No transactions yet. Add your first one!</li>`;
            }

            snapshot.forEach(doc => {
                currentIds.add(doc.id);
                const isNewTx = !isInitialTxLoad && !knownTxIds.has(doc.id);
                const data    = { id: doc.id, ...doc.data() };
                allTransactions.push(data);

                const amount = Number(data.amount);

                if (data.type === 'income') {
                    total += amount;
                } else {
                    total -= amount;
                    if (data.createdAt) {
                        const txDate = data.createdAt.toDate();
                        if (txDate.getTime() >= today.getTime()) currentDailyExpense += amount;
                        if (last7DaysDates.includes(getLocalYYYYMMDD(txDate))) currentWeeklyExpense += amount;
                    }
                }

                let dateStr = '';
                if (data.createdAt) {
                    dateStr = data.createdAt.toDate().toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    });
                }

                const li = document.createElement('li');
                li.className = `expense-item ${isNewTx ? `flash-${data.type}` : ''}`;
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
                li.querySelector('.delete-btn').addEventListener('click', () => deleteTx(doc.id));
                list.appendChild(li);
            });

            knownTxIds      = currentIds;
            isInitialTxLoad = false;

            lastKnownBalance = total;
            if (balanceEl) {
                balanceEl.classList.toggle('balance-negative', total < 0);
                balanceEl.classList.toggle('balance-positive', total > 0);
            }
            applyBalanceVisibility();

            // Update chart
            populateMonthFilter();
            renderChartForMonth(getSelectedMonth());

        }, err => {
            console.error('Firestore error:', err);
            list.innerHTML = `<li class="empty-state">Failed to load transactions. Please refresh.</li>`;
        });
}

// =========================================
// 9. TAMBAH TRANSAKSI
// =========================================
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', e => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const submitBtn = expenseForm.querySelector('button[type="submit"]');
        const type      = document.getElementById('type').value;
        const desc      = document.getElementById('desc').value.trim();
        const amount    = document.getElementById('amount').value;

        submitBtn.disabled    = true;
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
            goToSlide(0);
        }).catch(err => {
            alert('Gagal menambah data: ' + err.message);
        }).finally(() => {
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Add Transaction';
        });
    });
}

// =========================================
// 10. HAPUS TRANSAKSI
// =========================================
function deleteTx(id) {
    const user = auth.currentUser;
    if (!user) return;
    if (!confirm('Delete this transaction?')) return;
    db.collection('users').doc(user.uid).collection('transactions').doc(id).delete()
        .catch(err => alert('Gagal menghapus: ' + err.message));
}

// =========================================
// 11. EXPORT CSV
// =========================================
document.getElementById('export-btn')?.addEventListener('click', () => {
    if (!allTransactions.length) {
        alert('Belum ada transaksi untuk diekspor.');
        return;
    }

    const monthKey      = getSelectedMonth();
    const [year, month] = monthKey.split('-').map(Number);

    const filtered = allTransactions.filter(tx => {
        if (!tx.createdAt) return false;
        const d = tx.createdAt.toDate();
        return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    if (!filtered.length) {
        alert('Tidak ada transaksi di bulan yang dipilih.');
        return;
    }

    const header = ['Tanggal', 'Deskripsi', 'Tipe', 'Jumlah (Rp)'];
    const rows   = filtered.map(tx => {
        const dateStr = tx.createdAt
            ? tx.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-';
        const desc   = (tx.desc || (tx.type === 'income' ? 'Income' : 'Expense')).replace(/,/g, ' ');
        const type   = tx.type === 'income' ? 'Income' : 'Expense';
        const amount = tx.type === 'income' ? tx.amount : -tx.amount;
        return [dateStr, desc, type, amount];
    });

    const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const label = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    a.href     = url;
    a.download = `wallet-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});