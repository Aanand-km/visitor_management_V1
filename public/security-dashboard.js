function onScanSuccess(decodedText)
{
    scanner.clear();

    const visitorId =
        decodedText.split('/').pop();

    fetch(`/visitor/scan/${visitorId}`)
    .then(res => res.text())
    .then(data => {

        document.getElementById('result')
        .innerHTML = data;
    });
}

let scanner;

document
.getElementById('startScanner')
.addEventListener('click', () => {

    scanner =
    new Html5QrcodeScanner(
        "reader",
        {
            fps: 10,
            qrbox: 250
        }
    );

    scanner.render(onScanSuccess);
});