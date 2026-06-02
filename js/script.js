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
let isBalanceHidden = true; 
let lastKnownBalance = 0;
let currentDailyExpense = 0;
let currentWeeklyExpense = 0;

const balanceToggleBtn = document.getElementById('balance-toggle');
const balanceEl = document.getElementById('total-balance');

function applyBalanceVisibility() {
    if (!balanceEl || !balanceToggleBtn) return;
    const spendTodayEl = document.getElementById('spend-today');
    const spendWeekEl = document.getElementById('spend-week');

    if (isBalanceHidden) {
        balanceEl.innerText = 'Rp ••••••';
        if (spendTodayEl) spendTodayEl.innerText = 'Rp ••••••';
        if (spendWeekEl) spendWeekEl.innerText = 'Rp ••••••';
        balanceToggleBtn.innerHTML = eyeClosedIcon;
    } else {
        balanceEl.innerText = `Rp ${lastKnownBalance.toLocaleString('id-ID')}`;
        if (spendTodayEl) spendTodayEl.innerText = `Rp ${currentDailyExpense.toLocaleString('id-ID')}`;
        if (spendWeekEl) spendWeekEl.innerText = `Rp ${currentWeeklyExpense.toLocaleString('id-ID')}`;
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
// 6. INIT CHART & NAVIGATION (CHART CAROUSEL)
// =========================================
let expenseChart;

function initChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    // FIX: Tembak langsung nama font spesifik sesuai CSS lu biar nggak "aneh"
    Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";

    expenseChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Pengeluaran',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderWidth: 2,
                tension: 0, 
                fill: false, 
                pointRadius: 4, 
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Rp ' + context.parsed.y.toLocaleString('id-ID');
                        }
                    }
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 11 } } 
                },
                y: { 
                    border: { display: false },
                    beginAtZero: true,
                    ticks: { 
                        maxTicksLimit: 5, 
                        font: { size: 11 },
                        callback: function(value) {
                            if (value === 0) return '0';
                            return value >= 1000 ? (value / 1000) + 'k' : value;
                        }
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
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'; 
    const lineColor = isDark ? '#ffffff' : '#000000'; 

    expenseChart.data.datasets[0].borderColor = lineColor;
    expenseChart.data.datasets[0].backgroundColor = lineColor;
    expenseChart.options.scales.x.ticks.color = textColor;
    expenseChart.options.scales.y.ticks.color = textColor;
    expenseChart.options.scales.y.grid.color = gridColor;
    
    expenseChart.update();
}

function getLocalYYYYMMDD(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

window.goToSlide = function(index) {
    const swiper = document.getElementById('swipe-area');
    if (swiper) {
        const width = swiper.clientWidth;
        swiper.style.scrollSnapType = 'none'; 
        swiper.style.scrollBehavior = 'smooth';
        swiper.scrollTo({ left: index * width });
        setTimeout(() => {
            swiper.style.scrollSnapType = 'x mandatory'; 
        }, 300);
    }
};

const swiper = document.getElementById('swipe-area');
if (swiper) {
    swiper.addEventListener('scroll', () => {
        const scrollLeft = swiper.scrollLeft;
        const width = swiper.clientWidth;
        const activeIndex = Math.round(scrollLeft / width);
        
        document.getElementById('dot-1').classList.toggle('active', activeIndex === 0);
        document.getElementById('dot-2').classList.toggle('active', activeIndex === 1);
    });

    let isDown = false;
    let startX;
    let scrollLeft;

    swiper.addEventListener('mousedown', (e) => {
        if (e.target.closest('input, button, a')) return; 
        
        isDown = true;
        swiper.style.scrollSnapType = 'none'; 
        swiper.style.scrollBehavior = 'auto'; 
        startX = e.pageX - swiper.offsetLeft;
        scrollLeft = swiper.scrollLeft;
    });
    
    const stopDragAndSnap = () => {
        if (!isDown) return;
        isDown = false;
        
        const width = swiper.clientWidth;
        const activeIndex = Math.round(swiper.scrollLeft / width);
        
        swiper.style.scrollBehavior = 'smooth';
        swiper.scrollTo({ left: activeIndex * width });
        
        setTimeout(() => {
            swiper.style.scrollSnapType = 'x mandatory'; 
        }, 300);
    };

    swiper.addEventListener('mouseleave', stopDragAndSnap);
    swiper.addEventListener('mouseup', stopDragAndSnap);
    
    swiper.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault(); 
        const x = e.pageX - swiper.offsetLeft;
        const walk = (x - startX) * 1.5; 
        swiper.scrollLeft = scrollLeft - walk;
    });
}

// =========================================
// 6.5. LOGIKA DRAG UNTUK RECENT TRANSACTIONS
// =========================================
const txList = document.getElementById('expense-list');
if (txList) {
    let isTxDown = false;
    let txStartX;
    let txScrollLeft;

    txList.addEventListener('mousedown', (e) => {
        if (e.target.closest('.delete-btn')) return; 
        
        isTxDown = true;
        txList.style.scrollSnapType = 'none'; 
        txList.style.scrollBehavior = 'auto'; 
        txStartX = e.pageX - txList.offsetLeft;
        txScrollLeft = txList.scrollLeft;
    });
    
    const stopTxDrag = () => {
        if (!isTxDown) return;
        isTxDown = false;
        
        const card = txList.querySelector('.expense-item');
        if (card) {
            const style = window.getComputedStyle(txList);
            const gap = parseFloat(style.gap) || 0;
            const cardWidth = card.offsetWidth + gap;
            const activeIndex = Math.round(txList.scrollLeft / cardWidth);
            
            txList.style.scrollBehavior = 'smooth';
            txList.scrollTo({ left: activeIndex * cardWidth });
        }
        
        setTimeout(() => {
            txList.style.scrollSnapType = 'x mandatory'; 
        }, 300);
    };

    txList.addEventListener('mouseleave', stopTxDrag);
    txList.addEventListener('mouseup', stopTxDrag);
    
    txList.addEventListener('mousemove', (e) => {
        if (!isTxDown) return;
        e.preventDefault(); 
        const x = e.pageX - txList.offsetLeft;
        const walk = (x - txStartX) * 1.5; 
        txList.scrollLeft = txScrollLeft - walk;
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
    if (greeting) {
        greeting.innerText = `Hello, ${user.displayName || 'User'}!`;
    }

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

window.logout = function () {
    auth.signOut().then(() => {
        window.location.href = '/login.html';
    });
};

// =========================================
// 8. LOAD TRANSAKSI & INJECT DATA KE CHART
// =========================================
// Variabel memori buat bedain transaksi lama & transaksi baru
let knownTxIds = new Set();
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
            let total = 0;
            currentDailyExpense = 0;
            currentWeeklyExpense = 0;
            
            const currentIds = new Set();

            if (snapshot.empty) {
                list.innerHTML = `<li class="empty-state">No transactions yet. Add your first one!</li>`;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const last7DaysLabels = [];
            const last7DaysDates = [];
            const chartData = [0, 0, 0, 0, 0, 0, 0];
            
            for (let i = 6; i >= 0; i--) {
                let d = new Date(today);
                d.setDate(today.getDate() - i);
                last7DaysLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                last7DaysDates.push(getLocalYYYYMMDD(d));
            }

            snapshot.forEach(doc => {
                currentIds.add(doc.id);
                const isNewTx = !isInitialTxLoad && !knownTxIds.has(doc.id);

                const data = doc.data();
                const amount = Number(data.amount);

                if (data.type === 'income') {
                    total += amount;
                } else {
                    total -= amount;
                    if (data.createdAt) {
                        const txDateObj = data.createdAt.toDate();
                        const txDateStr = getLocalYYYYMMDD(txDateObj);

                        if (txDateObj.getTime() >= today.getTime()) {
                            currentDailyExpense += amount;
                        }

                        const chartIndex = last7DaysDates.indexOf(txDateStr);
                        if (chartIndex !== -1) {
                            chartData[chartIndex] += amount;
                        }
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

                li.querySelector('.delete-btn').addEventListener('click', () => {
                    deleteTx(doc.id);
                });

                list.appendChild(li);
            });

            knownTxIds = currentIds;
            isInitialTxLoad = false;

            currentWeeklyExpense = chartData.reduce((a, b) => a + b, 0);

            lastKnownBalance = total;
            if (balanceEl) {
                balanceEl.classList.toggle('balance-negative', total < 0);
                balanceEl.classList.toggle('balance-positive', total > 0);
            }
            applyBalanceVisibility();

            if (expenseChart) {
                expenseChart.data.labels = last7DaysLabels;
                expenseChart.data.datasets[0].data = chartData;
                expenseChart.update();
            }

        }, err => {
            console.error("Firestore error:", err);
            list.innerHTML = `<li class="empty-state">Failed to load transactions. Please refresh.</li>`;
        });
}

// =========================================
// 9. TAMBAH TRANSAKSI
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
            
            goToSlide(0); 
        }).catch(err => {
            alert("Gagal menambah data: " + err.message);
        }).finally(() => {
            submitBtn.disabled = false;
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
        .catch(err => alert("Gagal menghapus: " + err.message));
}