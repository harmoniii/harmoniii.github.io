const prepopulatedData = {
    range: {
        from: "string",
        to: "string",
        timezone: "string",
        interval: null
    },
    limit: 0,
    offset: 0,
    columns: ["string"],
    filters: [
        {
            name: "string",
            operator: "string",
            expression: "string"
        }
    ],
    sort: [
        {
            name: "string",
            order: "ASC"
        }
    ]
};

function checkIncludeBodyCheckbox() {
    const includeBodyCheckbox = document.getElementById('includeBody');
    const bodyInput = document.getElementById('bodyInput');

    if (includeBodyCheckbox.checked) {
        bodyInput.style.display = 'block';
    } else {
        bodyInput.style.display = 'none';
    }
}

// Устанавливаем интервал проверки каждые 2 секунды
setInterval(checkIncludeBodyCheckbox, 2000);

function addAffilates() {
    const urlInput = document.getElementById('urlInput');
    const tokenInput = document.getElementById('tokenInput');
    const requestType = document.getElementById('requestType');
    const bodyInput = document.getElementById('bodyInput');
    const corsProxy = document.getElementById('useCorsProxy');
    const includeBodyCheckbox = document.getElementById('includeBody');

    // Предзаполнение полей
    urlInput.value = 'https://ida.wake-app.net/admin_api/v1/affiliate_networks';
    tokenInput.value = '-';
    requestType.value = 'GET';
    bodyInput.value = '';
    corsProxy.checked = true;
    includeBodyCheckbox.checked = false;
}

function downloadClicks() {
    const urlInput = document.getElementById('urlInput');
    const corsProxy = document.getElementById('useCorsProxy');
    const requestType = document.getElementById('requestType');
    const tokenInput = document.getElementById('tokenInput');
    const includeBodyCheckbox = document.getElementById('includeBody');
    const bodyInput = document.getElementById('bodyInput');

    urlInput.value = 'https://ida.wake-app.net/admin_api/v1/clicks/log';
    corsProxy.checked = true;
    requestType.value = 'POST';
    tokenInput.value = '-';
    includeBodyCheckbox.checked = true;
    bodyInput.value = JSON.stringify(prepopulatedData, null, 2);
}

function sendRequest() {
    const url = document.getElementById('urlInput').value;
    const token = document.getElementById('tokenInput').value;
    const requestType = document.getElementById('requestType').value;
    const includeBody = document.getElementById('includeBody').checked;
    const body = includeBody ? document.getElementById('bodyInput').value : undefined;

    const headers = {
        'api-key': token,
        'Content-Type': 'application/json'
    };

    const requestOptions = {
        method: requestType,
        headers: headers
    };

    if (includeBody) {
        requestOptions.body = body;
    }
    let finalUrl = url;

    if (useCorsProxy) {
        const baseUrl = 'https://corsproxy.io/?'; 
        const fullUrl = baseUrl + url;
        finalUrl = fullUrl;
    }

    if (includeBody) {
        requestOptions.body = body;
    }

    fetch(finalUrl, requestOptions)
    .then(response => response.json())
    .then(data => {
        displayResponseInTable(data);
    })
    .catch(error => {
        document.getElementById('responseTableBody').innerHTML = `<tr><td colspan="2">${error.message}</td></tr>`;
    });
}

function displayResponseInTable(data) {
    const tableBody = document.getElementById('responseTableBody');
    tableBody.innerHTML = '';

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            const row = document.createElement('tr');
            const valueCell = document.createElement('td');
            valueCell.textContent = JSON.stringify(value);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        }
    }
}


function downloadCSV() {
    const responseTableBody = document.getElementById('responseTableBody');

    if (responseTableBody) {
        const rows = responseTableBody.querySelectorAll('tr');

        if (rows.length === 0) {
            alert('Нет данных для экспорта в CSV.');
            return;
        }

        const csvContent = [];

        // Данные (начиная с первой строки)
        for (let i = 0; i < rows.length; i++) {
            const rowData = Array.from(rows[i].querySelectorAll('td'));
            // Исключаем первую ячейку с ключом (первую колонку)
            rowData.shift();
            const rowValues = rowData.map(cell => cell.textContent);
            csvContent.push(rowValues.join(','));
        }

        const csvString = csvContent.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'data.csv';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    } else {
        alert('Таблица с данными не найдена.');
    }
}






