import axios from 'axios';

/* MODEL */
import * as m from './model.js';
import * as g from './groups.js';

/* UPDATE */
import * as u from './update.js';

/* VIEWS */
import * as lineClusterView from './line-cluster.js';
import * as heatMapView from './heatmap.js'

import { 
  calcContainerWidth, 
  calcContainerHeight, 
  prepareSvgArea 
} from './d3_utils.js';

const heatmapSvgData = m.svgData();
const lineSvgData = m.svgData();
let refreshIntervalId;

async function init(dateValue, type) {
  try {
    const filename = `far_data_${dateValue}.csv`;
    const flaskUrl = m.flaskUrl + `/getData/${filename}/0`;
      const res = await fetch(flaskUrl);
      if (!res.ok) {
        throw new Error('Error getting data:', farmGroup);
      }
      const data = await res.json();

      heatmapSvgData.domId = 'ts_view';
      lineSvgData.domId = 'fc_view';
      heatmapSvgData.svg = d3.select(`#${type}_svg`);
      lineSvgData.svg = d3.select(`#line_svg`);
      heatmapSvgData.data = data;
      lineSvgData.data = data;
      heatmapSvgData.date = dateValue;
      lineSvgData.date = dateValue;

      const margin = { 
        top: 40,
        right: 10,
        bottom: 20,
        left: 20
      };

      heatmapSvgData.svgArea = prepareSvgArea(
        calcContainerWidth(`#${heatmapSvgData.domId}`),
        calcContainerHeight(`#${heatmapSvgData.domId}`),
        margin || {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      );

      const marginLC = {
        top: 20,
        right: 10,
        bottom: 20,
        left: 60
      }
      lineSvgData.svgArea = prepareSvgArea(
        calcContainerWidth(`#${lineSvgData.domId}`),
        calcContainerHeight(`#${lineSvgData.domId}`),
        marginLC || {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      );
      heatmapSvgData.margin = margin;
      lineSvgData.margin = marginLC;

      await heatMapView.createHeatmaps(heatmapSvgData);
      lineClusterView.drawSvg(lineSvgData);
  } catch (error) {
    console.error('Error:', error);
  }
}

window.updateChart = () => {
  if (document.getElementById('data-stream-option').checked) {
    refreshIntervalId = setInterval(() => u.updateCharts(heatmapSvgData), 1000);
  } else {
    clearInterval(refreshIntervalId);
  }
}

document.addEventListener('DOMContentLoaded', function() {
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
      init(document.getElementById('date_selection').value, 'farm');
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });
});