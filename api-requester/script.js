/*
    sign, version, campaign, campaign_group, landing_group, offer_group, landing, offer, affiliate_network, ts, stream, source, x_requested_with, referrer, search_engine, keyword, 
    click_id, sub_id, visitor_code, campaign_id, campaign_group_id, offer_group_id, landing_group_id, landing_id, offer_id, affiliate_network_id, ts_id, stream_id, ad_campaign_id, 
    external_id, creative_id, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5, sub_id_6, sub_id_7, sub_id_8, sub_id_9, sub_id_10, sub_id_11, sub_id_12, sub_id_13, sub_id_14, sub_id_15, sub_id_16, 
    sub_id_17, sub_id_18, sub_id_19, sub_id_20, sub_id_21, sub_id_22, sub_id_23, sub_id_24, sub_id_25, sub_id_26, sub_id_27, sub_id_28, sub_id_29, sub_id_30, connection_type, operator, isp, 
    country_code, country_flag, country, region, region_code, city, language, device_type, user_agent, os_icon, os, os_version, browser, browser_version, device_model, browser_icon, ip, ip_mask1, 
    ip_mask2, ipv4only, ipv6only, cost, extra_param_1, extra_param_2, extra_param_3, extra_param_4, extra_param_5, extra_param_6, extra_param_7, extra_param_8, extra_param_9, extra_param_10, 
    datetime, year, month, week, weekday, day, hour, day_hour, landing_clicked_datetime, destination, is_unique_stream, is_unique_campaign, is_unique_global, is_bot, is_empty_referrer, is_using_proxy, 
    landing_clicked, is_lead, is_sale, is_rejected, parent_campaign_id, parent_sub_ids, parent_campaign, parent_sub_id, profitability, revenue, profit, lead_revenue, sale_revenue, rejected_revenue, 
    rebills, now, landing_clicked_period
*/

const prepopulatedData = {
    range: {
        from: "YYYY-MM-DD",
        to: "YYYY-MM-DD",
        timezone: "Europe/Moscow"
    },
    limit: 0,
    offset: 0,
    columns: ["campaign","offer","stream","sub_id","campaign_id","sub_id_1","sub_id_2","sub_id_3","sub_id_4","sub_id_5","sub_id_6","sub_id_7","sub_id_8","sub_id_9","sub_id_10","country_code","datetime","is_bot","is_lead","is_sale"],
    filters: [
        {
            name: "offer_id",
            operator: "EQUALS or IN_LIST",
            expression: "22070"
        }
    ],
    sort: [
        {
            name: "sub_id",
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

// Функция для скачивания данных в формате CSV
function downloadCSV() {
    const responseContainer = document.getElementById('responseContainer');
    const responseData = JSON.parse(responseContainer.textContent);

    if (!responseData || typeof responseData !== 'object') {
        alert('Нет данных для экспорта в CSV.');
        return;
    }

    const keys = Object.keys(responseData);

    if (keys.length === 0) {
        alert('Нет данных для экспорта в CSV.');
        return;
    }

    // Создаем CSV-строку с заголовками
    let csv = keys.join(',') + '\n';

    // Создаем строку с значениями
    csv += keys.map(key => {
        const value = responseData[key];
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return value;
    }).join(',') + '\n';

    // Создаем Blob с CSV-строкой
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Создаем ссылку для скачивания файла
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'data.csv';
    document.body.appendChild(a);

    // Кликаем по ссылке для скачивания
    a.click();

    // Очищаем URL-объект
    URL.revokeObjectURL(url);
}












