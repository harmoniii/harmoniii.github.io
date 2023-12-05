/*
    
*/

function redirectToAdmin() {
    window.location.href = 'https://admin-api.docs.keitaro.io/';
  }

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

function sendRequest() {
    document.getElementById('downloadCsvButton').removeAttribute('disabled');
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
        document.getElementById('responseContainer').textContent = JSON.stringify(data, null, 2);
    })
    .catch(error => {
        document.getElementById('responseContainer').textContent = error.message;
    });
}

function displayResponseInTable(data) {
    const responseContainer = document.getElementById('responseContainer');
    responseContainer.innerHTML = JSON.stringify(data, null, 2);
}

function togglePopup() {
    var popup = document.getElementById('popup');
    popup.style.display = (popup.style.display === 'block') ? 'none' : 'block';
  }