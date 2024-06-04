import pandas as pd
import numpy as np
import pingouin as pg
from flask import Flask, jsonify, Response, request
from flask_cors import CORS
from datetime import datetime
import os
import json
import time

from inc_ms_fda import IncFDO
from prog_ms_fda import ProgressiveFDA

app = Flask(__name__)
cors = CORS(app)

df = pd.DataFrame()
filepath = '../ui/data/farm/'
fname = ''
init_timepts = 60000
inc_rows = 1500
skip_rows = 0
cols = []

@app.route("/getData/<filename>/<inc>")
def get_data(filename, inc):
    global df 
    global filepath
    global fname
    global init_timepts
    global skip_rows 
    global inc_rows
    global cols 

    rows = init_timepts
    fname = filename

    if int(inc) == 0:
        skip_rows = 0
        rows = init_timepts
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=init_timepts)
        cols = df.columns
        skip_rows += init_timepts
    else:
        skip_rows += inc_rows
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=inc_rows, names=cols)

    df['timestamp'] = df['timestamp'].apply(lambda x: int(x) * 1000 if isinstance(x, int) else int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
    final_df = df.replace({np.nan: None})
    return Response(final_df.to_json(orient='records'), mimetype='application/json')

@app.route('/getCorr')
def get_corr():
    global df 
    if df.empty:
        return
    dat = df.drop(columns=['timestamp', 'nodeId'])
    dat = dat.replace({np.nan: None})
    corr_df = dat.corr().round(2)
    return Response(corr_df.to_json(orient='records'), mimetype='application/json')

@app.route('/getMagnitudeShapeFDA/<group>')
def get_ms_inc(group):
    global df 
    global cols 

    ms_data = df.set_index('timestamp') \
                .pivot(columns='nodeId', values=group)
    
    var = ms_data.var()
    var_lis = [{'nodeId': node_id, 'var': variance} for node_id, variance in var.items()]

    inc_fdo = IncFDO()
    inc_fdo.initial_fit(ms_data.transpose())
    lis = np.vstack((inc_fdo.MO, inc_fdo.VO)).T.tolist()
    response = {'data': lis, 'variance': var_lis, 'nodeIds': inc_fdo.VO.index.tolist()}
    return Response(json.dumps(response), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)