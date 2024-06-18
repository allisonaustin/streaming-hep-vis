import pandas as pd
import numpy as np
import pingouin as pg
from flask import Flask, jsonify, Response, request
from flask_cors import CORS
from statsmodels.gam.api import GLMGam, BSplines
from scipy.interpolate import BSpline
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
skip_rows = 15000
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
        init_timepts = 60000
        skip_rows = 15000
        cols = ['timestamp', 'cpu_system', 'boottime', 'Pool Size Time_P1', 'mem_free',
       'Missed Buffers_P1', 'bytes_out', 'cpu_user', 'cpu_idle',
       'Pool Size Data_P1', 'pkts_out', 'load_fifteen', 'part_max_used',
       'load_five', 'mem_shared', 'swap_free', 'Pool Size Events_P1',
       'mem_total', 'load_one', 'mem_cached', 'mem_buffers', 'pkts_in',
       'cpu_speed', 'bytes_in', 'cpu_wio', 'cpu_nice', 'disk_free',
       'disk_total', 'cpu_aidle', 'proc_total', 'swap_total', 'proc_run',
       'cpu_num', 'nodeId', 'RPCRetrans_rate', 'TotalRetrans_rate',
       'TCPSlowStartRetrans_rate', 'TCPFastRetrans_rate', 'RetransSegs_rate',
       'TCPLostRetransmit_rate', 'TCPForwardRetrans_rate', 'TotalRetrans',
       'TCPSlowStartRetrans', 'RPCRetrans', 'TCPFastRetrans',
       'TCPLostRetransmit', 'TCPForwardRetrans', 'RetransSegs']
        # cols = pd.read_csv(filepath + filename, nrows=1).columns
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=init_timepts, names=cols)
        skip_rows += init_timepts 
    else:
        skip_rows += inc_rows
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=inc_rows, names=cols)

    df['timestamp'] = df['timestamp'].apply(lambda x: int(x) * 1000 if isinstance(x, int) else int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
    final_df = df.replace({np.nan: None})
    print(final_df)
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

    ms_data = df.set_index('nodeId') \
                .pivot(columns='timestamp', values=group)
    
    var_ms = ms_data.var(axis=1)
    min_ms = ms_data.min(axis=1)
    max_ms = ms_data.max(axis=1)
    var_lis = [{'nodeId': node_id, 'val': variance} for node_id, variance in var_ms.items()]
    min_lis = [{'nodeId': node_id, 'val': min_val} for node_id, min_val in min_ms.items()]
    max_lis = [{'nodeId': node_id, 'val': max_val} for node_id, max_val in max_ms.items()]

    inc_fdo = IncFDO()
    inc_fdo.initial_fit(ms_data)
    lis = np.vstack((inc_fdo.MO, inc_fdo.VO)).T.tolist()
    response = {'data': lis, 'variance': var_lis, 'min': min_lis, 'max': max_lis, 'nodeIds': inc_fdo.VO.index.tolist()}
    return Response(json.dumps(response), mimetype='application/json')

@app.route('/getFPCA/<group>')
def get_fpca(group):
    global df 

    bs="cr"
    k="10"
    optimizer=['outer', 'newton']
    method="GCV.Cp"
    nodes = df_baseline.index.to_list()
    args = ["df_save.csv", nodes, bs, k, str(optimizer)[2:-2], method]

    df_baseline = df.set_index('nodeId') \
                    .pivot(columns='timestamp', values=group) \
                    .apply(lambda col: col.fillna(col.mean()), axis=1)

    tract = np.arange(len(df_baseline))

    # estimating the mean functions
    farm_baseline = df_baseline.values
    smooth_curves = np.zeros(farm_baseline.shape)
    
    n_rows = farm_baseline.shape[0] # node ids

    for j in range(n_rows):
        x = tract
        y = farm_baseline[j, :]
        bs = BSplines(x[:, None], df=int(k), degree=[3])
        gam = GLMGam(y, smoother=bs, alpha=0)
        result = gam.fit()
        smooth_curves[j, :] = result.fittedvalues

    mean_hat = smooth_curves.mean(axis=1)
    r_save = pd.concat([df_baseline, pd.Series(mean_hat, name="mean.hat")], axis=1)

    r_save.to_csv("ui/data/farm/farm_data_temp.csv", index=False)

    # covariance of smooth curves
    smooth_cov = np.cov(smooth_curves)
    # spectral decomposition of the estimated covariance
    evalues, evectors = np.linalg.eigh(smooth_cov)
    evalues, evectors = evalues[evalues > 0], evectors[:, evalues > 0]

    # scale eigenfunctions
    efns0 = evectors * np.sqrt(93)
    evals0 = evalues / 93
    pve = np.cumsum(evals0) / np.sum(evals0)
    npc = np.sum(pve < 0.9999) + 1

    if npc == 1:
        npc = np.sum(pve < 0.9999998) + 2

    # truncated estimated eigen components
    efns = efns0[:, :npc]
    evals = evals0[:npc]

    k_pc = 1
    effect = efns[:, k_pc] * 2 * np.sqrt(evals[k_pc])
    mat = np.column_stack([mean_hat - effect, mean_hat + effect])

    # estimation of scores & fitted curves
    demeaned = farm_baseline - mean_hat[:, None]
    scores = np.zeros((n_rows, npc))
    fitted = np.zeros_like(farm_baseline)

    scores_fin = pd.DataFrame(scores, columns=[f"PC{k+1}" for k in range(npc)])
    scores_fin['Measurement'] = df_baseline.index

    pd.DataFrame(efns).to_csv("ui/data/farm/efns.csv", index=False)
    scores_fin.to_csv("ui/data/farm/scores.csv", index=False)
    pd.DataFrame(fitted.T).to_csv("ui/data/farm/fitted.csv", index=False)
    return Response(json.dumps(efns), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)