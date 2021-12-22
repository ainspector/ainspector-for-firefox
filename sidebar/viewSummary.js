/* viewSummary.js */

const getMessage  = browser.i18n.getMessage;
const sendMessage = browser.runtime.sendMessage;

import { ruleCategoryIds, guidelineIds, getRuleCategoryLabelId, getGuidelineLabelId } from './constants.js';

// The summary view for AInspector WCAG

export default class ViewSummary {
  constructor (id, handleRowActivation) {

    this.summaryNode   = document.getElementById(id);

    this.resultSummary = document.createElement('result-summary');
    this.summaryNode.appendChild(this.resultSummary);

    this.resultTablist = document.createElement('result-tablist');
    this.summaryNode.appendChild(this.resultTablist);

    this.rcResultGrid = document.createElement('result-grid');
    this.rcResultGrid.addClassNameToTable('summary');
    this.resultTablist.tabpanel1.appendChild(this.rcResultGrid);
    this.rcResultGrid.setRowActivationEventHandler(handleRowActivation);

    this.glResultGrid = document.createElement('result-grid');
    this.glResultGrid.addClassNameToTable('summary');
    this.resultTablist.tabpanel2.appendChild(this.glResultGrid);
    this.glResultGrid.setRowActivationEventHandler(handleRowActivation);

    this.initGrids();

  }

  toCSV () {
    let csv = '';
    if (!this.disabled) {
      csv += this.rcResultGrid.toCSV();
      csv += this.glResultGrid.toCSV();
    }
    return csv
  }

  set disabled (value) {
    console.log('[ViewSummary][set][disabled]: ' + value);
    this.rcResultGrid.disabled = value;
    this.glResultGrid.disabled = value;
  }

  get disabled () {
    let value = this.rcResultGrid.disabled && this.glResultGrid.disabled;
    console.log('[ViewSummary][get][disabled]: ' + value);
    return value;
  }

  handleRowClick (event) {
    let tgt = event.currentTarget;
    let info = {};
    info.id = 'eval';
    info.view = 'group';
    info.groupId = parseInt(tgt.id.substring(2));
    info.groupType = tgt.id.substring(0,2);

    browser.runtime.sendMessage(info);
  }

  initGrids () {
    let i, id, label, row;

    let handleRowClick = this.handleRowClick.bind(this);

    this.resultTablist.tabLabel1 = getMessage("ruleCategoriesLabel");

    this.rcResultGrid.addHeaderCell(getMessage('ruleCategoriesLabel'), 'group text');
    this.rcResultGrid.addHeaderCell(getMessage('violationsAbbrev'),    'summ num', getMessage('violationsLabel'));
    this.rcResultGrid.addHeaderCell(getMessage('warningsAbbrev'),      'summ num', getMessage('warningsLabel'));
    this.rcResultGrid.addHeaderCell(getMessage('manualChecksAbbrev'),  'summ num', getMessage('manualChecksLabel'));
    this.rcResultGrid.addHeaderCell(getMessage('passedAbbrev'),        'summ num', getMessage('passedLabel'));

    for (i = 0; i < ruleCategoryIds.length; i += 1 ) {
      id = ruleCategoryIds[i];
      label = getMessage(getRuleCategoryLabelId(id));
      // The row ID identifies the row as a rule category rule group and
      // includes which category using its numerical constant
      row = this.rcResultGrid.addRow('rc' + id);
      this.rcResultGrid.addDataCell(row, label, '', 'text');
      this.rcResultGrid.addDataCell(row, '', '-', 'summ num');
      this.rcResultGrid.addDataCell(row, '', '-', 'summ num');
      this.rcResultGrid.addDataCell(row, '', '-', 'summ num');
      this.rcResultGrid.addDataCell(row, '', '-', 'summ num');
    }

    this.resultTablist.tabLabel2 = getMessage("guidelinesLabel");
    this.glResultGrid.addHeaderCell(getMessage('guidelinesLabel'),     'group text');
    this.glResultGrid.addHeaderCell(getMessage('violationsAbbrev'),   'summ num', getMessage('violationsLabel'));
    this.glResultGrid.addHeaderCell(getMessage('warningsAbbrev'),     'summ num', getMessage('warningsLabel'));
    this.glResultGrid.addHeaderCell(getMessage('manualChecksAbbrev'), 'summ num', getMessage('manualChecksLabel'));
    this.glResultGrid.addHeaderCell(getMessage('passedAbbrev'),       'summ num', getMessage('passedLabel'));

    for (i = 0; i < guidelineIds.length; i += 1 ) {
      id = guidelineIds[i];
      label = getMessage(getGuidelineLabelId(id));
      // The row ID identifies the row as a guideline rule group and
      // includes which guideline using its numerical constant
      row = this.glResultGrid.addRow('gl' + id);
      this.glResultGrid.addDataCell(row, label, '', 'text');
      this.glResultGrid.addDataCell(row, '', '-', 'summ num');
      this.glResultGrid.addDataCell(row, '', '-', 'summ num');
      this.glResultGrid.addDataCell(row, '', '-', 'summ num');
      this.glResultGrid.addDataCell(row, '', '-', 'summ num');
    }
  }

  getNameForNumber(count, idOne, idNotOne) {
    if (count === 1) {
      return count + ' ' + getMessage(idOne);
    }
    return count + ' ' + getMessage(idNotOne);
  }

  update (infoSummary) {
    let i, gResult, row, rowAccName, cell, celAcclName;

    this.resultSummary.violations   = infoSummary.violations;
    this.resultSummary.warnings     = infoSummary.warnings;
    this.resultSummary.manualChecks = infoSummary.manual_checks;
    this.resultSummary.passed       = infoSummary.passed;

    for (i = 0; i < infoSummary.rcResults.length; i += 1) {
      gResult = infoSummary.rcResults[i];
      row = this.rcResultGrid.getRowById('rc' + gResult.id);

      cell = this.rcResultGrid.getCellByPosition(row, 1);
      rowAccName = cell.textContent;
      console.log('[rowAccName]: ' + rowAccName)

      celAcclName = this.getNameForNumber(gResult.violations, 'violationLabel', 'violationsLabel')
      rowAccName += ', ' + celAcclName;
      this.rcResultGrid.updateDataCell(row, 2, gResult.violations, celAcclName);

      celAcclName = this.getNameForNumber(gResult.warnings, 'warningLabel', 'warningsLabel');
      rowAccName += ', ' + celAcclName;
      this.rcResultGrid.updateDataCell(row, 3, gResult.warnings, celAcclName);

      celAcclName = this.getNameForNumber(gResult.manual_checks, 'manualCheckLabel', 'manualChecksLabel')
      rowAccName += ', ' + celAcclName;
      this.rcResultGrid.updateDataCell(row, 4, gResult.manual_checks, celAcclName);

      celAcclName = ', ' + gResult.passed + ' ' + getMessage('passedLabel');
      rowAccName += ', ' + celAcclName;
      this.rcResultGrid.updateDataCell(row, 5, gResult.passed, celAcclName);

      // Add accessible name describing the row content
      row.setAttribute('aria-label', rowAccName);
    }

    for (i = 0; i < infoSummary.glResults.length; i += 1) {
      gResult = infoSummary.glResults[i];
      row = this.glResultGrid.getRowById('gl' + gResult.id);

      cell = this.glResultGrid.getCellByPosition(row, 1)
      rowAccName = cell.textContent;

      celAcclName = this.getNameForNumber(gResult.violations, 'violationLabel', 'violationsLabel')
      rowAccName += ', ' + celAcclName;
      this.glResultGrid.updateDataCell(row, 2, gResult.violations, celAcclName);

      celAcclName = this.getNameForNumber(gResult.warnings, 'warningLabel', 'warningsLabel')
      rowAccName += ', ' + celAcclName;
      this.glResultGrid.updateDataCell(row, 3, gResult.warnings, celAcclName);

      celAcclName = this.getNameForNumber(gResult.manual_checks, 'manualCheckLabel', 'manualChecksLabel')
      rowAccName += ', ' + celAcclName;
      this.glResultGrid.updateDataCell(row, 4, gResult.manual_checks, celAcclName);

      celAcclName = ', ' + gResult.passed + ' ' + getMessage('passedLabel');
      rowAccName += ', ' + celAcclName;
      this.glResultGrid.updateDataCell(row, 5, gResult.passed, celAcclName);

      // Add accessible name describing the row content
      row.setAttribute('aria-label', rowAccName);
    }
  }

  resize () {

  }

  clear () {
    this.resultSummary.clear();

    ruleCategoryIds.forEach( (id) => {
      this.rcResultGrid.clearRow('rc' + id)
    });

    guidelineIds.forEach( (id) => {
      this.glResultGrid.clearRow('gl' + id);
    });

  }
}
