function sendData() {
    fetch('/run-python', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        alert('傳送成功！辨識結果已返回：' + JSON.stringify(data));
        console.log('辨識結果:', data);
    })
    .catch(error => {
        alert('傳送失敗，請檢查伺服器！');
        console.error('錯誤:', error);
    });
}
