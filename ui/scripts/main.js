import axios from 'axios';

/* MODEL */
import * as m from './model.js';
import * as g from './groups.js';
import { setValue, getFeature1, getFeature2, setState, setType, setGridType, setOverviewType } from './stateManager.js';

/* UPDATE */
import * as u from './update.js';

/* VIEWS */
import * as lineClusterView from './line-cluster.js';
import * as timeSeriesView from './time-series.js';
import * as msplot from './msplot.d3.js';
import * as correlationView from './corr-matrix.js';
import * as eventView from './area-chart.js';

import {
  calcContainerWidth,
  calcContainerHeight,
  prepareSvgArea
} from './d3_utils.js';

const timeSeriesSvgData = m.svgData();
const lineSvgData = m.svgData();
const msPlotData = m.svgData();
const corrSvgData = m.svgData();
const barSvgData = m.svgData();
let xGroup = 'cpu_idle';
let yGroup = 'cpu_nice';
let groups = [];
let refreshIntervalId;
let dateValue;
let option;

async function getData(dir, filename, inc) {
  const flaskUrl = m.flaskUrl + `/getData/${dir}/${filename}/${inc}`;
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
  const flaskUrl = m.flaskUrl + `/getMagnitudeShape/${xGroup}/${yGroup}/${inc}/${prog}`;
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

async function getFPCData() {
  const flaskUrl = m.flaskUrl + `/getFPCA/3/0`;
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

async function initTimeSeries(data, fpcData, dateValue, type) {
  timeSeriesSvgData.domId = 'farm_view';
  timeSeriesSvgData.svg = d3.select(`#${type}_svg`);
  timeSeriesSvgData.data = data;
  timeSeriesSvgData.date = dateValue;
  timeSeriesSvgData.selectedX = xGroup;
  timeSeriesSvgData.selectedY = yGroup;
  timeSeriesSvgData.colordata = fpcData;
  const margin = { top: 15, right: 10, bottom: 100, left: 10 };
  timeSeriesSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${timeSeriesSvgData.domId}`),
    calcContainerHeight(`#${timeSeriesSvgData.domId}`),
    margin || { top: 0, right: 0, bottom: 0, left: 0 }
  );
  timeSeriesSvgData.margin = margin;
  timeSeriesView.createCharts(timeSeriesSvgData);
}

async function initCorrelationView(data) {
  corrSvgData.domId = 'corr_view';
  corrSvgData.svg = d3.select(`#corr_map`);
  corrSvgData.data = data;
  corrSvgData.date = dateValue;
  corrSvgData.selectedX = xGroup;
  corrSvgData.selectedY = yGroup;
  const margin = { top: 60, right: 60, bottom: 60, left: 70 }
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

async function initEventView(manager_data, farm_data) {
  barSvgData.domId = 'ts_view';
  barSvgData.svg = d3.select(`#bar_svg`);
  barSvgData.data = manager_data;
  barSvgData.colordata = farm_data;
  barSvgData.date = dateValue;
  const margin = { top: 35, right: 10, bottom: 40, left: 40 }
  barSvgData.svgArea = prepareSvgArea(
    calcContainerWidth(`#${barSvgData.domId}`),
    calcContainerHeight(`#${barSvgData.domId}`),
    margin || { top: 0, right: 0, bottom: 0, left: 0 }
  );
  barSvgData.margin = margin;
  eventView.drawSvg(barSvgData);
}

async function initMsPlotView(response, fpcData) {
  msPlotData.domId = 'fc_view';
  msPlotData.svg = d3.select(`#msplot-svg`);
  msPlotData.data = response.data;
  msPlotData.group = xGroup;
  msPlotData.colordata = response.variance;
  msPlotData.clusterdata = fpcData;
  msPlotData.selectedX = xGroup;
  msPlotData.selectedY = yGroup;
  const margin = {
    top: 30,
    right: 10,
    bottom: 40,
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
  const farm_file = `far_data_${dateValue}.csv`;
  const manager_file = `manager_data_${dateValue}.csv`;
  const farm_data = await getData('farm', farm_file, 0);
  const manager_data = await getData('manager', manager_file, 0);
  const msData = await getMsData(xGroup, yGroup, 0, 0);
  const corrData = await getCorrelationData();
  const fpcData = await getFPCData();
  setGridType(0);
  setOverviewType('lines');
  setType('cluster')
  // const uniqueNodes = new Set();
  // data.forEach(obj => {
  //   uniqueNodes.add(obj.nodeId);
  // });
  initTimeSeries(farm_data.data, fpcData, dateValue, type)
  d3.selectAll('.grid-rect')
    .attr('display', 'none');
  initClusterView(farm_data.data, dateValue)
  initCorrelationView(corrData)
  initMsPlotView(msData, fpcData)
  initEventView(manager_data.data, farm_data.data)
}

async function updateView(date) {
  const farm_file = `far_data_${date}.csv`;
  const manager_file = `manager_data_${date}.csv`;
  const farm_data = await getData('farm', farm_file, 0);
  const manager_data = await getData('manager', manager_file, 0);
  const msData = await getMsData(xGroup, yGroup, 0, 0);
  const corrData = await getCorrelationData();
  const fpcData = await getFPCData();
  timeSeriesSvgData.data = farm_data.data;
  timeSeriesSvgData.colordata = fpcData;
  timeSeriesView.createCharts(timeSeriesSvgData);
  lineSvgData.data = farm_data.data;
  lineClusterView.drawSvg(lineSvgData);
  corrSvgData.data = corrData;
  correlationView.drawSvg(corrSvgData);
  msPlotData.data = msData.data;
  msplot.appendScatterPlot(msPlotData, msData.nodeIds);
  barSvgData.data = manager_data.data;
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
    document.getElementById('heatmap').checked = false;
    setGridType(0);
    setOverviewType('lines');
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
    d3.selectAll('.grid-rect')
      .attr('display', 'none');
    d3.selectAll('.lines-group')
      .selectAll('path')
      .attr('stroke-opacity', 1)
  } else {
    d3.selectAll('.grid-rect')
      .attr('display', 'block');
    d3.selectAll('.lines-group')
      .selectAll('path')
      .attr('stroke-opacity', 0)
  }
}

window.updateChart = () => {
  if (document.getElementById('data-stream-option').checked) {
    refreshIntervalId = setInterval(() => {
      u.updateCharts(timeSeriesSvgData, barSvgData);
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

// document.getElementById('feature-1').addEventListener('click', () => {
//   setState(1, 0);
// });

// document.getElementById('feature-2').addEventListener('click', () => {
//   setState(0, 1);
// });

document.getElementById('yGroupLabel').innerText = yGroup;