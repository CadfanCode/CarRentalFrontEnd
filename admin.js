// --- GLOBAL STATE FOR SORTING ---
let adminTableData = []; // Stores the current list (users, cars, or bookings)
let currentSort = { key: null, direction: 'asc' }; // Tracks sort state

// --- ADMIN VIEW CONTROLLER ---
function fetchAdminData() {
    loadAdminContent('admin-bookings'); // <-- admin-bookings becomes the default view for admins upon loading.
}

function loadAdminContent(contentType) {
    const existingForm = document.getElementById('admin-form'); // <-- FYI 'admin-form' is created within the renderAdminForm function.
    if(existingForm) existingForm.remove();
    document.getElementById('admin-table').style.display = 'table';

    const headerContainer = document.getElementById('admin-header-actions');
    if(headerContainer) {
        headerContainer.innerHTML = '';
        headerContainer.style.display = 'block';
    }

    // Reset sort state when switching tabs
    currentSort = { key: null, direction: 'asc' };
    adminTableData = [];

    if (contentType === 'admin-bookings') fetchAndDisplayAllBookings();
    else if (contentType === 'admin-cars') fetchAndDisplayAdminCars();
    else if (contentType === 'admin-users') fetchAndDisplayAllUsers();
}

// --- GENERIC SORTING LOGIC ---
function handleSort(key, renderFunction) {
    if (currentSort.key === key) {
        // Toggle direction if clicking the same column
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc'; // if 'asc' true switch to 'desc' else 'asc'.
    } else {
        // New column, start with ascending
        currentSort.key = key;
        currentSort.direction = 'asc';
    }

    adminTableData.sort((a, b) => { // <-- i.e. rows 'a' and 'b' in the table.
        let valA = a[key];
        let valB = b[key];

        // Handle null/undefined
        if (valA === null || valA === undefined) valA = "";
        if (valB === null || valB === undefined) valB = "";

        // Check if the data are numbers or text.
        const isNum = !isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB));

        if (isNum) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderFunction();
}

// Helper to create sortable headers
function createSortableHeader(label, key, renderFunction, tr) {
    const th = document.createElement('th');
    th.innerText = label;
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';

    // Arrow indicator
    if (currentSort.key === key) {
        th.innerText += currentSort.direction === 'asc' ? ' ↑' : ' ↓';
    }

    th.onclick = () => handleSort(key, renderFunction);
    tr.appendChild(th);
}

// --- ADMIN HELPERS ---
async function deleteItem(url, id, refreshCallback) {
    if(!confirm('Är du säker på att du vill ta bort denna post?')) return; // <-- 'confirm' is an inbuilt browser function returns a boolean depending on the users response.
    const auth = localStorage.getItem('auth');
    try {
        const response = await fetch(`${url}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': auth || '' }
        });
        if(response.ok) refreshCallback();
        else alert('Kunde inte ta bort posten.');
    } catch(e) { console.error(e); }
 }

 // FORM RENDERER
 function renderAdminForm(fields, initialData, onSubmit, onCancel) {
    const container = document.getElementById('admin-view');
    const existingForm = document.getElementById('admin-form');
    if(existingForm) existingForm.remove();

    document.getElementById('admin-table').style.display = 'none';
    const headerActions = document.getElementById('admin-header-actions');
    if(headerActions) headerActions.style.display = 'none';

    //--- Construct the admin-form and all of it's elements. ---
    const formWrapper = document.createElement('div'); // <-- Creates a DOM element
    formWrapper.id = 'admin-form'; // <-- Gives the DOM element an id e.g. 'admin-form'.
    formWrapper.style.padding = '20px';
    formWrapper.style.backgroundColor = '#f4f4f4';
    formWrapper.style.marginTop = '20px';

    const title = document.createElement('h3');
    title.textContent = initialData ? 'Redigera Post' : 'Skapa Ny Post';
    formWrapper.append(title);

    fields.forEach(field => {
        const label = document.createElement('label');
        label.textContent = field.label + ": ";
        label.style.display = 'block';
        label.style.marginBottom = '10px';

        const input = document.createElement('input');
        input.id = `form-${field.key}`;
        input.type = field.type || 'text';

        if (field.type !== 'file') {
            input.style.width = '100%';
            input.style.padding = '5px';
            if (initialData) input.value = initialData[field.key] || '';
        } else {
            input.accept = "image/*";
            if (initialData && initialData[field.key]) {
                const preview = document.createElement('div');
                preview.innerHTML = `<small>Nuvarande bild:</small><br><img src="data:image/jpeg;base64,${initialData[field.key]}" width="100" style="margin-bottom:10px">`;
                label.appendChild(preview);
            }
        }
        label.appendChild(input);
        formWrapper.appendChild(label);
    });

    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '20px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Spara';
    saveBtn.style.marginRight = '10px';

    saveBtn.onclick = () => {
        const payload = {};
        fields.forEach(field => {
            const input = document.getElementById(`form-${field.key}`);
            if (field.type === 'file') {
                if (input.files.length > 0) payload[field.key] = input.files[0];
            } else {
                let val = input.value;
                if(field.type === 'number') val = parseFloat(val);
                payload[field.key] = val;
            }
        });
        if(initialData && initialData.id) payload.id = initialData.id;
        onSubmit(payload);
        closeForm();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Avbryt';
    cancelBtn.onclick = () => {
        closeForm();
        onCancel();
    };

    function closeForm() {
        formWrapper.remove();
        document.getElementById('admin-table').style.display = 'table';
        if(headerActions) headerActions.style.display = 'block';
    }

    btnContainer.append(saveBtn);
    btnContainer.append(cancelBtn);
    formWrapper.append(btnContainer);
    container.append(formWrapper);
 }

// --- ADMIN: BOOKINGS LOGIC ---
async function fetchAndDisplayAllBookings() {
    const auth = localStorage.getItem('auth');
    try {
        const response = await fetch(BOOKINGS_URL, {
            method: 'GET',
            headers: { 'Authorization': auth || '' }
        });
        if (response.ok) {
            adminTableData = await response.json();
            renderAdminBookingsTable();
        }
    } catch (error) { console.error(error); }
 }

 function renderAdminBookingsTable() {
    const tbody = document.getElementById('admin-tbody');
    const table = document.getElementById('admin-table');
    table.querySelector('thead')?.remove();

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Create Sortable Headers
    createSortableHeader('ID', 'id', renderAdminBookingsTable, headerRow);
    createSortableHeader('Bil (ID)', 'carId', renderAdminBookingsTable, headerRow);
    createSortableHeader('Från', 'fromDate', renderAdminBookingsTable, headerRow);
    createSortableHeader('Till', 'toDate', renderAdminBookingsTable, headerRow);
    createSortableHeader('Användare', 'userId', renderAdminBookingsTable, headerRow);

    // Non-sortable Actions Header
    const thActions = document.createElement('th');
    thActions.innerText = 'Åtgärder';
    headerRow.appendChild(thActions);

    thead.appendChild(headerRow);
    table.insertBefore(thead, tbody);
    tbody.innerHTML = '';

    adminTableData.forEach(booking => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${booking.id}</td>
            <td>${booking.carId}</td>
            <td>${booking.fromDate}</td>
            <td>${booking.toDate}</td>
            <td>${booking.userId}</td>
            <td>
                <button class="btn-edit">Redigera</button>
                <button class="btn-del">Ta bort</button>
            </td>
        `;
        tr.querySelector('.btn-del').onclick = () => deleteItem(BOOKINGS_URL, booking.id, fetchAndDisplayAllBookings);
        tr.querySelector('.btn-edit').onclick = () => {
            const fields = [
                { key: 'carId', label: 'Bil ID', type: 'number' },
                { key: 'fromDate', label: 'Från', type: 'text' },
                { key: 'toDate', label: 'Till', type: 'text' },
                { key: 'userId', label: 'User ID', type: 'number' }
            ];
            renderAdminForm(fields, booking, async (payload) => {
                const fullPayload = { ...booking, ...payload };
                const response = await fetch(`${BOOKINGS_URL}/${booking.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': localStorage.getItem('auth'), 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullPayload)
                });
                if(response.ok) fetchAndDisplayAllBookings();
                else alert("Update failed");
            }, fetchAndDisplayAllBookings);
        };
        tbody.appendChild(tr);
    });
 }

// --- ADMIN: CARS LOGIC ---
async function fetchAndDisplayAdminCars() {
    const headerContainer = document.getElementById('admin-header-actions');
    if (headerContainer) headerContainer.innerHTML = '';

    const addNewBtn = document.createElement('button');
    addNewBtn.textContent = "+ Lägg till ny bil";

    addNewBtn.onclick = () => {
         const fields = [
            { key: 'name', label: 'Märke', type: 'text' },
            { key: 'model', label: 'Modell', type: 'text' },
            { key: 'type', label: 'Typ', type: 'text' },
            { key: 'price', label: 'Pris', type: 'number' },
            { key: 'feature1', label: 'Feature 1', type: 'text' },
            { key: 'feature2', label: 'Feature 2', type: 'text' },
            { key: 'feature3', label: 'Feature 3', type: 'text' },
            { key: 'image', label: 'Bild (Valfri)', type: 'file' }
        ];

      renderAdminForm(fields, null, async (payload) => {
           payload.booked = false;
           const formData = new FormData();
           for (const key in payload) {
               if (payload[key] !== undefined && payload[key] !== null) {
                   formData.append(key, payload[key]);
               }
           }
           const response = await fetch(CAR_URL, {
              method: 'POST',
              headers: { 'Authorization': localStorage.getItem('auth') },
              body: formData
          });

           if(response.ok) fetchAndDisplayAdminCars();
           else alert("Kunde inte lägga till bil.");
       }, fetchAndDisplayAdminCars);
    };

    if(headerContainer) headerContainer.appendChild(addNewBtn);

    try {
        const response = await fetch(CAR_URL, {
            method: 'GET',
            headers: { 'Authorization': localStorage.getItem('auth') || '' }
        });
        if (response.ok) {
            const rawData = await response.json();
            adminTableData = rawData.map(car => ({
                ...car,
                displayTitle: `${car.make || car.name} ${car.model}`
            }));
            renderAdminCarsTable();
        }
    } catch (error) { console.error(error); }
}

function renderAdminCarsTable() {
   const tbody = document.getElementById('admin-tbody');
   const table = document.getElementById('admin-table');
   table.querySelector('thead')?.remove();

   const thead = document.createElement('thead');
   const headerRow = document.createElement('tr');

   // Sortable Headers
   createSortableHeader('Märke/Modell', 'displayTitle', renderAdminCarsTable, headerRow);
   const thImg = document.createElement('th'); thImg.innerText = "Bild"; headerRow.appendChild(thImg);

   createSortableHeader('Pris', 'price', renderAdminCarsTable, headerRow);
   createSortableHeader('ID', 'id', renderAdminCarsTable, headerRow);

   const thActions = document.createElement('th'); thActions.innerText = "Åtgärder"; headerRow.appendChild(thActions);

   thead.appendChild(headerRow);
   table.insertBefore(thead, tbody);
   tbody.innerHTML = '';

   adminTableData.forEach(car => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
           <td>${car.displayTitle}</td>
           <td><img src="${car.image ? `data:image/jpeg;base64,${car.image}` : ''}" width="50" alt="Ingen bild"></td>
           <td>${car.price} kr</td>
           <td>${car.id}</td>
           <td>
               <button class="btn-edit">Redigera</button>
               <button class="btn-del">Ta bort</button>
           </td>
       `;

       tr.querySelector('.btn-del').onclick = () => deleteItem(CAR_URL, car.id, fetchAndDisplayAdminCars);
       tr.querySelector('.btn-edit').onclick = () => {
           const fields = [
               { key: 'name', label: 'Märke', type: 'text' },
               { key: 'model', label: 'Modell', type: 'text' },
               { key: 'type', label: 'Typ', type: 'text' },
               { key: 'price', label: 'Pris', type: 'number' },
               { key: 'feature1', label: 'Feature 1', type: 'text' },
               { key: 'feature2', label: 'Feature 2', type: 'text' },
               { key: 'feature3', label: 'Feature 3', type: 'text' },
               { key: 'image', label: 'Byt Bild (Valfri)', type: 'file' }
           ];

           const initialData = { ...car, make: car.make || car.name };

           renderAdminForm(fields, initialData, async (payload) => {
               let imageBase64 = initialData.image;
               if (payload.image && payload.image instanceof File) {
                   const convertFile = (f) => new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result.toString().replace(/^data:(.*,)?/, ''));
                        reader.readAsDataURL(f);
                   });
                   imageBase64 = await convertFile(payload.image);
               }

               const fullPayload = { ...initialData, ...payload, image: imageBase64 };
               // Remove temporary display property before sending
               delete fullPayload.displayTitle;

               const response = await fetch(`${CAR_URL}/${car.id}`, {
                   method: 'PUT',
                   headers: {
                       'Authorization': localStorage.getItem('auth'),
                       'Content-Type': 'application/json'
                   },
                   body: JSON.stringify(fullPayload)
               });
               if (response.ok) fetchAndDisplayAdminCars();
               else alert("Uppdatering misslyckades.");
           }, fetchAndDisplayAdminCars);
       };
       tbody.appendChild(tr);
   });
}

// --- ADMIN: USERS LOGIC ---
async function fetchAndDisplayAllUsers() {
    const headerContainer = document.getElementById('admin-header-actions');
    if (headerContainer) headerContainer.innerHTML = '';

    const addNewBtn = document.createElement('button');
    addNewBtn.textContent = "+ Lägg till ny kund";
    addNewBtn.onclick = () => {
        const fields = [
            { key: 'username', label: 'Användarnamn', type: 'text' },
            { key: 'password', label: 'Lösenord', type: 'text' },
            { key: 'firstName', label: 'Förnamn', type: 'text' },
            { key: 'lastName', label: 'Efternamn', type: 'text' },
            { key: 'email', label: 'Email', type: 'text' },
            { key: 'phone', label: 'Telefonnummer', type: 'text' },
            { key: 'role', label: 'Roll (ROLE_USER/ROLE_ADMIN)', type: 'text' }
        ];

        renderAdminForm(fields, null, async (formData) => {
            const payload = { ...formData, noOfOrders: 0 };
            try {
                const response = await fetch(USERDETAILS_URL, {
                    method: 'POST',
                    headers: { 'Authorization': localStorage.getItem('auth'), 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) fetchAndDisplayAllUsers();
                else alert("Kunde inte lägga till användare.");
            } catch (err) { alert("Nätverksfel."); }
        }, fetchAndDisplayAllUsers);
    };

    if (headerContainer) headerContainer.appendChild(addNewBtn);

    try {
        const response = await fetch(USERDETAILS_URL, {
            method: 'GET',
            headers: { 'Authorization': localStorage.getItem('auth') || '' }
        });
        if (response.ok) {
            const rawData = await response.json();
            // Pre-process for Name sorting
            adminTableData = rawData.map(u => ({
                ...u,
                fullName: `${u.firstName} ${u.lastName}`,
                displayRole: (u.role === 'ROLE_ADMIN') ? 'ADMIN' : 'USER'
            }));
            renderAdminUsersTable();
        }
    } catch (error) { console.error("Fetch error:", error); }
}

function renderAdminUsersTable() {
   const tbody = document.getElementById('admin-tbody');
   const table = document.getElementById('admin-table');
   table.querySelector('thead')?.remove();

   const thead = document.createElement('thead');
   const headerRow = document.createElement('tr');

   createSortableHeader('ID', 'id', renderAdminUsersTable, headerRow);
   createSortableHeader('User', 'username', renderAdminUsersTable, headerRow);
   createSortableHeader('Namn', 'fullName', renderAdminUsersTable, headerRow);
   createSortableHeader('Email', 'email', renderAdminUsersTable, headerRow);
   createSortableHeader('Roll', 'displayRole', renderAdminUsersTable, headerRow);

   const thActions = document.createElement('th'); thActions.innerText = "Åtgärder"; headerRow.appendChild(thActions);

   thead.appendChild(headerRow);
   table.insertBefore(thead, tbody);
   tbody.innerHTML = '';

   adminTableData.forEach(user => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
           <td>${user.id}</td>
           <td>${user.username}</td>
           <td>${user.fullName}</td>
           <td>${user.email || 'N/A'}</td>
           <td>${user.displayRole}</td>
           <td>
               <button class="btn-edit">Redigera</button>
               <button class="btn-del">Ta bort</button>
           </td>
       `;

       tr.querySelector('.btn-del').onclick = () => deleteItem(USERDETAILS_URL, user.id, fetchAndDisplayAllUsers);
       tr.querySelector('.btn-edit').onclick = () => {
           const fields = [
               { key: 'username', label: 'Användarnamn', type: 'text' },
               { key: 'password', label: 'Nytt Lösenord (Lämna tomt)', type: 'text' },
               { key: 'firstName', label: 'Förnamn', type: 'text' },
               { key: 'lastName', label: 'Efternamn', type: 'text' },
               { key: 'email', label: 'Email', type: 'text' },
               { key: 'phone', label: 'Telefon', type: 'text' },
               { key: 'role', label: 'Roll (ROLE_USER/ROLE_ADMIN)', type: 'text' }
           ];
           const displayData = { ...user, password: '' };
           renderAdminForm(fields, displayData, async (formValues) => {
               const finalPassword = (formValues.password && formValues.password.trim() !== '') ? formValues.password : user.password;
               const cleanPayload = {
                   id: user.id,
                   username: formValues.username,
                   password: finalPassword,
                   firstName: formValues.firstName,
                   lastName: formValues.lastName,
                   email: formValues.email,
                   phone: formValues.phone,
                   role: formValues.role,
                   noOfOrders: user.noOfOrders
               };
               const response = await fetch(`${USERDETAILS_URL}/${user.id}`, {
                   method: 'PUT',
                   headers: { 'Authorization': localStorage.getItem('auth'), 'Content-Type': 'application/json' },
                   body: JSON.stringify(cleanPayload)
               });
               if(response.ok) fetchAndDisplayAllUsers();
               else alert("Uppdatering misslyckades.");
           }, fetchAndDisplayAllUsers);
       };
       tbody.appendChild(tr);
   });
}