'use strict';
const WORKING_HOURS = 1850;  //annual working hours for 1 developer
const SS_MAINT = 38;  //LOC for 1 maint operation w/sorted set index
const SS_EQUALITY = 12;  //LOC for 1 search equality operation w/sorted set index
const SS_RANGE = 14; //LOC for 1 search range operation w/sorted set index
const SS_INTERSECTION = 60;  //LOC for 1 search intersection operation w/sorted set index
const SS_UNION = 36; //LOC for 1 search union operation w/sorted set index

function val(id) {
    return +document.getElementById(id).value;
}

function hide(id) {
    id.innerHTML = '';
}

function devCalc() {
    const costLOC = val('devCost') / val('devLoc'); //cost per LOC
    const timeLOC = val('devLoc') / WORKING_HOURS;  //time per LOC
    return { costLOC, timeLOC };
}

function jsonCalc() {
    const { costLOC, timeLOC } = devCalc();
    const hashLOC = val('nestingLevels') * val('nestingFields') * 2;  //LOC to support nested hashes
    const devCost = costLOC * hashLOC;  //dev costs for nested hashes
    const maintCost = devCost * val('maint') / 100; //assoc maint cost

    const time = (hashLOC / timeLOC).toFixed(0);  //time required to implement nested hashes
    const money = (devCost + maintCost).toFixed(0);
    const results = `Time: ${time} hrs` + '<br>' + `Money: \$${money}`;
    document.getElementById('jsonResults').innerHTML = results;
}

function searchCalc() {
    const { costLOC, timeLOC } = devCalc();
    const indexLOC = val('searchFields');  //LOC required to build index with sorted sets
    const maintLOC = val('maintOps') * SS_MAINT;
    const equalityLOC = val('equalityOps') * SS_EQUALITY;
    const rangeLOC = val('rangeOps') * SS_RANGE;
    const intersectionLOC = val('intersectionOps') * SS_INTERSECTION;
    const unionLOC = val('unionOps') * SS_UNION;
    const sum = indexLOC + maintLOC + equalityLOC + rangeLOC + intersectionLOC + unionLOC;
   
    const devCost = costLOC * sum;
    const maintCost = devCost * val('maint') / 100; //assoc maint cost

    const time = (sum / timeLOC).toFixed(0); //time required to implement index w/sorted sets
    const money = (devCost + maintCost).toFixed(0);
    const results = `Time: ${time} hrs` + '<br>' + `Money: \$${money}`;
    document.getElementById('searchResults').innerHTML = results;
}

window.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.input');
    inputs.forEach(input => {
        input.onchange = () => {
            if (document.getElementById('jsonResults').innerHTML) {
                hide(document.getElementById('jsonResults'));
            }
            if (document.getElementById('searchResults').innerHTML) {
                hide(document.getElementById('searchResults'));
            }
        }
    });
    hide(document.getElementById('jsonResults'));
    hide(document.getElementById('searchResults'));
});
