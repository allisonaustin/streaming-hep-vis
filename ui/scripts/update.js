import * as m from './model.js';
import * as heatMapView from './heatmap.js'
import * as cluster from './line-cluster.js'
import * as msplot from './msplot.d3.js'

let hmData;

export const updateCharts = (svg) => {
  const filename = `far_data_${svg.date}.csv`
  const flaskUrl = m.flaskUrl + `/getData/${filename}/1`;
  if (document.getElementById('data-stream-option').checked) {
    fetch(flaskUrl)
      .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            throw new Error('Error getting data.');
          }
        })
        .then(data => {
          hmData = svg.data.concat(data);
          svg.data = hmData;
          heatMapView.updateHeatmaps(svg, data);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    } 
} 

export const updateCorr = (group1, group2) => {
  cluster.updatePlot(group1, group2);
}

export const updateMS = (msGroup, colorGroup) => {
  const flaskUrl = m.flaskUrl + `/getMagnitudeShapeFDA/${msGroup}`;
  fetch(flaskUrl)
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Error getting data.');
      }
    })
    .then(data => {
      msplot.updateScatterPlot(data.data, [msGroup], data.variance);
    });
}