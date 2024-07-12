import axios from 'axios';

/* MODEL */
import * as m from './model.js';
import * as g from './groups.js';
import { setValue, getFeature1, getFeature2, setState, setType, setGridType, setOverviewType } from './stateManager.js';

/* UPDATE */
import * as u from './update.js';

/* VIEWS */
import * as lineClusterView from './line-cluster.js';
import * as heatMapView from './heatmap.js';
import * as msplot from './msplot.d3.js';
import * as correlationView from './corr-matrix.js';
import * as eventView from './bar-chart.js';

import {
  calcContainerWidth,
  calcContainerHeight,
  prepareSvgArea
} from './d3_utils.js';

const heatmapSvgData = m.svgData();
const lineSvgData = m.svgData();
const msPlotData = m.svgData();
const corrSvgData = m.svgData();
const barSvgData = m.svgData();
let xGroup = 'cpu_idle';
let yGroup = 'cpu_nice';
let refreshIntervalId;
let dateValue;
let option;

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

async function getMsData(xGroup, yGroup, inc = 0, prog = 0) {
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
  const margin = { top: 15, right: 10, bottom: 100, left: 10 };
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
  const margin = { top: 60, right: 70, bottom: 60, left: 70 }
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
  const marginLC = { top: 60, right: 20, bottom: 60, left: 30 }
  lineSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${lineSvgData.domId}`),
    calcContainerHeight(`#${lineSvgData.domId}`),
    marginLC || { top: 0, right: 0, bottom: 0, left: 0 }
  );
  lineSvgData.margin = marginLC;
  lineClusterView.drawSvg(lineSvgData);
}

async function initEventView(data) {
  barSvgData.domId = 'e_view';
  barSvgData.svg = d3.select(`#bar_svg`);
  barSvgData.data = data;
  barSvgData.date = dateValue;
  const margin = { top: 15, right: 10, bottom: 20, left: 40 }
  barSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${barSvgData.domId}`),
    calcContainerHeight(`#${barSvgData.domId}`),
    margin || { top: 0, right: 0, bottom: 0, left: 0 }
  );
  barSvgData.margin = margin;
  eventView.drawSvg(barSvgData);
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
  setGridType(1);
  setOverviewType('heatmap');
  // const uniqueNodes = new Set();
  // data.forEach(obj => {
  //   uniqueNodes.add(obj.nodeId);
  // });
  initHeatmap(data.data, dateValue, type)
  initClusterView(data.data, dateValue)
  initCorrelationView(corrData)
  initMsPlotView(msData)
  initEventView(data.event_counts)
}

async function updateView(date) {
  const filename = `far_data_${date}.csv`;
  const data = await getData(filename, 0);
  const msData = await getMsData(xGroup, yGroup, 0, 0);
  const corrData = await getCorrelationData();
  heatmapSvgData.data = data.data;
  heatMapView.createHeatmaps(heatmapSvgData);
  lineSvgData.data = data.data;
  lineClusterView.drawSvg(lineSvgData);
  corrSvgData.data = corrData;
  correlationView.drawSvg(corrSvgData);
  msPlotData.data = msData.data;
  msplot.appendScatterPlot(msPlotData, msData.nodeIds);
  barSvgData.data = data.event_counts;
  eventView.drawSvg(barSvgData);
}

window.handleColorChange = () => {
  option = document.querySelector('input[name="color"]:checked').value;
  setType(option);
  u.updateMS(getFeature1(), getFeature2(), option, false, 0);
}

window.updateDate = () => {
  if (document.getElementById('date_selection') != dateValue) {
    dateValue = document.querySelector('#date_selection').value
    document.getElementById('gridType').checked = true;
    document.getElementById('lines').checked = true;
    document.getElementById('heatmap').checked = true;
    setGridType(1);
    setOverviewType('heatmap');
    updateView(dateValue);
  }
}

window.updateGrid = () => {
  const isChecked = document.getElementById('gridType').checked;
  setGridType(isChecked ? 1 : 0);
  d3.selectAll('.grid-rect')
      .attr('display', isChecked ? 'block' : 'none');
}

window.handleGridChange = () => {
  option = document.querySelector('input[name="grid"]:checked').value;
  setOverviewType(option);
  if (option == 'lines') {
    // d3.selectAll('.grid-rect')
    //   .attr('fill', 'none');
    d3.selectAll('.lines-group')
      .selectAll('path')
        .attr('stroke-opacity', 1)
  } else {
    d3.selectAll('.lines-group')
      .selectAll('path')
        .attr('stroke-opacity', 0)
  }
}

window.updateChart = () => {
  if (document.getElementById('data-stream-option').checked) {
    refreshIntervalId = setInterval(() => {
      u.updateCharts(heatmapSvgData, barSvgData);
      u.updateMS(getFeature1(), getFeature2(), option, true, 1);
    }, 500);
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
      document.querySelector('#date_selection').value = data.dates[1];
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