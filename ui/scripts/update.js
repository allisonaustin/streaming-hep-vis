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

export const updateMS = (msGroup, colorGroup, colorType='var', newData=false) => {
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
      let colordata = []
      if (colorType == 'var') {
        colordata = data.variance;
      } else if (colorType == 'min') {
        colordata = data.min;
      } else {
        colordata = data.max;
      }
      msplot.updateScatterPlot(data.data, [msGroup], colordata);
    });
}


export const updatePCA = (group) => {
  const flaskUrl = m.flaskUrl + `/getFPCA/${group}`;
  fetch(flaskUrl)
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