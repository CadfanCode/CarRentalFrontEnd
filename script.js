// Endpoint URLS
const AUTH_URL = 'http://127.0.0.1:8080/api/v1/auth/login';
const CAR_URL = 'http://127.0.0.1:8080/api/v1/cars';
const BOOKINGS_URL = 'http://127.0.0.1:8080/api/v1/bookings';
const USERDETAILS_URL = 'http://127.0.0.1:8080/api/v1/users';

// DOM Elements
const loginView = document.getElementById('login-view');
const carView = document.getElementById('car-view');
const adminView = document.getElementById('admin-view');
const bookingsView = document.getElementById('bookings-view'); // Mina bokningar
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const navList = document.getElementById('nav-list');
const logoutBtn = document.getElementById('logout-btn');

// --- BOOKING STATE & WIZARD ELEMENTS ---
let bookingDraft = {
    car: null,
    fromDate: null,
    toDate: null
};

const viewCarList = document.getElementById('view-car-list');
const viewDatePicker = document.getElementById('view-date-picker');
const viewSummary = document.getElementById('view-summary');
const datePickerTitle = document.getElementById('date-picker-title');
const dateInput = document.getElementById('date-input');
const btnNextDate = document.getElementById('btn-next-date');
const summaryDetails = document.getElementById('summary-details');
const btnConfirmBooking = document.getElementById('btn-confirm-booking');


function resetBookingProcess() {
    bookingDraft = { car: null, fromDate: null, toDate: null };
    dateInput.value = '';
    
    // Switch the internal car-view back to the car list
    viewCarList.classList.remove('hidden');
    viewDatePicker.classList.add('hidden');
    viewSummary.classList.add('hidden');
    
    // Ensure the main navigation view is also set to carView (if applicable)
    // switchView(carView); // Re-calls fetchCars, which is fine to refresh the list
}


// --- Helper Functions (Router) ---
function switchView(viewElement) {
    const allViews = [loginView, carView, adminView, bookingsView];
    allViews.forEach(view => {
        if (view) view.style.display = 'none';
    });

    if (viewElement) {
        viewElement.style.display = 'block';
        
        // Reset the booking view state when switching to carView
        if (viewElement === carView) {
            resetBookingProcess(); 
            fetchCars(); 
        }
        else if (viewElement === adminView) fetchAdminData();
        else if (viewElement === bookingsView) fetchBookings();
    }
}

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

    const links = navList.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = e.target.getAttribute('data-view');
            const targetViewElement = document.getElementById(targetViewId);

            if (targetViewId.startsWith('admin-')) {
                switchView(adminView);
                loadAdminContent(targetViewId);
            } else if (targetViewElement) {
                switchView(targetViewElement);
            }
        });
    });
}

// --- Handle Login ---
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            const authString = 'Basic ' + btoa(username + ':' + password);
            localStorage.setItem('auth', authString);
            localStorage.setItem('isAdmin', data.isAdmin);

            updateNavigation(data.isAdmin);

            if (data.isAdmin) switchView(adminView);
            else switchView(carView);
        } else {
            errorMsg.innerText = "Fel inloggning (Invalid credentials)";
        }
    } catch (error) {
        console.error("Connection error:", error);
        errorMsg.innerText = "Kunde inte ansluta till servern.";
    }
});

// --- LOGOUT BUTTON ---
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('isAdmin');
    switchView(loginView);
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    errorMsg.innerText = '';
});

/**
 * Loads specific content into the main adminView container.
 * @param {string} contentType - The specific admin content to load (e.g., 'admin-bookings').
 */
function loadAdminContent(contentType) {
    const adminTbody = document.getElementById('admin-tbody');
    adminTbody.innerHTML = '';

    if (contentType === 'admin-bookings') fetchAndDisplayAllBookings();
    else if (contentType === 'admin-cars') fetchAndDisplayAdminCars();
    else if (contentType === 'admin-users') fetchAndDisplayAllUsers();
}

// --- USER BOOKINGS VIEW ---
async function fetchBookings() {
    const auth = localStorage.getItem('auth');
    try {
        const response = await fetch(BOOKINGS_URL + `/me`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Authorization': auth || '' }
        });

        if (response.ok) {
            const bookings = await response.json();
            populateBookingsTable(bookings);
        } else console.error('Failed to fetch bookings');
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

async function populateBookingsTable(bookings) {
    const auth = localStorage.getItem('auth');
    const tbody = document.getElementById('bookings-table-body');
    tbody.innerHTML = '';

    for (const booking of bookings) {
        const carResponse = await fetch(`${CAR_URL}/${booking.carId}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Authorization': auth || '' }
        });
        const car = await carResponse.json();

        const tr = document.createElement('tr');

        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        if (car.image) img.src = `data:image/jpeg;base64,${car.image}`;
        else img.alt = 'No Image';
        img.width = 100;
        tdImg.appendChild(img);
        tr.appendChild(tdImg);

        const tdName = document.createElement('td');
        tdName.textContent = `${car.make} ${car.model}`;
        tr.appendChild(tdName);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = `${car.price} €`;
        tr.appendChild(tdPrice);

        const tdFrom = document.createElement('td');
        tdFrom.textContent = booking.fromDate;
        tr.appendChild(tdFrom);

        const tdTo = document.createElement('td');
        tdTo.textContent = booking.toDate;
        tr.appendChild(tdTo);

        tbody.appendChild(tr);
    }
}

// --- ADMIN VIEW ---
// --- ALL BOOKINGS ---
async function fetchAndDisplayAllBookings() {
    const auth = localStorage.getItem('auth');

    try {
        const response = await fetch(BOOKINGS_URL, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Authorization': auth || '' }
        });

        if (response.ok) {
            const bookings = await response.json();
            populateAdminBookingsTable(bookings);
        } else console.error('Failed to fetch all bookings');
    } catch (error) {
        console.error('Error fetching all bookings:', error);
    }
}

async function populateAdminBookingsTable(bookings) {
    const auth = localStorage.getItem('auth');
    const tbody = document.getElementById('admin-tbody');
    const table = document.getElementById('admin-table'); 

    const existingThead = table.querySelector('thead');
    if (existingThead) {
        existingThead.remove();
    }

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Bild</th>
            <th>Märke/Modell</th>
            <th>Pris</th>
            <th>Från</th>
            <th>Till</th>
            <th>Användare</th>
        </tr>
    `;

    table.insertBefore(thead, tbody);
    tbody.innerHTML = '';

    for (const booking of bookings) {
        const carResponse = await fetch(`${CAR_URL}/${booking.carId}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Authorization': auth || '' }
        });
        const car = await carResponse.json();

        const tr = document.createElement('tr');

        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        if (car.image) img.src = `data:image/jpeg;base64,${car.image}`;
        else img.alt = 'No Image';
        img.width = 100;
        tdImg.appendChild(img);
        tr.appendChild(tdImg);

        const tdName = document.createElement('td');
        tdName.textContent = `${car.make} ${car.model}`;
        tr.appendChild(tdName);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = `${car.price} €`;
        tr.appendChild(tdPrice);

        const tdFrom = document.createElement('td');
        tdFrom.textContent = booking.fromDate;
        tr.appendChild(tdFrom);

        const tdTo = document.createElement('td');
        tdTo.textContent = booking.toDate;
        tr.appendChild(tdTo);

        const tdUser = document.createElement('td');
        tdUser.textContent = booking.userId;
        tr.appendChild(tdUser);

        tbody.appendChild(tr);
    }
}

// --- ADMIN VIEW ---
// --- ALL USERS ---
async function fetchAndDisplayAllUsers(){
    const auth = localStorage.getItem('auth');
    try {  
        const response = await fetch(USERDETAILS_URL, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Authorization': auth || '' }
        });
        if (response.ok) {
            const users = await response.json();
            populateAdminUsersTable(users);
        } else console.error('Failed to fetch users');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

async function populateAdminUsersTable(users) {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = '';

    for (const user of users) {
        // This is a row for each user
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.textContent = user.id;
        tr.appendChild(tdId);

        const tdUsername = document.createElement('td');
        tdUsername.textContent = user.username;
        tr.appendChild(tdUsername);
        
        const tdFirstName = document.createElement('td');
        tdFirstName.textContent = user.firstName;
        tr.appendChild(tdFirstName);

        const tdLastName = document.createElement('td');
        tdLastName.textContent = user.lastName;
        tr.appendChild(tdLastName);
        
        const tdPhoneNumber = document.createElement('td');
        tdPhoneNumber.textContent = user.phoneNumber || 'N/A';
        tr.appendChild(tdPhoneNumber);

        const tdEmail = document.createElement('td');
        tdEmail.textContent = user.email || 'N/A';
        tr.appendChild(tdEmail);

        const tdNoOfOrders = document.createElement('td');
        tdNoOfOrders.textContent = user.numberOfOrders || 0;
        tr.appendChild(tdNoOfOrders);

        const tdIsAdmin = document.createElement('td');
        tdIsAdmin.textContent = user.role && user.role === 'ROLE_ADMIN' ? 'ADMIN' : 'USER'; // A nice ternary usage if I do say so myself!
        tr.appendChild(tdIsAdmin);

        tbody.appendChild(tr);
    }
        

// --- CAR VIEW ---
async function fetchCars() {
    const auth = localStorage.getItem('auth');
    try {
        const response = await fetch(CAR_URL, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Authorization': auth || '' }
        });
        if (response.ok) {
            const cars = await response.json();
            populateCarTable(cars);
        } else console.error('Failed to fetch cars');
    } catch (error) {
        console.error('Error fetching cars:', error);
    }
}

function populateCarTable(cars) {
    const tbody = document.getElementById('car-table-body-interactive'); 
    tbody.innerHTML = '';

    cars.forEach(car => {
        const tr = document.createElement('tr');
        
        // Makes the row interactive for booking
        tr.classList.add('car-row-interactive');
        tr.onclick = () => handleCarSelection(car);
        
        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        if (car.image) img.src = `data:image/jpeg;base64,${car.image}`;
        else img.alt = "No Image";
        img.width = 100;
        tdImg.appendChild(img);
        tr.appendChild(tdImg);

        const tdName = document.createElement('td');
        tdName.textContent = `${car.make || car.name} ${car.model}`; // Using car.make if available
        tr.appendChild(tdName);

        const tdType = document.createElement('td');
        tdType.textContent = car.type;
        tr.appendChild(tdType);

        const tdPrice = document.createElement('td');
        tdPrice.textContent = (car.price || 'N/A') + ' kr';
        tr.appendChild(tdPrice);

        const tdDesc = document.createElement('td');
        tdDesc.textContent = [car.feature1, car.feature2, car.feature3].filter(Boolean).join(', ');
        tr.appendChild(tdDesc);

        tbody.appendChild(tr);
    });
}

// --- BOOKING WIZARD ---

function handleCarSelection(car) {
    bookingDraft.car = car;
    
    // Hide car list, show date picker
    viewCarList.classList.add('hidden');
    viewDatePicker.classList.remove('hidden');
    
    // Start with the 'from' date selection
    setupDatePicker('from');
}

function setupDatePicker(type) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today); // Prevent booking in the past
    
    // Clear previous input
    dateInput.value = ''; 

    if (type === 'from') {
        datePickerTitle.textContent = `Välj upphämtningsdatum för ${bookingDraft.car.make || bookingDraft.car.name} ${bookingDraft.car.model}`;
        
        btnNextDate.onclick = () => {
            if(!dateInput.value) return alert("Vänligen välj ett datum (Please select a date).");
            
            bookingDraft.fromDate = dateInput.value;
            // Move to next step: Until Date
            setupDatePicker('until'); 
        };
    } else if (type === 'until') {
        datePickerTitle.textContent = `Välj returdatum för ${bookingDraft.car.make || bookingDraft.car.name} ${bookingDraft.car.model}`;
        
        // Ensure return date is after pickup date
        dateInput.setAttribute('min', bookingDraft.fromDate); 
        
        btnNextDate.onclick = () => {
            if(!dateInput.value) return alert("Vänligen välj ett datum (Please select a date).");
            
            // Re-check validation
            if(new Date(dateInput.value) <= new Date(bookingDraft.fromDate)) {
                return alert("Returdatum måste vara efter upphämtningsdatum (Return date must be after pickup date).");
            }
            
            bookingDraft.toDate = dateInput.value;
            showSummary();
        };
    }
}

function showSummary() {
    viewDatePicker.classList.add('hidden');
    viewSummary.classList.remove('hidden');

    const car = bookingDraft.car;
    const start = new Date(bookingDraft.fromDate);
    const end = new Date(bookingDraft.toDate);
    
    // Calculate total days
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const pricePerDay = parseFloat(car.price); 
    const total = days * pricePerDay; 
    
    const totalDisplay = isNaN(total) ? 'N/A' : `${total.toFixed(2)} kr`;

    summaryDetails.innerHTML = `
        <h3>Översikt: ${car.make || car.name} ${car.model}</h3>
        <p><strong>Upphämtning:</strong> ${bookingDraft.fromDate}</p>
        <p><strong>Retur:</strong> ${bookingDraft.toDate}</p>
        <p><strong>Totala dagar:</strong> ${days} dagar</p>
        <p><strong>Pris per dag:</strong> ${pricePerDay.toFixed(2)} kr</p>
        <hr>
        <p><strong>Total kostnad:</strong> ${totalDisplay}</p>
    `;
    btnConfirmBooking.onclick = submitBooking;
}


async function submitBooking() {
    const auth = localStorage.getItem('auth');
    const car = bookingDraft.car;

    const payload = {
        carId: car.id, // Assumes car object has an 'id' property
        fromDate: bookingDraft.fromDate,
        toDate: bookingDraft.toDate
    };
    
    // Disable button to prevent double submission
    btnConfirmBooking.disabled = true;

    try {
        const response = await fetch(BOOKINGS_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Authorization': auth || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(`Bokning av ${car.make || car.name} ${car.model} bekräftad!`);
        } else {
            // Get error message from backend if possible
            const error = await response.json().catch(() => ({ message: 'Serverfel (Server error).' }));
            alert(`Bokning misslyckades: ${error.message || response.statusText}`);
        }
    } catch (e) {
        console.error("Booking submission error:", e);
        alert('Kunde inte ansluta till servern för att bekräfta bokningen.');
    } finally {
        btnConfirmBooking.disabled = false;
        resetBookingProcess(); // Go back to car list view
    }
}


// --- Initial Setup on Page Load (Unmodified) ---
document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const auth = localStorage.getItem('auth');

    if (auth) {
        updateNavigation(isAdmin);
        if (isAdmin) switchView(adminView);
        else switchView(carView);
    } else switchView(loginView);
});
}

function fetchAdminData() {
    // Defaults to showing bookings when Admin view is first loaded
    loadAdminContent('admin-bookings'); 
}