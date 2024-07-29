import * as m from './model.js';
import * as heatMapView from './time-series.js'
import * as cluster from './line-cluster.js'
import * as msplot from './msplot.d3.js'
import * as eventView from './area-chart.js'

let hmData;
let msData;
let eventData;

export const updateCharts = async (heatmapSvg, barSvg) => {
  const filename = `far_data_${heatmapSvg.date}.csv`
  const dir = 'farm';
  const flaskUrl = m.flaskUrl + `/getData/${dir}/${filename}/1`;
  if (document.getElementById('data-stream-option').checked) {
    await fetch(flaskUrl)
      .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            throw new Error('Error getting data.');
          }
        })
        .then(data => {
          hmData = heatmapSvg.data.concat(data.data);
          barSvg.data = { ...barSvg.data, ...data.null_readings };
          heatmapSvg.data = hmData;
          heatMapView.updateHeatmaps(heatmapSvg, data.data);
          eventView.updateChart(barSvg);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    } 
} 

export const updateCorr = (group1, group2) => {
  cluster.updatePlot(group1, group2);
}

export const updateMS = async (msGroup, colorGroup, colorType='var', newData=false, inc=0) => {
  const flaskUrl = m.flaskUrl + `/getMagnitudeShape/${msGroup}/${colorGroup}/${inc}/0`;
  let colordata = [];
  if (newData || msData == null) {
    await fetch(flaskUrl)
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Error getting data.');
      }
    })
    .then(data => {
      msData = data;
      if (colorType == 'var') {
        colordata = data['variance'];
      } else if (colorType == 'min') {
        colordata = data['min'];
      } else {
        colordata = data['max'];
      }
    });
  } else {
    if (colorType === 'var') {
      colordata = msData['variance']; 
    } else if (colorType === 'min') {
        colordata = msData['min']; 
    } else {
        colordata = msData['max'];
    }
  }
  msplot.updateScatterPlot(msData.data, [msGroup], colordata);
}


export const updatePCA = async (group) => {
  const flaskUrl = m.flaskUrl + `/getFPCA/${group}`;
  await fetch(flaskUrl)
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Error getting data.');
      }
    })
    .then(data => {
      heatMapView.appendFPCA()
    });
}