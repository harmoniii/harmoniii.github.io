const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`;

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
    bodyInput.value = JSON.stringify(prepopulatedClicks, null, 2);
}

const prepopulatedClicks = {
    range: {
        from: formattedDate,
        to: formattedDate,
        timezone: "Europe/Moscow"
    },
    limit: 0,
    offset: 0,
    columns: ["offer","sub_id","campaign_id","sub_id_1","sub_id_2","sub_id_3","sub_id_4","sub_id_5","sub_id_6","sub_id_7","sub_id_8","sub_id_9","sub_id_10","country_code","datetime","is_bot","is_lead","is_sale"],
    filters: [
        {
            name: "offer",
            operator: "CONTAINS",
            expression: ["24357","24359"]
        }
    ],
    sort: [
        {
            name: "datetime",
            order: "ASC"
        }
    ]
};