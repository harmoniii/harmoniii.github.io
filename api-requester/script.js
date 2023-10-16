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
    const baseUrl = 'https://corsproxy.io/?';
    const fullUrl = baseUrl + url;

    fetch(fullUrl, requestOptions)
        .then(response => response.json())
        .then(data => {
            document.getElementById('response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('response').textContent = error.message;
        });

    function displayResponseInTable(data) {
    const tableBody = document.getElementById('responseTableBody');
    tableBody.innerHTML = '';

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const row = document.createElement('tr');
            const keyCell = document.createElement('td');
            keyCell.textContent = key;
            const valueCell = document.createElement('td');
            valueCell.textContent = JSON.stringify(data[key]);

            row.appendChild(keyCell);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        }
    }
}
