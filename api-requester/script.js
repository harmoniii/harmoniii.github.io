function sendRequest() {
    const url = document.getElementById('urlInput').value;
    const token = document.getElementById('tokenInput').value;
    const requestType = document.getElementById('requestType').value;
    const body = document.getElementById('bodyInput').value;

    const headers = {
        'api-key': token, // Используем API ключ
        'Content-Type': 'application/json'
    };

    const requestOptions = {
        method: requestType,
        headers: headers,
        body: body
    };
    const baseUrl = 'https://crossorigin.me/';
    const fullUrl = baseUrl + url;

    fetch(fullUrl, requestOptions)
        .then(response => response.json())
        .then(data => {
            document.getElementById('response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('response').textContent = error.message;
        });
}
