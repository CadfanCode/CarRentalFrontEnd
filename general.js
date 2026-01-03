// --- Endpoint URLS ---
const AUTH_URL = 'http://127.0.0.1:8080/api/v1/auth/login';
const CAR_URL = 'http://127.0.0.1:8080/api/v1/cars';
const BOOKINGS_URL = 'http://127.0.0.1:8080/api/v1/bookings';
const USERDETAILS_URL = 'http://127.0.0.1:8080/api/v1/users';

// --- Global DOM Elements ---
const loginView = document.getElementById('login-view');
const carView = document.getElementById('car-view');
const adminView = document.getElementById('admin-view');
const bookingsView = document.getElementById('bookings-view');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const navList = document.getElementById('nav-list');
const logoutBtn = document.getElementById('logout-btn');

// --- HELPER: ROUTER ---
function switchView(viewElement) {
    const allViews = [loginView, carView, adminView, bookingsView];
    allViews.forEach(view => { if (view) view.style.display = 'none'; });

    if (viewElement) {
        viewElement.style.display = 'block';

        // Triggers based on view
        if (viewElement === carView && typeof resetBookingProcess === 'function') {
            resetBookingProcess();
            fetchCars(); // Defined in user.js
        }
        else if (viewElement === adminView && typeof fetchAdminData === 'function') {
            fetchAdminData(); // Defined in admin.js
        }
        else if (viewElement === bookingsView && typeof fetchBookings === 'function') {
            fetchBookings(); // Defined in user.js
        }
    }
}

// --- UTILITIES ---
const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
             let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
             if ((encoded.length % 4) > 0) {
                encoded += '='.repeat(4 - (encoded.length % 4));
             }
             resolve(encoded);
        };
        reader.onerror = error => reject(error);
    });
};

function updateNavigation(isAdmin) {
    navList.innerHTML = '';
    if (isAdmin) {
        navList.innerHTML = `
            <li><a href="#bokningar" data-view="admin-bookings">Bokningar</a></li>
            <li><a href="#bilar" data-view="admin-cars">Bilar</a></li>
            <li><a href="#kunder" data-view="admin-users">Kunder</a></li>
        `;
    } else {
        navList.innerHTML = `
            <li><a href="#mina-bokningar" data-view="bookings-view">Mina bokningar</a></li>
            <li><a href="#lediga-bilar" data-view="car-view">Lediga bilar</a></li>
        `;
    }

    navList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = e.target.getAttribute('data-view');

            // Check if it's an admin view request
            if (targetViewId.startsWith('admin-')) {
                switchView(adminView);
                if(typeof loadAdminContent === 'function') {
                    loadAdminContent(targetViewId);
                }
            } else {
                const el = document.getElementById(targetViewId);
                if (el) switchView(el);
            }
        });
    });
}

// --- HANDLE LOGIN ---
if(loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            const response = await fetch(AUTH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (response.ok) {
                const data = await response.json();
                const authString = 'Basic ' + btoa(username + ':' + password);
                localStorage.setItem('auth', authString);
                localStorage.setItem('isAdmin', data.isAdmin);
                localStorage.setItem('userId', data.id); // This is needed later so that the relevant bookings can be fetched according to user id.
                updateNavigation(data.isAdmin);
                if (data.isAdmin) switchView(adminView);
                else switchView(carView);
            } else errorMsg.innerText = "Fel inloggning (Invalid credentials)";
        } catch (error) {
            console.error("Connection error:", error);
            errorMsg.innerText = "Kunde inte ansluta till servern.";
        }
    });
}

// --- HANDLE LOGOUT ---
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('auth');
        localStorage.removeItem('isAdmin');
        switchView(loginView);
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('bookings-table-body').innerHTML = '';
        if(errorMsg) errorMsg.innerText = '';
    });
}

// --- INITIAL SETUP ---
document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const auth = localStorage.getItem('auth');
    if (auth) {
        updateNavigation(isAdmin);
        if (isAdmin) switchView(adminView);
        else switchView(carView);
    } else {
        switchView(loginView);
    }
});