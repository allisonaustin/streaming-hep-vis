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
let xGroup = 'cpu_idle';
let yGroup = 'bytes_in';
let refreshIntervalId;
let dateValue;

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

async function getCorrelationData() {
  const flaskUrl = m.flaskUrl + `/getCorr`;
  try {
    const res = await fetch(flaskUrl);
    if (!res.ok) {
      throw new Error('Error getting data:', farmGroup);
    }
    const data = res.json();
    return data
  } catch(error) {
    console.error('Error:', error);
  }
}

async function initHeatmap(data, dateValue, type) {
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

async function initClusterView(data, corrData, dateValue) {
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

async function initMsPlotView(response) {
  msPlotData.domId = 'fc_view';
  msPlotData.svg = d3.select(`#msplot-svg`);
  msPlotData.data = response.data;
  msPlotData.group = xGroup;
  msPlotData.colordata = response.variance;
  msPlotData.selectedX = xGroup;
  msPlotData.selectedY = yGroup;
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

async function init(type, dateValue) {
  const filename = `far_data_${dateValue}.csv`;
  const data = await getData(filename, 0);
  const msData = await getMsData(xGroup);
  const corrData = await getCorrelationData();
  // const uniqueNodes = new Set();
  // data.forEach(obj => {
  //   uniqueNodes.add(obj.nodeId);
  // });
  initHeatmap(data, dateValue, type)
  initClusterView(data, corrData, dateValue)
  initMsPlotView(msData)
}

window.handleColorChange = () => {
  let option = document.querySelector('input[name="color"]:checked').value;
  u.updateMS(msPlotData.selectedX, msPlotData.selectedY, option, false)
}

window.updateChart = () => {
  if (document.getElementById('date_selection') != dateValue) {
    dateValue = document.querySelector('#date_selection').value
    init('farm', dateValue)
  }
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
      dateValue = document.querySelector('#date_selection').value
      init('farm', dateValue);
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