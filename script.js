// Endpoint URLS
const AUTH_URL = 'http://127.0.0.1:8080/api/v1/auth/login';
const CAR_URL = 'http://127.0.0.1:8080/api/v1/cars';

// DOM Elements
const loginView = document.getElementById('login-view');
const carView = document.getElementById('car-view');
const adminView = document.getElementById('admin-view');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');

// --- Handle Login ---
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json' // We are sending JSON
            },
            // Backend expects @RequestBody with username and password
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (response.ok) {
            // Parse the JSON response from the backend
            const data = await response.json();

            // Create auth string for FUTURE requests (if other endpoints need Basic Auth)
            const authString = 'Basic ' + btoa(username + ':' + password);
            localStorage.setItem('auth', authString);

            // Use the 'isAdmin' flag returned by the backend
            if (data.isAdmin) {
                showAdminView();
            } else {
                showCustomerView();
            }
        } else {
            errorMsg.innerText = "Fel inloggning (Invalid credentials)";
        }
    } catch (error) {
        console.error("Connection error:", error);
        errorMsg.innerText = "Kunde inte ansluta till servern.";
    }
});

// --- LOGOUT BUTTON ---
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', () => {
// Clear Auth data
localStorage.removeItem('auth');

// Hide all views
carView.style.display = 'none';
adminView.style.display = 'none';

// Show login view
loginView.style.display = 'block';

// Clear input fields
document.getElementById('username').value='';
document.getElementById('password').value='';
errorMsg.innerText = '';
})

// --- CAR VIEW ---
async function fetchCars() {
    const auth = localStorage.getItem('auth'); // retrieve auth

    try {
        const response = await fetch(CAR_URL, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Authorization': auth || ''
            }
        });

        if (response.ok) {
            const cars = await response.json();
            populateCarTable(cars);
        } else {
            console.error('Failed to fetch cars');
        }
    } catch (error) {
        console.error('Error fetching cars:', error);
    }
}


function populateCarTable(cars) {
    const tbody = document.getElementById('car-table-body');
    tbody.innerHTML = '';

    cars.forEach(car => {
        const tr = document.createElement('tr');

        // Image
        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        img.src = car.image;
        img.alt = car.name;
        img.width = 100;
        tdImg.appendChild(img);
        tr.appendChild(tdImg);

        // Name/Model
        const tdName = document.createElement('td');
        tdName.textContent = `${car.name} ${car.model}`;
        tr.appendChild(tdName);

        // Type
        const tdType = document.createElement('td');
        tdType.textContent = car.type;
        tr.appendChild(tdType);

        // Price
        const tdPrice = document.createElement('td');
        tdPrice.textContent = car.price + ' kr';
        tr.appendChild(tdPrice);

        // Features
        const tdDesc = document.createElement('td');
        tdDesc.textContent = [car.feature1, car.feature2, car.feature3].filter(Boolean).join(', ');
        tr.appendChild(tdDesc);

        tbody.appendChild(tr);
    });
}



function showCustomerView() {
    loginView.style.display = 'none';
    carView.style.display = 'block';
    fetchCars(); // load cars
}

function showAdminView() {
    loginView.style.display = 'none';
    adminView.style.display = 'block';
    fetchAdminData(); // load admin data
}