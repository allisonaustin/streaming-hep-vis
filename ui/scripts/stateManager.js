let f1State = null;
let f2State = null;
let f1Value = null;
let f2Value = null;
let type = null;
let gridType = null;
let overviewType = null;

export function setState(x, y) {
    f1State = x;
    f2State = y;
}

export function setValue(x, y) {
    f1Value = x;
    f2Value = y;
}

export function setType(x) {
    type = x;
}

export function setGridType(x) {
    gridType = x;
}

export function setOverviewType(x) {
    overviewType = x;
}

export function getState1() {
    return f1State;
}

export function getState2() {
    return f2State;
}

export function getFeature1() {
    return f1Value;
}

export function getFeature2() {
    return f2Value;
}

export function getType() {
    return type;
}

export function getGridType() {
    return gridType;
}

export function getOverviewType() {
    return overviewType;
}