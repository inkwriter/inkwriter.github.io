let inventory = [];
const LOW_STOCK_THRESHOLD = 3;
let editIndex = null;

// Load and normalize inventory from localStorage
const stored = localStorage.getItem('inventory') || '';
if (stored.startsWith('[')) { // Check if it’s JSON
    try {
        const jsonData = JSON.parse(stored);
        inventory = jsonData.map(item => ({
            item: typeof item?.item === 'string' ? item.item.trim() : '',
            quantity: Number.isInteger(parseInt(item?.quantity)) ? parseInt(item.quantity) : 0,
            category: typeof item?.category === 'string' ? item.category.trim() : '',
            expiration_date: typeof item?.expiration_date === 'string' ? item.expiration_date : ''
        })).filter(item => item.item);
        // Convert to plain text and save
        saveInventory();
    } catch (err) {
        console.error('Error parsing legacy JSON:', err);
        inventory = [];
    }
} else { // Assume plain text format
    inventory = stored.split('\n').filter(line => line).map(line => {
        const [item, quantity, category, expiration_date] = line.split('|');
        return {
            item: item ? item.replace(/\\\|/g, '|') : '', // Unescape | in item
            quantity: parseInt(quantity) || 0,
            category: category || '',
            expiration_date: expiration_date || ''
        };
    });
}

function saveInventory() {
    const text = inventory.map(i => 
        `${i.item.replace(/\|/g, '\\|')}|${i.quantity}|${i.category}|${i.expiration_date}`
    ).join('\n');
    localStorage.setItem('inventory', text);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toast notification
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Category styles with default fallback
const categoryStyles = {
    'Fruit': { icon: '🍎', color: '#f4a261' },
    'Dairy': { icon: '🥛', color: '#48bb78' },
    'Grains': { icon: '🌾', color: '#9f7aea' },
    'Uncategorized': { icon: '', color: '#aaa' }
};

function getCategoryStyle(category) {
    const key = typeof category === 'string' && category.trim() in categoryStyles ? category.trim() : 'Uncategorized';
    return categoryStyles[key];
}

// Render table or cards
function renderTable(filter = '') {
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    const filtered = filter
        ? inventory.filter(item => item.item.toLowerCase().includes(filter.toLowerCase()))
        : inventory;

    console.log('Inventory:', inventory);
    console.log('Filtered items:', filtered);

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6">No items found.</td>';
        tbody.appendChild(row);
        showToast('No matching items found.', 'error');
        return;
    }

    const isMobile = window.innerWidth <= 600;
    filtered.forEach((entry, index) => {
        try {
            const quantity = Number.isInteger(entry.quantity) ? entry.quantity : 0;
            const categoryStyle = getCategoryStyle(entry.category);
            if (isMobile) {
                const card = document.createElement('div');
                card.className = 'inventory-card animate-in';
                card.setAttribute('role', 'region');
                card.setAttribute('aria-label', `Item: ${entry.item || 'Unknown'}`);
                card.innerHTML = `
                    <div><strong>Item:</strong> ${entry.item}</div>
                    <div><strong>Quantity:</strong> ${quantity}</div>
                    <div><strong>Category:</strong> 
                        <span class="category-badge" style="background: ${categoryStyle.color}">
                            ${categoryStyle.icon} ${entry.category || 'Uncategorized'}
                        </span>
                    </div>
                    <div><strong>Expiration:</strong> ${entry.expiration_date || 'N/A'}</div>
                    <div><strong>Status:</strong> ${quantity <= LOW_STOCK_THRESHOLD ? '<span class="low-stock">LOW!</span>' : ''}</div>
                    <div class="card-actions">
                        <button class="icon-btn edit-btn" onclick="editItem(${index})" aria-label="Edit item">✎</button>
                        <button class="icon-btn delete-btn" onclick="removeItem(${index})" aria-label="Delete item">🗑</button>
                    </div>
                `;
                tbody.appendChild(card);
                setTimeout(() => card.classList.remove('animate-in'), 300);
            } else {
                const row = document.createElement('tr');
                row.className = 'animate-in';
                row.innerHTML = `
                    <td>${entry.item}</td>
                    <td>${quantity}</td>
                    <td>
                        <span class="category-badge" style="background: ${categoryStyle.color}">
                            ${categoryStyle.icon} ${entry.category || 'Uncategorized'}
                        </span>
                    </td>
                    <td>${entry.expiration_date || 'N/A'}</td>
                    <td>${quantity <= LOW_STOCK_THRESHOLD ? '<span class="low-stock">LOW!</span>' : ''}</td>
                    <td>
                        <button class="icon-btn edit-btn" onclick="editItem(${index})" aria-label="Edit item">✎</button>
                        <button class="icon-btn delete-btn" onclick="removeItem(${index})" aria-label="Delete item">🗑</button>
                    </td>
                `;
                tbody.appendChild(row);
                setTimeout(() => row.classList.remove('animate-in'), 300);
            }
        } catch (err) {
            console.error(`Error rendering item at index ${index}:`, err.message, entry);
            showToast(`Failed to display item: ${entry.item || 'Unknown'}`, 'error');
        }
    });
}

// Form submission
document.getElementById('inventoryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const item = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value);
    const itemError = document.getElementById('itemNameError');
    const quantityError = document.getElementById('quantityError');

    itemError.textContent = '';
    quantityError.textContent = '';

    if (!item) {
        itemError.textContent = 'Item name is required.';
        return;
    }
    if (isNaN(quantity) || quantity < 0) {
        quantityError.textContent = 'Quantity must be a non-negative number.';
        return;
    }

    const category = document.getElementById('category').value.trim();
    const expiration_date = document.getElementById('expirationDate').value;

    if (editIndex === null) {
        inventory.push({ item, quantity, category, expiration_date });
        showToast('Item added!');
    } else {
        inventory[editIndex] = { item, quantity, category, expiration_date };
        showToast('Item updated!');
        editIndex = null;
        document.getElementById('formTitle').textContent = 'Add New Item';
        document.getElementById('submitButton').textContent = 'Add Item';
        document.getElementById('cancelButton').style.display = 'none';
    }

    saveInventory();
    renderTable();
    event.target.reset();
});

// Edit item
function editItem(index) {
    const item = inventory[index];
    if (!item || !item.item) {
        showToast('Invalid item selected.', 'error');
        return;
    }
    document.getElementById('itemName').value = item.item;
    document.getElementById('quantity').value = item.quantity;
    document.getElementById('category').value = item.category || '';
    document.getElementById('expirationDate').value = item.expiration_date || '';
    document.getElementById('formTitle').textContent = 'Edit Item';
    document.getElementById('submitButton').textContent = 'Update Item';
    document.getElementById('cancelButton').style.display = 'block';
    editIndex = index;
    document.getElementById('itemForm').scrollIntoView({ behavior: 'smooth' });
}

// Cancel edit
document.getElementById('cancelButton').addEventListener('click', () => {
    editIndex = null;
    document.getElementById('formTitle').textContent = 'Add New Item';
    document.getElementById('submitButton').textContent = 'Add Item';
    document.getElementById('cancelButton').style.display = 'none';
    document.getElementById('inventoryForm').reset();
    document.getElementById('itemNameError').textContent = '';
    document.getElementById('quantityError').textContent = '';
});

// Remove item
function removeItem(index) {
    if (!inventory[index]) {
        showToast('Item not found.', 'error');
        return;
    }
    if (confirm('Are you sure you want to delete this item?')) {
        inventory.splice(index, 1);
        saveInventory();
        renderTable();
        showToast('Item deleted!');
    }
}

// Search input
document.getElementById('searchInput').addEventListener('input', debounce(() => {
    renderTable(document.getElementById('searchInput').value);
}, 300));

// Import from file
document.getElementById('jsonFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
        showToast('File is too large. Please use a smaller file.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            inventory = text.split('\n').filter(line => line).map(line => {
                const [item, quantity, category, expiration_date] = line.split('|');
                return {
                    item: item ? item.replace(/\\\|/g, '|') : '',
                    quantity: parseInt(quantity) || 0,
                    category: category || '',
                    expiration_date: expiration_date || ''
                };
            });
            if (inventory.length > 1000) {
                showToast('Inventory is too large. Limited to 1000 items.', 'error');
                inventory = inventory.slice(0, 1000);
            }
            saveInventory();
            renderTable();
            showToast('Inventory loaded from file.');
        } catch (err) {
            showToast('Error reading file.', 'error');
            console.error('File import error:', err);
        }
    };
    reader.readAsText(file);
});

// Toggle import input
function toggleJsonInput() {
    const fileInput = document.getElementById('jsonFile');
    const textInput = document.getElementById('jsonText');
    if (fileInput.style.display === 'none') {
        fileInput.style.display = 'block';
        textInput.style.display = 'none';
    } else {
        fileInput.style.display = 'none';
        textInput.style.display = 'block';
    }
}

document.getElementById('jsonText').addEventListener('change', (event) => {
    try {
        const text = event.target.value;
        inventory = text.split('\n').filter(line => line).map(line => {
            const [item, quantity, category, expiration_date] = line.split('|');
            return {
                item: item ? item.replace(/\\\|/g, '|') : '',
                quantity: parseInt(quantity) || 0,
                category: category || '',
                expiration_date: expiration_date || ''
            };
        });
        saveInventory();
        renderTable();
        showToast('Inventory loaded from text.');
    } catch (err) {
        showToast('Error parsing text.', 'error');
        console.error('Text import error:', err);
    }
});

// Export to file
function exportToJson() {
    const text = inventory.map(i => 
        `${i.item.replace(/\|/g, '\\|')}|${i.quantity}|${i.category}|${i.expiration_date}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory.txt';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Inventory exported to text file.');
}

// Initial render
renderTable();