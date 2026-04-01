// ─── DEMO PAGE: POV RIDE ───
function startRide() {
    const overlay = document.getElementById('povOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    const hud = document.querySelector('.status-display');
    setTimeout(() => { if (hud) hud.textContent = 'Crossing Bridge...'; }, 1500);
    setTimeout(() => { if (hud) hud.textContent = 'Bridge Crossed ✓'; }, 2500);
    setTimeout(() => { window.location.href = '/bridges'; }, 3500);
}

// ─── BRIDGES PAGE ───
let selectedBridgeId = null;
let sensorInterval = null;
let trendChart = null;
let riskChart = null;

const BRIDGE_INFO = {
    'anna-nagar': { name: 'Anna Nagar Flyover', age: '25 years', grade: '7.5/10', traffic: '45,000/day' },
    'kodambakkam': { name: 'Kodambakkam Bridge', age: '40 years', grade: '5.0/10', traffic: '62,000/day' },
    'adyar': { name: 'Adyar Bridge', age: '55 years', grade: '4.2/10', traffic: '78,000/day' }
};

function selectBridge(id) {
    selectedBridgeId = id;
    const info = BRIDGE_INFO[id];
    if (!info) return;
    document.getElementById('selectedBridgeName').textContent = info.name;
    document.getElementById('infoAge').textContent = info.age;
    document.getElementById('infoGrade').textContent = info.grade;
    document.getElementById('infoTraffic').textContent = info.traffic;
    document.getElementById('bridgeInfoPanel').style.display = 'block';
    document.getElementById('bridgeInfoPanel').scrollIntoView({ behavior: 'smooth' });
}

function predictBridge() {
    if (!selectedBridgeId) return;
    document.getElementById('bridgeMapView').style.display = 'none';
    document.getElementById('predictionView').style.display = 'block';
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('liveMonitoring').style.display = 'none';

    fetchPrediction();
}

function fetchPrediction() {
    fetch('/predict/' + selectedBridgeId)
        .then(r => r.json())
        .then(data => {
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('liveMonitoring').style.display = 'block';
            updateSensors(data.sensor);
            updatePrediction(data);
            initCharts(data);
            startLiveUpdates();
        })
        .catch(err => {
            console.error(err);
            document.getElementById('loadingSpinner').style.display = 'none';
            alert('Prediction failed. Is Flask running?');
        });
}

function updateSensors(s) {
    document.getElementById('sensorTemp').textContent = s.temperature + '°C';
    document.getElementById('sensorHumidity').textContent = s.humidity + '%';
    document.getElementById('sensorTraffic').textContent = s.traffic_load.toLocaleString();
    document.getElementById('sensorWind').textContent = s.wind_speed + ' m/s';
}

function updatePrediction(data) {
    document.getElementById('predBridgeName').textContent = data.bridge;
    document.getElementById('predYears').textContent = data.years_until_tear;
    document.getElementById('predRisk').textContent = data.risk_level;
    document.getElementById('predRisk').style.color = data.risk_color;
    document.getElementById('predCircle').style.borderColor = data.risk_color;
    document.getElementById('predCircle').style.boxShadow = '0 0 30px ' + data.risk_color + '55';

    let status = data.years_until_tear > 30 ? 'Stable' : data.years_until_tear > 15 ? 'Needs Attention' : 'Critical';
    document.getElementById('predStatus').textContent = status;
    document.getElementById('predStatus').style.color = data.risk_color;

    drawGauge(data.years_until_tear, data.risk_color);
}

function drawGauge(value, color) {
    const canvas = document.getElementById('riskGauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 200, 120);
    // background arc
    ctx.beginPath();
    ctx.arc(100, 100, 70, Math.PI, 0, false);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#21262d';
    ctx.stroke();
    // value arc
    const pct = Math.min(value / 100, 1);
    ctx.beginPath();
    ctx.arc(100, 100, 70, Math.PI, Math.PI + (Math.PI * pct), false);
    ctx.lineWidth = 12;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
    // text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(value + ' yrs', 100, 95);
}

let trendData = { temp: [], wind: [], labels: [] };

function initCharts(data) {
    const tCtx = document.getElementById('trendChart');
    const rCtx = document.getElementById('riskChart');
    if (!tCtx || !rCtx) return;

    trendData = { temp: [data.sensor.temperature], wind: [data.sensor.wind_speed], labels: ['0s'] };

    if (trendChart) trendChart.destroy();
    trendChart = new Chart(tCtx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [
                { label: 'Temp °C', data: trendData.temp, borderColor: '#ff6b6b', tension: 0.4, fill: false },
                { label: 'Wind m/s', data: trendData.wind, borderColor: '#00ff88', tension: 0.4, fill: false }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#8b949e' } } },
            scales: {
                x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
                y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
            }
        }
    });

    if (riskChart) riskChart.destroy();
    riskChart = new Chart(rCtx, {
        type: 'doughnut',
        data: {
            labels: ['Safe', 'Warning', 'Danger'],
            datasets: [{
                data: [
                    Math.max(data.years_until_tear, 0),
                    Math.max(50 - data.years_until_tear, 0),
                    Math.max(20 - data.years_until_tear, 0)
                ],
                backgroundColor: ['#00ff88', '#ffaa00', '#ff4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#8b949e' } } }
        }
    });
}

function startLiveUpdates() {
    if (sensorInterval) clearInterval(sensorInterval);
    let tick = 1;
    sensorInterval = setInterval(() => {
        fetch('/predict/' + selectedBridgeId)
            .then(r => r.json())
            .then(data => {
                updateSensors(data.sensor);
                updatePrediction(data);
                // update trend chart
                trendData.labels.push(tick * 5 + 's');
                trendData.temp.push(data.sensor.temperature);
                trendData.wind.push(data.sensor.wind_speed);
                if (trendData.labels.length > 12) {
                    trendData.labels.shift();
                    trendData.temp.shift();
                    trendData.wind.shift();
                }
                if (trendChart) trendChart.update();
                tick++;
            });
    }, 5000);
}

function returnToBridges() {
    if (sensorInterval) clearInterval(sensorInterval);
    document.getElementById('predictionView').style.display = 'none';
    document.getElementById('bridgeMapView').style.display = 'block';
    document.getElementById('bridgeInfoPanel').style.display = 'none';
}