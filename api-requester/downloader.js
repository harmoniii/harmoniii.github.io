// Функция для скачивания данных в формате CSV
function downloadCSV() {
    const responseContainer = document.getElementById('responseContainer');
    const responseData = JSON.parse(responseContainer.textContent);

    if (!responseData || !Array.isArray(responseData.rows)) {
        alert('Нет данных для экспорта в CSV.');
        return;
    }

    const rows = responseData.rows;

    if (rows.length === 0) {
        alert('Нет данных для экспорта в CSV.');
        return;
    }

    // Создаем CSV-строку с заголовками
    const headers = ['sub_id', 'offer', "stream", 'campaign_id', 'sub_id_1', 'sub_id_2', 'sub_id_3', 'sub_id_4', 'sub_id_5', 'sub_id_6', 'sub_id_7', 'sub_id_8', 'sub_id_9', 'sub_id_10', 'country_code', 'datetime', 'is_bot', 'is_lead', 'is_sale'];
    let csv = headers.join(',') + '\n';

    // Создаем строки с данными
    rows.forEach(item => {
        const values = headers.map(key => {
            const value = item[key];
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

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
    
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.appendChild(document.createTextNode(headerText));
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Добавляем данные в таблицу
    rows.forEach(item => {
        const row = document.createElement('tr');
        headers.forEach(key => {
            const cell = document.createElement('td');
            cell.appendChild(document.createTextNode(item[key]));
            row.appendChild(cell);
        });
        table.appendChild(row);
    });

    // Создаем всплывающее окно с таблицей
    const popup = window.open('', 'CSV Table', 'width=600, height=400');
    popup.document.write('<html><head><title>CSV Table</title></head><body>');
    popup.document.write('<h1>CSV Data</h1>');
    popup.document.write(table.outerHTML);
    popup.document.write('</body></html>');
    popup.document.close();

    // Выводим окно на экран
    if (window.focus) {
        popup.focus();
    }
}
