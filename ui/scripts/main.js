/* MODEL */
import * as m from './model.js';

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

const getDateComponents = (dateValue) => {
  const components = dateValue.split(' ');
  const date = components[0].split('-');
  const day = date[2];
  const year = date[0];
  const month = date[1];
  return [year, month, day];
}

const init = (dateValue, group, target) => {
  const flaskUrl = m.flaskUrl;
  let components = getDateComponents(dateValue);
  let year = components[0];
  let month = components[1];
  let day = components[2];
  let hour = components[3];

  const dataPath = '../data/' + group + '/' + `far_data_${year}-${month}-${day}.json`;
  // fetch(flaskUrl)
  fetch(dataPath)
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Error getting data:', farmGroup);
      }
    })
    .then(data => {
      const svgData = m.svgData();
      svgData.domId = 'ts_view';
      svgData.svg = d3.select(`#${group}_svg`);
      svgData.data = data;
      svgData.target = target;
      svgData.date = dateValue;
      const margin = { 
        top: 40,
        right: 10,
        bottom: 40,
        left: 40
      };
      svgData.svgArea = prepareSvgArea(
          calcContainerWidth(`#${svgData.domId}`),
          calcContainerHeight(`#${svgData.domId}`), margin || {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0
          });
      svgData.margin = margin;

      const uniqueNodes = new Set();
      data.forEach(obj => {
        uniqueNodes.add(obj.nodeId);
      });
      const nodeOptions = document.getElementById("node_options");
      d3.selectAll("#node_options > *").remove();
      uniqueNodes.forEach(nodeId => {
        const btn = document.createElement('input');
        btn.type = 'checkbox';
        btn.id = nodeId;
        btn.name = "nodeId";
        btn.value = nodeId;
        const label = document.createElement("label");
        label.htmlFor = nodeId;
        label.textContent = nodeId;
        nodeOptions.appendChild(btn);
        nodeOptions.appendChild(label);
        nodeOptions.appendChild(document.createElement("br"));
      })
      heatMapView.createHeatmaps(svgData);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

window.updateChart = () => {
  init(document.getElementById('date_selection').value, 'farm', document.getElementById('data_group').value)
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
    init(document.querySelector('#date_selection').value, 'farm', document.getElementById('data_group').value);
});