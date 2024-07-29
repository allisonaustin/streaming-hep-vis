import pandas as pd
import numpy as np
import pingouin as pg
from flask import Flask, jsonify, Response, request
from flask_cors import CORS
from pygam import GAM, s
from scipy.interpolate import BSpline, splrep, splev
from sklearn.decomposition import PCA
from datetime import datetime
import os
import json
import time
import math

from inc_ms_fda import IncFDO
from prog_ms_fda import ProgressiveFDA

app = Flask(__name__)
cors = CORS(app)

farm_df = pd.DataFrame()
df = pd.DataFrame()
X_ori = pd.DataFrame()
filepath = '../ui/data/'
fname = ''
init_timepts = 70000
inc_rows = 1500 
skip_rows = 167000
farm_cols = []
cols = []
n_inc = 0
inc = 0
prog = 0
inc_fdo = IncFDO()

@app.route("/getData/<dir>/<filename>/<inc>")
def get_data(dir, filename, inc):
    global farm_df
    global df 
    global X_ori
    global filepath
    global fname
    global init_timepts
    global skip_rows 
    global inc_rows
    global n_inc
    global farm_cols
    global cols 

    rows = init_timepts
    fname = filename

    if (dir == 'farm'):
        if int(inc) == 0:
            skip_rows = 167000
            farm_cols = pd.read_csv(filepath + dir + '/' + filename, nrows=1).columns
            farm_df = pd.read_csv(filepath + dir + '/' + filename, skiprows=skip_rows, nrows=init_timepts, names=farm_cols)
            X_ori = farm_df
            skip_rows += init_timepts 
        else:
            skip_rows += inc_rows
            n_inc += 1
            farm_df = pd.read_csv(filepath + dir + '/' + filename, skiprows=skip_rows, nrows=inc_rows, names=farm_cols)

        farm_df['timestamp'] = farm_df['timestamp'].apply(lambda x: int(x) * 1000 if isinstance(x, int) else int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
        final_df = farm_df.replace({np.nan: None})
    else:
        if (int(inc) == 0):
            skip_rows = 167000
            cols = pd.read_csv(filepath + dir + '/' + filename, nrows=1).columns
            df = pd.read_csv(filepath + dir + '/' + filename, skiprows=1, names=cols)
        else:
            df = pd.read_csv(filepath + dir + '/' + filename, names=cols, skiprows=1)

        df['timestamp'] = df['timestamp'].apply(lambda x: int(x) * 1000 if isinstance(x, int) else int(datetime.strptime(x, '%Y-%m-%d %H:%M:%S').timestamp()) * 1000)
        first_ts = farm_df['timestamp'].iloc[0]
        last_ts = farm_df['timestamp'].max()
        df = df[(df['timestamp'] >= first_ts) & (df['timestamp'] <= last_ts)]
        df = df[df['datadisk'] == 7]
        final_df = df.replace({np.nan: None}) 
    
    response = {
        'data': final_df.to_dict(orient='records')
    }
    return Response(json.dumps(response), mimetype='application/json')
    

@app.route('/getCorr')
def get_corr():
    global farm_df 
    if farm_df.empty:
        return
    dat = farm_df.iloc[:, :34].drop(columns=['timestamp', 'nodeId', 'mem_free', 'mem_total', 'mem_shared'])
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

# MS data for one group
@app.route('/getMagnitudeShape/<xgroup>/<ygroup>/<incremental_update>/<progressive_update>')
def get_ms_inc(xgroup, ygroup, incremental_update, progressive_update):
    global farm_df 
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

    ms_data = farm_df.set_index('timestamp') \
                .pivot(columns='nodeId', values=xgroup).T
                # .apply(lambda row: row.fillna(row.mean()), axis=0).T
    init_n = len(X_ori['nodeId'].unique())
    # fix me!!!

    color_data = X_ori.set_index('timestamp') \
                    .pivot(columns='nodeId', values=ygroup).T
                    # .apply(lambda row: row.fillna(row.mean()), axis=0).T
    var_ms = color_data.var(axis=1)
    min_ms = color_data.min(axis=1)
    max_ms = color_data.max(axis=1)
    var_lis = [{'nodeId': node_id, 'val': variance} for node_id, variance in var_ms.items() if not math.isnan(variance)]
    min_lis = [{'nodeId': node_id, 'val': min_val} for node_id, min_val in min_ms.items() if not math.isnan(min_val)]
    max_lis = [{'nodeId': node_id, 'val': max_val} for node_id, max_val in max_ms.items() if not math.isnan(max_val)]

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

# Multivariate MS
@app.route('/getMagnitudeShapeFDA/<groups>/<incremental_update>/<progressive_update>')
def get_ms_inc_all(groups, incremental_update, progressive_update):
    global farm_df 
    global X_ori
    global fname
    global farm_cols 
    global init_timepts
    global inc
    global n_inc
    global prog
    global inc_fdo

    groups = ['cpu_idle', 'cpu_nice', 'cpu_system', 'cpu_aidle', 'cpu_num', 'cpu_speed', 'cpu_wio', 
            'bytes_in', 'bytes_out', 'disk_free', 'disk_total', 'part_max_used', 'mem_buffers', 
            'mem_cached', 'mem_free','mem_shared', 'mem_total', 'swap_total', 'swap_free', 
            'proc_total', 'boottime', 'load_fifteen', 'load_five', 'load_one']

    inc = int(incremental_update)
    prog = int(progressive_update)

    # ms_data = farm_df[groups]
    # ms_data_final = pd.DataFrame()
    # # min max scaling
    # for i in range(ms_data.shape[1]):
    #     min_value = min(ms_data[ms_data.columns[i]])
    #     max_value = max(ms_data[ms_data.columns[i]])
    #     ms_data_final[ms_data.columns[i]] = (ms_data[ms_data.columns[i]] - min_value) / (max_value - min_value)

    ms_data_final = pd.read_csv(filepath + 'farm/ms_final.csv', index_col=0)

    init_n = len(X_ori['nodeId'].unique())

    response = {'data': [], 'nodeIds': []}
    response['nodeIds'] = farm_df['nodeId'].tolist()

    if (inc == 0 and prog == 0):
        inc_fdo = IncFDO()
        inc_fdo.initial_fit(ms_data_final)
        lis = np.vstack((inc_fdo.MO, inc_fdo.VO)).T.tolist()
        response['data'] = lis
    if (inc == 1):
        # taking average over inc interval
        ms_data_final['avg'] = ms_data_final.mean(axis=1)
        x_new = ms_data_final.iloc[:init_n, -1].to_numpy()
        inc_fdo.partial_fit(x_new)
        # if (n_inc + 1) % 10 == 0:
        lis = np.vstack((inc_fdo.MO, inc_fdo.VO)).T.tolist()
        response['data'] = lis

    return Response(json.dumps(response), mimetype='application/json')

def preprocess(df, value_column):
    return df.loc[:, ['timestamp', 'nodeId', value_column]] \
             .pivot_table(index='timestamp', columns='nodeId', values=value_column) \
             .apply(lambda row: row.fillna(row.mean()), axis=0).T

def getPCs(X_i):
    baseline = X_i.values
    mean_hat = baseline.mean(axis=0)
    demeaned = baseline - mean_hat

    pca = PCA()
    pca.fit(demeaned)
    scores = pca.transform(demeaned)

    explained_variance_ratio_cumsum = np.cumsum(pca.explained_variance_ratio_)
    npc = np.sum(explained_variance_ratio_cumsum < 0.9999) + 1
    # print(f"Number of principal components: {npc}")

    npc = np.sum(np.cumsum(pca.explained_variance_ratio_) < 0.9999) + 1
    P_fin = pd.DataFrame(scores[:, :npc], columns=[f"PC{k+1}" for k in range(npc)])
    P_fin['Measurement'] = X_i.index
    return P_fin

def smooth_bspline(df, k=3, s=0.0):
    if len(df) < k + 1:
        return df
    x = np.arange(len(df))
    t, c, k = splrep(x, df, k=k, s=s)
    smoothed = splev(x, (t, c, k))
    return pd.Series(smoothed, index=df.index)

def smooth_gam(df):
    if (len(df) == 0):
        return df
    x = np.arange(len(df))
    gam = GAM(s(0)).fit(x, df)
    smoothed = gam.predict(x)
    return pd.Series(smoothed, index=df.index)

@app.route('/getFPCA/<k>/<s>')
def get_fpca(k, s):
    global farm_df 
    global farm_cols
    global filepath

    pca_cols = ['cpu_idle', 'cpu_nice', 'cpu_system', 'cpu_aidle', 'cpu_num', 'cpu_speed', 'cpu_wio', 
            'bytes_in', 'bytes_out', 'disk_free', 'disk_total', 'part_max_used', 'mem_buffers', 
            'mem_cached', 'mem_free', 'mem_total', 'swap_total', 'swap_free', 
            'proc_total', 'boottime', 'load_fifteen', 'load_five', 'load_one']

    P_final = pd.read_csv(filepath + 'farm/P_final.csv', index_col=0)

    # P_final = pd.DataFrame()

    # dataframes = [preprocess(farm_df, col) for col in pca_cols]
    # for i, (temp_df, col_name) in enumerate(zip(dataframes, pca_cols)):
    #     try:
    #         P_df = getPCs(temp_df)
            # P_df_temp = pd.DataFrame({
            #     'Measurement': P_df['Measurement'],
            #     'Col': col_name,
            #     'PC1': P_df['PC1'],
            #     'PC2': P_df['PC2'],
            #     'PC3': P_df['PC3'],
            #     'PC1_smooth_bspline': smooth_bspline(P_df['PC1'].dropna()),
            #     'PC2_smooth_bspline': smooth_bspline(P_df['PC2'].dropna()),
            #     'PC3_smooth_bspline': smooth_bspline(P_df['PC3'].dropna()),
            #     'PC1_smooth_gam': smooth_gam(P_df['PC1'].dropna()),
            #     'PC2_smooth_gam': smooth_gam(P_df['PC2'].dropna()),
            #     'PC3_smooth_gam': smooth_gam(P_df['PC3'].dropna()),
            # })
            # P_final = pd.concat([P_final, P_df_temp])
    #     except Exception as e:
    #         print(f"Error processing {col_name}: {e}")
    
    # print(P_final.head())
    return Response(P_final.to_json(orient='records'), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)