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

goog.module('eeg_modelling.eeg_viewer.Menus');

const Dispatcher = goog.require('eeg_modelling.eeg_viewer.Dispatcher');
const Store = goog.require('eeg_modelling.eeg_viewer.Store');
const dom = goog.require('goog.dom');
const formatter = goog.require('eeg_modelling.eeg_viewer.formatter');
const {assertInstanceof} = goog.require('goog.asserts');


/**
 * Hides or shows an HTML element.
 * @param {string} elementId HTML Id of the element.
 * @param {boolean} hide Whether to hide or show the element.
 */
const toggleElement = (elementId, hide) => {
  const element = document.querySelector(`#${elementId}`);
  element.classList.toggle('hidden', hide);
};

/**
 * Hides an HTML element.
 */
const hideElement = (elementId) => toggleElement(elementId, true);

/**
 * Shows an HTML element.
 */
const showElement = (elementId) => toggleElement(elementId, false);


/**
 * Hides or show a Material Design Lite spinner.
 * @param {string} elementId HTML Id of the spinner.
 * @param {boolean} hide Whether to hide or show the spinner.
 */
const toggleSpinner = (elementId, hide) => {
  const element = document.querySelector(`#${elementId}`);
  element.classList.toggle('hidden', hide);
  element.classList.toggle('is-active', !hide);
};

/**
 * Shows a spinner.
 */
const showSpinner = (elementId) => toggleSpinner(elementId, false);

/**
 * Hides a spinner.
 */
const hideSpinner = (elementId) => toggleSpinner(elementId, true);


class Menus {

  constructor() {
    const store = Store.getInstance();
    // This listener callback will update the file input parameters in the menu
    // UI.
    store.registerListener([Store.Property.TFEX_SSTABLE_PATH,
        Store.Property.PREDICTION_SSTABLE_PATH, Store.Property.SSTABLE_KEY,
        Store.Property.EDF_PATH, Store.Property.TFEX_FILE_PATH,
        Store.Property.PREDICTION_FILE_PATH],
        'Menu', (store) => this.handleFileParams(store));
    // This listener callback will update file metadata info once a new file is
    // loaded.
    store.registerListener([Store.Property.PATIENT_ID,
        Store.Property.ABS_START],
        'Menu', (store) => this.handleFileMetadata(store));
    // This listener callback will update the UI according to the loading
    // status.
    store.registerListener(
        [Store.Property.LOADING_STATUS], 'Menu',
        (store) => this.handleLoadingStatus(store));

    this.fileMenuModalId = 'file-menu-modal';
    this.loadingSpinnerId = 'loading-spinner';
    this.reloadingSpinnerId = 'reloading-spinner';
    this.submitButtonId = 'menu-loading-button';
  }

  /**
   * Select a dropdown element.
   * @param {string} id HTML ID for the dropdown value location.
   * @param {string} value Value to put in the element.
   * @param {string} eventValue Value to update the store with.
   */
  selectDropdown(id, value, eventValue) {
    const element = document.querySelector(`#${id} > div`);
    dom.setTextContent(element, value);
    document.querySelectorAll('.file-menu').forEach((menu) => {
      if (menu.id == eventValue) {
        menu.classList.remove('hidden');
      } else {
        menu.classList.add('hidden');
      }
    });
  }

  /**
   * Returns the value of an HTML Input element.
   * @param {string} id The HTML id of the element.
   * @returns {!HTMLInputElement} The input element.
   */
  getInputElement(id) {
    return assertInstanceof(document.querySelector(`input#${id}`),
        HTMLInputElement);
  }

  /**
   * Collects the dashboard menu data in QueryData format.
   * @returns {!Object} File input and feature values.
   */
  getMenusData() {
    return {
      tfExSSTablePath: this.getInputElement('input-tfex-sstable').value,
      predictionSSTablePath:
          this.getInputElement('input-prediction-sstable').value,
      sstableKey: this.getInputElement('input-key').value,
      edfPath: this.getInputElement('input-edf').value,
      tfExFilePath: this.getInputElement('input-tfex-path').value,
      predictionFilePath: this.getInputElement('input-prediction-path').value,
    };
  }

  /**
   * Toggles the visibility of the loaded file metadata.
   */
  toggleFileInfo() {
    document.querySelector('#file-info').classList.toggle('hidden');
  }

  /**
   * Initialize file metadata in the annotations menu.
   * @param {!Store.StoreData} store Store object with chunk data.
   */
  handleFileMetadata(store) {
    const patientId = store.patientId;
    dom.setTextContent(document.querySelector('#patient-id > div'),
        patientId == null ? '' : patientId);
    if (store.absStart != null) {
      const startTime = formatter.formatDateAndTime(store.absStart);
      dom.setTextContent(document.querySelector('#start-time > div'), startTime);
    }
  }

  /**
   * Update the value of an InputElement with its corresponding value from the
   * store.
   * @param {!Store.StoreData} store A Store object.
   * @param {string} storeKey A Store key to retrieve value from the store.
   * @param {string} inputId Id of the HTMLInputElement to update.
   */
  updateInputWithStore(store, storeKey, inputId) {
    const inputElement = this.getInputElement(inputId);
    const storeValue = store[storeKey];
    if (storeKey != null && inputElement.value != storeValue) {
      inputElement.value = storeValue;
    }
  }

  /**
   * Sets SSTable path and/or TF Example key if they are given along with file
   * metadata including patient ID and file location and time.
   * @param {!Store.StoreData} store A Store object containing the chunk data.
   */
  handleFileParams(store) {
    this.updateInputWithStore(store, 'tfExSSTablePath', 'input-tfex-sstable');
    this.updateInputWithStore(store, 'predictionSSTablePath', 'input-prediction-sstable');
    this.updateInputWithStore(store, 'sstableKey', 'input-key');
    this.updateInputWithStore(store, 'edfPath', 'input-edf');
    this.updateInputWithStore(store, 'tfExFilePath', 'input-tfex-path');
    this.updateInputWithStore(store, 'predictionFilePath', 'input-prediction-path');
  }

  /**
   * Returns shorthand value given a feature in index format.
   * @param {!Object<string, string>} indexShorthandDict Mapping of indices to
   * their shorthand values.
   * @param {string} feature Feature in index format.
   * @returns {string} Feature in shorthand format.
   */
  getShorthandFromIndex(indexShorthandDict, feature) {
    const shorthandValues = [];
    feature.split('-').forEach((index) => {
      shorthandValues.push(indexShorthandDict[index]);
    });
    return shorthandValues.join('-');
  }

  /**
   * Handle menu visibility toggle.
   */
  handleMenuToggle() {
    const fileMenu = document.querySelector('#file-menu-modal');
    fileMenu.classList.toggle('hidden');
  }

  /**
   * Loads the file with the parameters specified in the file menu.
   */
  loadFile() {
    Dispatcher.getInstance().sendAction({
      actionType: Dispatcher.ActionType.MENU_FILE_LOAD,
      data: this.getMenusData(),
    });
  }

  /**
   * Handle a change in the LOADING_STATUS property, and updates the UI
   * accordingly.
   * @param {!Store.StoreData} store A Store object containing the loading
   *     status.
   */
  handleLoadingStatus(store) {
    switch (store.loadingStatus) {
      case Store.LoadingStatus.NO_DATA:
        hideSpinner(this.loadingSpinnerId);
        showElement(this.submitButtonId);
        showElement(this.fileMenuModalId);
        break;
      case Store.LoadingStatus.LOADING:
        showSpinner(this.loadingSpinnerId);
        hideElement(this.submitButtonId);
        break;
      case Store.LoadingStatus.LOADED:
        const displayFilePath =
            store.sstableKey || store.edfPath || store.tfExFilePath || '';
        dom.setTextContent(
            document.querySelector('#display-file-path'), displayFilePath);

        hideSpinner(this.loadingSpinnerId);
        showElement(this.submitButtonId);
        hideElement(this.fileMenuModalId);
        break;
      case Store.LoadingStatus.RELOADING:
        showSpinner(this.reloadingSpinnerId);
        break;
      case Store.LoadingStatus.RELOADED:
        hideSpinner(this.reloadingSpinnerId);
        break;
    }
  }
}

goog.addSingletonGetter(Menus);

exports = Menus;
