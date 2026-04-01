from flask import Flask, render_template, jsonify
import numpy as np
import random
from sklearn.linear_model import LinearRegression
import pandas as pd

app = Flask(__name__)

# ─── ML MODEL ───
np.random.seed(42)
n = 500

data = pd.DataFrame({
    'age': np.random.randint(50, 800, n),
    'material_grade': np.random.uniform(1, 10, n),
    'traffic_load': np.random.randint(5000, 100000, n),
    'expansion_joint': np.random.randint(0, 2, n),
    'maintenance_score': np.random.uniform(1, 10, n),
    'temperature': np.random.uniform(15, 45, n),
    'humidity': np.random.uniform(30, 95, n),
    'wind_speed': np.random.uniform(0, 25, n),
})

data['years_until_tear'] = (
    100 - data['age']
    - (data['expansion_joint'] * 20)
    - (data['traffic_load'] / 10000)
    + (data['maintenance_score'] * 15)
    - (data['temperature'] * 0.3)
    - (data['humidity'] * 0.1)
    - (data['wind_speed'] * 0.5)
    + np.random.normal(0, 2, n)
).clip(0, 150)

features = ['age', 'material_grade', 'traffic_load', 'expansion_joint',
            'maintenance_score', 'temperature', 'humidity', 'wind_speed']

model = LinearRegression()
model.fit(data[features], data['years_until_tear'])

# ─── BRIDGES ───
BRIDGES = {
    'anna-nagar': {'name': 'Anna Nagar Flyover', 'age': 25, 'material_grade': 7.5,
                   'traffic_load': 45000, 'expansion_joint': 0, 'maintenance_score': 7.2},

    'kodambakkam': {'name': 'Kodambakkam Bridge', 'age': 40, 'material_grade': 5.0,
                    'traffic_load': 62000, 'expansion_joint': 1, 'maintenance_score': 4.5},

    'adyar': {'name': 'Adyar Bridge', 'age': 55, 'material_grade': 4.2,
              'traffic_load': 78000, 'expansion_joint': 1, 'maintenance_score': 3.8}
}

# ─── ROUTES ───
@app.route('/')
def demo():
    return render_template('demo.html', page='demo')

@app.route('/home')
def home():
    return render_template('demo.html', page='home')

@app.route('/bridges')
def bridges():
    return render_template('demo.html', page='bridges')

@app.route('/predict/<bridge_id>')
def predict(bridge_id):
    b = BRIDGES.get(bridge_id)

    temp = round(random.uniform(20, 40), 1)
    humidity = round(random.uniform(40, 90), 1)
    wind = round(random.uniform(1, 15), 1)
    traffic = random.randint(30000, 95000)

    X = np.array([[b['age'], b['material_grade'], traffic,
                   b['expansion_joint'], b['maintenance_score'],
                   temp, humidity, wind]])

    prediction = max(0, round(float(model.predict(X)[0]), 1))

    if prediction > 30:
        risk = 'Low'; color = '#00ff88'
    elif prediction > 15:
        risk = 'Medium'; color = '#ffaa00'
    else:
        risk = 'High'; color = '#ff4444'

    return jsonify({
        'bridge': b['name'],
        'years_until_tear': prediction,
        'risk_level': risk,
        'risk_color': color,
        'sensor': {
            'temperature': temp,
            'humidity': humidity,
            'wind_speed': wind,
            'traffic_load': traffic
        }
    })

if __name__ == '__main__':
    app.run(debug=True)

app = app
