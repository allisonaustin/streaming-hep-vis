import axios from 'axios';

/* MODEL */
import * as m from './model.js';
import * as g from './groups.js';

/* UPDATE */
import * as u from './update.js';

/* VIEWS */
import * as tsView from './ts-view.js';
import * as heatMapView from './heatmap.js'

import { 
  calcContainerWidth, 
  calcContainerHeight, 
  prepareSvgArea 
} from './d3_utils.js';

const svgData = m.svgData();

async function init(dateValue, type) {
  try {
    const filename = `far_data_${dateValue}.csv`;
    const flaskUrl = m.flaskUrl + `/getData/${filename}/0`;
    if (document.getElementById('data-stream-option').checked) {
      const res = await fetch(flaskUrl);
      if (!res.ok) {
        throw new Error('Error getting data:', farmGroup);
      }

      const data = await res.json();

      svgData.domId = 'ts_view';
      svgData.svg = d3.select(`#${type}_svg`);
      svgData.data = data;
      svgData.date = dateValue;
      const margin = { 
        top: 40,
        right: 10,
        bottom: 20,
        left: 20
      };
      svgData.svgArea = prepareSvgArea(
        calcContainerWidth(`#${svgData.domId}`),
        calcContainerHeight(`#${svgData.domId}`),
        margin || {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      );
      svgData.margin = margin;

      await heatMapView.createHeatmaps(svgData);
      setInterval(() => u.updateCharts(svgData), 2000);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

window.updateChart = () => {
  if (svgData.date == undefined) {
    init(document.getElementById('date_selection').value, 'farm')
  } else {
    setInterval(() => u.updateCharts(svgData), 2000);
  }
}

fetch('../data/farm/farm-data-dates.json')
  .then(response => response.json())
  .then(data => {
    for (const date of data.dates) {
      const option = document.createElement("option");
      option.text = date;
      option.value = date;
      document.querySelector('#date_selection').appendChild(option);
    }

    document.querySelector('#date_selection').value = data.dates[0];
    init(document.querySelector('#date_selection').value, 'farm');
});