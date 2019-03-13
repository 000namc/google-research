// Copyright 2019 The Google Research Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.module('eeg_modelling.eeg_viewer.PredictionsChart.tests');
goog.setTestOnly();

const Dispatcher = goog.require('eeg_modelling.eeg_viewer.Dispatcher');
const MockControl = goog.require('goog.testing.MockControl');
const PredictionsChart = goog.require('eeg_modelling.eeg_viewer.PredictionsChart');
const dom = goog.require('goog.dom');
const testSuite = goog.require('goog.testing.testSuite');

let mockControl;

let predictionsChart;
let storeData;
let predictionsCanvas;
let predictionsContainer;


testSuite({

  setUp() {
    mockControl = new MockControl();

    predictionsChart = PredictionsChart.getInstance();

    storeData = {
      absStart: 2,
      chunkStart: 4,
      chunkDuration: 3,
      chunkGraphData: {
        cols: [0, 1, 1, 2, 3, 5],
      },
      numSecs: 10,
      predictionMode: 'test',
      samplingFreq: 1,
      seriesHeight: 42,
    };

    const parentContainer = document.createElement('div');
    parentContainer.id = predictionsChart.parentId;
    predictionsContainer = document.createElement('div');
    predictionsContainer.id = predictionsChart.containerId;
    predictionsContainer.style.position = 'absolute';
    predictionsContainer.style.top = '5px';
    predictionsContainer.style.left = '11px';
    parentContainer.appendChild(predictionsContainer);
    predictionsCanvas = document.createElement('canvas');
    predictionsCanvas.id = predictionsChart.overlayId;
    parentContainer.appendChild(predictionsCanvas);
    document.body.appendChild(parentContainer);
  },

  testGetHTickValues() {
    const mockNumSecs = mockControl.createFunctionMock('getNumSecs');
    mockNumSecs(storeData).$returns(10);
    const mockStart = mockControl.createFunctionMock('getStart');
    mockStart(storeData).$returns(0).$times(10);

    predictionsChart.modes['test'] = {
      'getNumSecs': (store) => mockNumSecs(store),
      'getStart': (store) => mockStart(store),
    };

    mockControl.$replayAll();

    assertArrayEquals([0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        predictionsChart.getHTickValues(storeData));

    mockControl.$verifyAll();
  },

  testUpdateChartOptions() {
    const mockGetParent = mockControl.createMethodMock(predictionsChart, 'getParent');
    mockGetParent().$returns({clientHeight: 500});

    const mockNumSecs = mockControl.createFunctionMock('getNumSecs');
    mockNumSecs(storeData).$returns(10).$times(2);
    const mockStart = mockControl.createFunctionMock('getStart');
    mockStart(storeData).$returns(0).$times(12);

    predictionsChart.modes['test'] = {
      'getNumSecs': (store) => mockNumSecs(store),
      'getStart': (store) => mockStart(store),
      'getVTickDisplayValues': () => [],
      'getVAxisMin': () => -21,
      'getVAxisMax': () => 189,
    };
    predictionsChart.height['test'] = 0.2;

    const mockSet = mockControl.createMethodMock(predictionsChart, 'setOption');
    mockSet('hAxis.viewWindow', {min: 0, max: 10}).$once();
    mockSet('vAxis.viewWindow', {min: -21, max: 189}).$once();
    mockSet('colors',
        ['#fff', '#fff', '#fff', '#fff', '#fff', '#fff']).$once();
    mockSet('height', 60).$once();
    mockSet('chartArea.height', '16%').$once();
    mockSet('hAxis.ticks',
        [{v: 0, f: '00:00:02'}, {v: 1, f: '00:00:03'},
         {v: 2, f: '00:00:04'}, {v: 3, f: '00:00:05'},
         {v: 4, f: '00:00:06'}, {v: 5, f: '00:00:07'},
         {v: 6, f: '00:00:08'}, {v: 7, f: '00:00:09'},
         {v: 8, f: '00:00:10'}, {v: 9, f: '00:00:11'}]).$once();
    mockSet('vAxis.ticks', []).$once();

    mockControl.$replayAll();

    predictionsChart.updateChartOptions(storeData);

    mockControl.$verifyAll();
  },

  testCreateOverlay_NoOverlay() {
    predictionsChart.modes['test'] = {
      getNumSecs: (store) => store.numSecs,
      getStart: () => 0,
      drawOverlay: null,
    };

    const mockSizeAndPosition = mockControl.createMethodMock(predictionsChart,
        'sizeAndPositionOverlay');
    mockSizeAndPosition().$once();
    const mockHighlight = mockControl.createMethodMock(predictionsChart,
        'highlightViewport');
    mockHighlight(storeData).$once();

    mockControl.$replayAll();

    predictionsChart.createOverlay(storeData);

    mockControl.$verifyAll();
  },

  testCreateOverlay_Overlay() {
    storeData.chunkScores = [{'fake chunk': {'real': 1, 'predicted': 0.34}}];
    storeData.showPredictions = true;
    const mockSizeAndPosition = mockControl.createMethodMock(predictionsChart,
        'sizeAndPositionOverlay');
    mockSizeAndPosition().$once();
    const mockDraw = mockControl.createMethodMock(predictionsChart,
        'drawChunkScores');
    mockDraw(storeData).$once();
    const mockHighlight = mockControl.createMethodMock(predictionsChart,
        'highlightViewport');
    mockHighlight(storeData).$once();

    predictionsChart.modes['test'] = {
      getNumSecs: (store) => store.numSecs,
      getStart: () => 0,
      drawOverlay: goog.bind(mockDraw, predictionsChart),
    };

    mockControl.$replayAll();

    predictionsChart.createOverlay(storeData);

    mockControl.$verifyAll();
  },

  testChartListeners() {
    const mockCli = mockControl.createMethodMock(predictionsChart,
        'getChartLayoutInterface');
    mockCli().$returns({
      getHAxisValue: (x) => x,
      getChartAreaBoundingBox: () => ({top: 1, left: 3, height: 3, width: 5}),
    });

    const mockDispatcher = mockControl.createStrictMock(Dispatcher);
    mockDispatcher.sendAction({
      actionType: Dispatcher.ActionType.NAV_BAR_CHUNK_REQUEST,
      data: {
        time: 6.4,
      }
    }).$once();
    const mockGetInstance = mockControl.createMethodMock(Dispatcher,
        'getInstance');
    mockGetInstance().$returns(mockDispatcher);

    mockControl.$replayAll();

    const chartListener = predictionsChart.chartListeners[0];
    chartListener.handler({offsetX: 3.4});

    mockControl.$verifyAll();
  },

  tearDown() {
    dom.removeChildren(dom.getDocument().body);
    mockControl.$tearDown();
  },
});
