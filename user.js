// --- BOOKING STATE & WIZARD ELEMENTS ---
let bookingDraft = { car: null, fromDate: null, toDate: null };
// Global variable to store fetched cars for sorting
let availableCars = [];

const viewCarList = document.getElementById('view-car-list');
const viewDatePicker = document.getElementById('view-date-picker');
const viewSummary = document.getElementById('view-summary');
const datePickerTitle = document.getElementById('date-picker-title');
const dateInput = document.getElementById('date-input');
const btnNextDate = document.getElementById('btn-next-date');
const summaryDetails = document.getElementById('summary-details');
const btnConfirmBooking = document.getElementById('btn-confirm-booking');

// Sorting Buttons
const sortNameBtn = document.getElementById('sort-name');
const sortTypeBtn = document.getElementById('sort-type');

// --- HELPER: RESET WIZARD ---
function resetBookingProcess() {
   bookingDraft = { car: null, fromDate: null, toDate: null };
   if(dateInput) dateInput.value = '';
   if(viewCarList) viewCarList.classList.remove('hidden');
   if(viewDatePicker) viewDatePicker.classList.add('hidden');
   if(viewSummary) viewSummary.classList.add('hidden');
}

// --- USER: BOOKINGS VIEW (My Bookings) ---
async function fetchBookings() {
    const auth = localStorage.getItem('auth');
    const tbody = document.getElementById('bookings-table-body');
    if (tbody) tbody.innerHTML = '';
    try {
        const response = await fetch(BOOKINGS_URL + `/me`, { // /me is appended in order to reach the correct endpoint for the logged in user.
            method: 'GET',
            headers: { 'Authorization': auth || '' }
        });
        if (response.ok) populateBookingsTable(await response.json());
    } catch (error) { console.error(error); }
 }

async function populateBookingsTable(bookings) {
   const tbody = document.getElementById('bookings-table-body');
   if (!tbody) return;

   tbody.innerHTML = '';

   for (const booking of bookings) {
       try {
           const carResponse = await fetch(`${CAR_URL}/${booking.carId}`, {
               method: 'GET',
               headers: { 'Authorization': localStorage.getItem('auth') || '' }
           });

           const car = await carResponse.json();
           const tr = document.createElement('tr');

           tr.innerHTML = `
               <td><img src="${car.image ? `data:image/jpeg;base64,${car.image}` : ''}" width="100" alt="Bil"></td>
               <td>${car.make || car.name} ${car.model}</td>
               <td>${car.price} kr</td>
               <td>${booking.fromDate}</td>
               <td>${booking.toDate}</td>
           `;
           tbody.appendChild(tr);
       } catch (e) {
           console.error("Error fetching car info for booking", e);
       }
   }
}

 // --- USER: CAR VIEW (Interactive List) ---
async function fetchCars() {
    const auth = localStorage.getItem('auth');
    try {
        const response = await fetch(CAR_URL, {
            method: 'GET',
            headers: { 'Authorization': auth || '' }
        });
        if (response.ok) {
            availableCars = await response.json(); // Store the data globally in order to sort it later!
            renderCarTable();
        }
    } catch (error) { console.error(error); }
 }

 function renderCarTable() {
    const tbody = document.getElementById('car-table-body-interactive');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Loop through the global 'availableCars' array (which might be sorted)
    availableCars.forEach(car => {
        const tr = document.createElement('tr');
        tr.classList.add('car-row-interactive');
        tr.style.cursor = 'pointer';
        tr.onclick = () => handleCarSelection(car);
        tr.innerHTML = `
            <td><img src="${car.image ? `data:image/jpeg;base64,${car.image}` : ''}" width="100" alt="No Image"></td>
            <td>${car.make || car.name} ${car.model}</td>
            <td>${car.type}</td>
            <td>${car.price} kr</td>
            <td>${[car.feature1, car.feature2].filter(Boolean).join(', ')}</td>
            <td><button class="btn-book-row">Boka</button></td>
        `;
        // Prevent row click if they click the specific "Boka" button (optional UX improvement)
        const btn = tr.querySelector('.btn-book-row');
        if(btn) btn.onclick = (e) => {
            e.stopPropagation();
            handleCarSelection(car);
        };

        tbody.appendChild(tr);
    });
 }

 // --- SORTING LOGIC ---
 if(sortNameBtn) {
     sortNameBtn.addEventListener('click', () => {
         // Sort alphabetically by Make + Model
         availableCars.sort((a, b) => {
             const nameA = ((a.make || a.name) + ' ' + a.model).toLowerCase();
             const nameB = ((b.make || b.name) + ' ' + b.model).toLowerCase();
             return nameA.localeCompare(nameB);
         });
         renderCarTable(); // Re-draw table
     });
 }

 if(sortTypeBtn) {
    sortTypeBtn.addEventListener('click', () => {
        // Sort alphabetically by Type
        availableCars.sort((a, b) => {
            const typeA = (a.type || '').toLowerCase();
            const typeB = (b.type || '').toLowerCase();
            return typeA.localeCompare(typeB);
        });
        renderCarTable(); // Re-draw table
    });
}

 // --- BOOKING WIZARD LOGIC ---
function handleCarSelection(car) {
    bookingDraft.car = car;
    viewCarList.classList.add('hidden');
    viewDatePicker.classList.remove('hidden');
    setupDatePicker('from');
 }

 function setupDatePicker(type) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    dateInput.value = '';

    if (type === 'from') {
        datePickerTitle.textContent = `Välj upphämtningsdatum för ${bookingDraft.car.make || bookingDraft.car.name}`;
        btnNextDate.onclick = () => {
            if(!dateInput.value) return alert("Vänligen välj ett datum.");
            bookingDraft.fromDate = dateInput.value;
            setupDatePicker('until');
        };
    } else if (type === 'until') {
        datePickerTitle.textContent = `Välj returdatum`;
        dateInput.setAttribute('min', bookingDraft.fromDate);
        btnNextDate.onclick = () => {
            if(!dateInput.value) return alert("Vänligen välj ett datum.");
            if(new Date(dateInput.value) <= new Date(bookingDraft.fromDate)) return alert("Returdatum felaktigt.");
            bookingDraft.toDate = dateInput.value;
            showSummary();
        };
    }
 }

 function showSummary() {
    viewDatePicker.classList.add('hidden');
    viewSummary.classList.remove('hidden');
    const car = bookingDraft.car;
    const days = Math.round((new Date(bookingDraft.toDate) - new Date(bookingDraft.fromDate)) / (86400000));
    const total = days * parseFloat(car.price);
    summaryDetails.innerHTML = `
        <h3>${car.make || car.name} ${car.model}</h3>
        <p>${bookingDraft.fromDate} till ${bookingDraft.toDate} (${days} dagar)</p>
        <p>Total: ${total.toFixed(2)} kr</p>
    `;
    btnConfirmBooking.onclick = submitBooking;
 }

 async function submitBooking() {
    const auth = localStorage.getItem('auth');
    btnConfirmBooking.disabled = true;
    try {
        const response = await fetch(BOOKINGS_URL, {
            method: 'POST',
            headers: { 'Authorization': auth || '', 'Content-Type': 'application/json' },
            body: JSON.stringify({ carId: bookingDraft.car.id, fromDate: bookingDraft.fromDate, toDate: bookingDraft.toDate })
        });
        if (response.ok) alert(`Bokning bekräftad!`);
        else alert(`Bokning misslyckades.`);
    } catch (e) { alert('Connection error.'); }
    finally {
        btnConfirmBooking.disabled = false;
        resetBookingProcess();
    }
 }