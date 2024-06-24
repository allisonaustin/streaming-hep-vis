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
X_ori = pd.DataFrame()
filepath = '../ui/data/farm/'
fname = ''
init_timepts = 60000
inc_rows = 1500 
skip_rows = 15000
cols = []
n_inc = 0
inc = 0
prog = 0
inc_fdo = IncFDO()

@app.route("/getData/<filename>/<inc>")
def get_data(filename, inc):
    global df 
    global X_ori
    global filepath
    global fname
    global init_timepts
    global skip_rows 
    global inc_rows
    global n_inc
    global cols 

    rows = init_timepts
    fname = filename

    if int(inc) == 0:
        skip_rows = 15000
        cols = pd.read_csv(filepath + filename, nrows=1).columns
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=init_timepts, names=cols)
        nan_events = df.iloc[:, :33]
        X_ori = df
        skip_rows += init_timepts 
    else:
        skip_rows += inc_rows
        n_inc += 1
        df = pd.read_csv(filepath + filename, skiprows=skip_rows, nrows=inc_rows, names=cols)
        nan_events = df.iloc[:, :33]

    nan_events['timestamp'] = pd.to_datetime(nan_events['timestamp'])
    event_counts = nan_events.set_index('timestamp').isna().sum(axis=1).resample('T').sum()
    event_counts.index = event_counts.index.astype(str)
    df['timestamp'] = df['timestamp'].apply(lambda x: int(x) * 1000 if isinstance(x, int) else int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
    final_df = df.replace({np.nan: None})
    
    response = {
        'data': final_df.to_dict(orient='records'),
        'event_counts': event_counts.to_dict()
    }
    return Response(json.dumps(response), mimetype='application/json')

@app.route('/getCorr')
def get_corr():
    global df 
    if df.empty:
        return
    dat = df.iloc[:, :34].drop(columns=['timestamp', 'nodeId', 'mem_free', 'mem_total', 'mem_shared'])
    # dat = dat.replace({np.nan: None})

    corr_df = dat.corr().round(2)
    total_corr = np.array(dat.corr().round(2)) # zero-order correlation
    partial_corr = np.array(dat.pcorr().round(2)) # partial correlation

    upper_total_corr = total_corr[np.triu_indices(dat.shape[1], k=1)]
    lower_partial_corr = partial_corr[np.tril_indices(dat.shape[1], k=-1)]
    result_corr = np.identity(dat.shape[1])
    rows, col = np.triu_indices(dat.shape[1], 1)
    result_corr[rows, col] = upper_total_corr
    result_corr[col, rows] = lower_partial_corr
    result_corr_df = pd.DataFrame(result_corr)
    result_corr_df.columns = dat.corr().columns
    result_corr_df.set_index(dat.corr().index, inplace=True)

    return Response(result_corr_df.to_json(orient='records'), mimetype='application/json')

@app.route('/getMagnitudeShapeFDA/<xgroup>/<ygroup>/<incremental_update>/<progressive_update>')
def get_ms_inc(xgroup, ygroup, incremental_update, progressive_update):
    global df 
    global X_ori
    global fname
    global cols 
    global init_timepts
    global inc
    global n_inc
    global prog
    global inc_fdo

    inc = int(incremental_update)
    prog = int(progressive_update)

    ms_data = df.set_index('timestamp') \
                .pivot(columns='nodeId', values=xgroup).T
                # .apply(lambda row: row.fillna(row.mean()), axis=0).T

    init_n = len(X_ori['nodeId'].unique())

    # fix me!!!
    color_data = X_ori.set_index('timestamp') \
                    .pivot(columns='nodeId', values=xgroup).T
                    # .apply(lambda row: row.fillna(row.mean()), axis=0).T
    
    var_ms = color_data.var(axis=1)
    min_ms = color_data.min(axis=1)
    max_ms = color_data.max(axis=1)
    var_lis = [{'nodeId': node_id, 'val': variance} for node_id, variance in var_ms.items()]
    min_lis = [{'nodeId': node_id, 'val': min_val} for node_id, min_val in min_ms.items()]
    max_lis = [{'nodeId': node_id, 'val': max_val} for node_id, max_val in max_ms.items()]

    response = {'data': [], 'variance': [], 'min': [], 'max': [], 'nodeIds': []}
    response['variance'] = var_lis
    response['min'] = min_lis 
    response['max'] = max_lis 
    response['nodeIds'] = ms_data.index.tolist()

    if (inc == 0 and prog == 0):
        inc_fdo = IncFDO()
        inc_fdo.initial_fit(ms_data)
        lis = np.vstack((inc_fdo.MO, inc_fdo.VO)).T.tolist()
        response['data'] = lis
    if (inc == 1):
        # taking average over inc interval
        ms_data['avg'] = ms_data.mean(axis=1)
        x_new = ms_data.iloc[:init_n, -1].to_numpy()
        inc_fdo.partial_fit(x_new)
        # if (n_inc + 1) % 10 == 0:
        lis = np.vstack((inc_fdo.MO, inc_fdo.VO)).T.tolist()
        response['data'] = lis

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

    df_baseline = df.set_index('timestamp') \
                    .pivot(columns='nodeId', values=group) \
                    .apply(lambda col: col.fillna(col.mean()), axis=1).T

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