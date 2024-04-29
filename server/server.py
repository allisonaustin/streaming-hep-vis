import pandas as pd
import numpy as np
from flask import Flask, jsonify, Response
from flask_cors import CORS
from datetime import datetime
import os
import json
import time

app = Flask(__name__)
cors = CORS(app)

df = pd.DataFrame()
filepath = 'data/farm/combined-farm-data.csv'
init_timepts = 1000

@app.route("/getData")
def get_data(rows=10, skip_rows=0, date='2024-02-22', inc=False):
    global filepath
    global df 

    if not inc:
        skip_rows = 0 
        rows = init_timepts
    else:
        skip_rows = rows
        rows += rows

    df = pd.read_csv(filepath, skiprows=skip_rows, nrows=rows, na_values=['', 'NaN', 'NA', 'N/A', 'null'])
    df['timestamp'] = df['timestamp'].apply(lambda x: int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
    df = df.replace({np.nan: None})
    print(df)

    return Response(df.to_json(orient='records'), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)