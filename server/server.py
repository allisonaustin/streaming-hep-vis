import pandas as pd
import numpy as np
from flask import Flask, jsonify, send_file
from flask_cors import CORS
from datetime import datetime
import os
import json

app = Flask(__name__)
cors = CORS(app)

path = 'data/'
fpathProcessed = '../ui/data/'

def write_to_json(data, outfile):
    with open(outfile, 'w') as f:
        json.dump(data, f)

app.route("/")
def get_hour_data(file, root):
    with open(file, 'r') as f:
        current_hour = None
        hour_data = []

        json_data = json.load(f)

        for data in json_data:
            timestamp_str = str(data.get('timestamp'))
            timestamp = datetime.fromtimestamp(data.get('timestamp') / 1000.0) 

            if current_hour is None or timestamp.hour != current_hour :
                if hour_data:
                    outfile = fpathProcessed + root + '/' + f"far_data_{timestamp.strftime('%Y-%m-%d_%H')}.json"
                    write_to_json(hour_data, outfile)
                hour_data = []
                current_hour = timestamp.hour

            hour_data.append(data)

    if hour_data:
        outfile = fpathProcessed + root + '/' + f"far_data_{timestamp.strftime('%Y-%m-%d_%H')}.json"
        write_to_json(hour_data, outfile)

if __name__ == '__main__':
    get_hour_data(path + 'farm/' + 'combined-farm-data.json', 'farm')
    app.run(debug=True)