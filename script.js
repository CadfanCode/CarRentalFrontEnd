// Base URL for your API
const BASE_URL = 'http://localhost:8080/api/v1'; // Check your backend documentation for the exact path

// DOM Elements
const loginView = document.getElementById('login-view');
const carView = document.getElementById('car-view');
const adminView = document.getElementById('admin-view');
const loginBtn = document.getElementById('login-btn');

// 1. Handle Login
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Create the Basic Auth Header string: "Basic <base64encoded>"
    const authString = 'Basic ' + btoa(username + ':' + password);

    try {
        // We try to fetch data to test if the login works
        // Note: You might have a specific /login endpoint, or you just try to fetch /cars
        // Using /cars as an example here:
        const response = await fetch(`${BASE_URL}/cars`, {
            method: 'GET',
            headers: {
                'Authorization': authString,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Login Successful
            localStorage.setItem('auth', authString); // Store credentials for later requests

            // Check who logged in to determine view [cite: 8, 9]
            if (username.toLowerCase() === 'wigell') {
                showAdminView();
            } else {
                showCustomerView();
            }
        } else {
            document.getElementById('error-msg').innerText = "Fel inloggning";
        }
    } catch (error) {
        console.error("Connection error:", error);
    }
});

function showCustomerView() {
    loginView.style.display = 'none';
    carView.style.display = 'block';
    // Here you would call a function to fetchCars() and render them
}

function showAdminView() {
    loginView.style.display = 'none';
    adminView.style.display = 'block';
    // Here you would call a function to fetchAdminData()
}