import axios from 'axios';

/* MODEL */
import * as m from './model.js';
import * as g from './groups.js';
import { setValue, getFeature1, getFeature2, setState, setType } from './stateManager.js';

/* UPDATE */
import * as u from './update.js';

/* VIEWS */
import * as lineClusterView from './line-cluster.js';
import * as heatMapView from './heatmap.js';
import * as msplot from './msplot.d3.js';
import * as correlationView from './corr-matrix.js';

import {
  calcContainerWidth,
  calcContainerHeight,
  prepareSvgArea
} from './d3_utils.js';

const heatmapSvgData = m.svgData();
const lineSvgData = m.svgData();
const msPlotData = m.svgData();
const corrSvgData = m.svgData();
let xGroup = 'cpu_idle';
let yGroup = 'cpu_nice';
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
  } catch (error) {
    console.error('Error:', error);
  }
}

async function getMsData(xGroup, yGroup, inc=0, prog=0) {
  const flaskUrl = m.flaskUrl + `/getMagnitudeShapeFDA/${xGroup}/${yGroup}/${inc}/${prog}`;
  try {
    const res = await fetch(flaskUrl);
    if (!res.ok) {
      throw new Error('Error getting data');
    }
    const data = res.json();
    return data
  } catch (error) {
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
  } catch (error) {
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
  const margin = { top: 15, right: 10, bottom: 10, left: 10 };
  heatmapSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${heatmapSvgData.domId}`),
    calcContainerHeight(`#${heatmapSvgData.domId}`),
    margin || { top: 0, right: 0, bottom: 0, left: 0 }
  );
  heatmapSvgData.margin = margin;
  heatMapView.createHeatmaps(heatmapSvgData);
}

async function initCorrelationView(data) {
  corrSvgData.domId = 'corr_view';
  corrSvgData.svg = d3.select(`#corr_map`);
  corrSvgData.data = data;
  corrSvgData.date = dateValue;
  corrSvgData.selectedX = xGroup;
  corrSvgData.selectedY = yGroup;
  const margin = { top: 75, right: 60, bottom: 60, left: 100 }
  corrSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${corrSvgData.domId}`),
    calcContainerHeight(`#${corrSvgData.domId}`),
    margin || { top: 0, right: 0, bottom: 0, left: 0 }
  );
  corrSvgData.margin = margin;
  correlationView.drawSvg(corrSvgData);
}

async function initClusterView(data, dateValue) {
  lineSvgData.domId = 'fc_view_bottom';
  lineSvgData.svg = d3.select(`#line_svg`);
  lineSvgData.data = data;
  lineSvgData.date = dateValue;
  lineSvgData.selectedX = xGroup;
  lineSvgData.selectedY = yGroup;
  const marginLC = { top: 20, right: 10, bottom: 60, left: 30 }
  lineSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${lineSvgData.domId}`),
    calcContainerHeight(`#${lineSvgData.domId}`),
    marginLC || { top: 0, right: 0, bottom: 0, left: 0 }
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
    left: 20
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
  const msData = await getMsData(xGroup, yGroup, 0, 0);
  const corrData = await getCorrelationData();
  // const uniqueNodes = new Set();
  // data.forEach(obj => {
  //   uniqueNodes.add(obj.nodeId);
  // });
  initHeatmap(data, dateValue, type)
  initClusterView(data, dateValue)
  initCorrelationView(corrData)
  initMsPlotView(msData)
}

window.handleColorChange = () => {
  let option = document.querySelector('input[name="color"]:checked').value;
  setType(option);
  u.updateMS(getFeature1(), getFeature2(), option, false);
}

window.updateDate = () => {
  if (document.getElementById('date_selection') != dateValue) {
    dateValue = document.querySelector('#date_selection').value
    init('farm', dateValue)
  }
}

window.updateChart = () => {
  if (document.getElementById('data-stream-option').checked) {
    refreshIntervalId = setInterval(() => u.updateCharts(heatmapSvgData), 500);
  } else {
    clearInterval(refreshIntervalId);
  }
}

document.addEventListener('DOMContentLoaded', function () {
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
      setValue(xGroup, yGroup)
      init('farm', dateValue);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
});

document.getElementById('feature-1').addEventListener('click', () => {
  setState(1, 0);
});

document.getElementById('feature-2').addEventListener('click', () => {
  setState(0, 1);
});

document.getElementById('yGroupLabel').innerText = yGroup;