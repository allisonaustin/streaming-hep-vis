import axios from 'axios';

/* MODEL */
import * as m from './model.js';
import * as g from './groups.js';
import { setFeature1, setFeature2 } from './select.js';

/* UPDATE */
import * as u from './update.js';

/* VIEWS */
import * as lineClusterView from './line-cluster.js';
import * as heatMapView from './heatmap.js';
import * as msplot from './msplot.d3.js';

import { 
  calcContainerWidth, 
  calcContainerHeight, 
  prepareSvgArea 
} from './d3_utils.js';

const heatmapSvgData = m.svgData();
const lineSvgData = m.svgData();
const msPlotData = m.svgData();
let refreshIntervalId;

async function getData(filename, inc) {
  const flaskUrl = m.flaskUrl + `/getData/${filename}/${inc}`;
  try {
    const res = await fetch(flaskUrl);
    if (!res.ok) {
      throw new Error('Error getting data:', farmGroup);
    }
    const data = await res.json();
    return data
  } catch(error) {
    console.error('Error:', error);
  }
}

async function getMsData(group) {
  const flaskUrl = m.flaskUrl + `/getMagnitudeShapeFDA/${group}`;
  try {
    const res = await fetch(flaskUrl);
    if (!res.ok) {
      throw new Error('Error getting data:', group);
    }
    const data = res.json();
    return data
  } catch(error) {
    console.error('Error:', error);
  }
}

function getCorrelationData() {
  const flaskUrl = m.flaskUrl + `/getCorr`;
  try {
    const res =  fetch(flaskUrl);
    if (!res.ok) {
      throw new Error('Error getting data:', farmGroup);
    }
    const data = res.json();
    return data
  } catch(error) {
    console.error('Error:', error);
  }
}

function initHeatmap(data, dateValue, type, xGroup, yGroup) {
  heatmapSvgData.domId = 'ts_view';
  heatmapSvgData.svg = d3.select(`#${type}_svg`);
  heatmapSvgData.data = data;
  heatmapSvgData.date = dateValue;
  heatmapSvgData.selectedX = xGroup;
  heatmapSvgData.selectedY = yGroup;
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
  heatmapSvgData.margin = margin;
  heatMapView.createHeatmaps(heatmapSvgData);
}

function initClusterView(data, dateValue, xGroup, yGroup) {
  lineSvgData.domId = 'fc_view';
  lineSvgData.svg = d3.select(`#line_svg`);
  lineSvgData.data = data;
  lineSvgData.date = dateValue;
  lineSvgData.selectedX = xGroup;
  lineSvgData.selectedY = yGroup;
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
  lineSvgData.margin = marginLC;
  lineClusterView.drawSvg(lineSvgData);
}

function initMsPlotView(response, group) {
  msPlotData.domId = 'fc_view';
  msPlotData.svg = d3.select(`#msplot-svg`);
  msPlotData.data = response.data;
  msPlotData.group = group;
  msPlotData.colordata = response.variance;
  const margin = {
    top: 30,
    right: 10,
    bottom: 20,
    left: 40
  }
  msPlotData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${msPlotData.domId}`),
    calcContainerHeight(`#${msPlotData.domId}`),
    margin || {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  );
  msPlotData.margin = margin;
  msplot.appendScatterPlot(msPlotData, response.nodeIds);
}

async function init(dateValue, type) {
  const filename = `far_data_${dateValue}.csv`;
  const xGroup = 'cpu_idle'
  const yGroup = 'bytes_in'
  const data = await getData(filename, 0);
  const msData = await getMsData(xGroup);
  // const uniqueNodes = new Set();
  // data.forEach(obj => {
  //   uniqueNodes.add(obj.nodeId);
  // });
  initHeatmap(data, dateValue, type, xGroup, yGroup)
  initClusterView(data, dateValue, xGroup, yGroup)
  initMsPlotView(msData, xGroup)
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

document.getElementById('feature-1').addEventListener('click', () => {
  setFeature1(1);
  setFeature2(0);
});

document.getElementById('feature-2').addEventListener('click', () => {
  setFeature1(0);
  setFeature2(1);
});