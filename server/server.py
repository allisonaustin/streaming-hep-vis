import pandas as pd
import numpy as np
from flask import Flask, jsonify, Response, request
from flask_cors import CORS
from datetime import datetime
import os
import json
import time

app = Flask(__name__)
cors = CORS(app)

df = pd.DataFrame()
filepath = '../ui/data/farm/'
init_timepts = 10000
inc_rows = 150
skip_rows = 0
cols = []

@app.route("/getData/<filename>/<inc>")
def get_data(filename, inc):
    global df 
    global filepath
    global init_timepts
    global rows 
    global skip_rows 
    global inc_rows
    global cols 

    rows = init_timepts

    if int(inc) == 0:
        skip_rows = 0
        rows = init_timepts
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=rows)
        cols = df.columns
        print(cols)
    else:
        skip_rows = rows
        rows = inc_rows
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=rows, names=cols)
    
    df['timestamp'] = df['timestamp'].apply(lambda x: int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
    df = df.replace({np.nan: None})
    return Response(df.to_json(orient='records'), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)