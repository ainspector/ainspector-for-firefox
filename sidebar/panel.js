/*
*   panel.js
*/

import { getOptions } from '../storage.js';

import ViewSummary     from './viewSummary.js';
import ViewRuleGroup   from './viewRuleGroup.js';
import ViewRuleResult  from './viewRuleResult.js';

import ResultSummary   from './resultSummary.js';
import ResultTablist   from './resultTablist.js';
import ResultGrid      from './resultGrid.js';
import ResultRuleInfo  from './resultRuleInfo.js';

import HighlightSelect from './highlightSelect.js';
import ViewsMenuButton from './viewsMenuButton.js';
import RerunEvaluationButton from './rerunEvaluationButton.js';

customElements.define('result-summary',    ResultSummary);
customElements.define('result-tablist',    ResultTablist);
customElements.define('result-grid',       ResultGrid);
customElements.define('result-rule-info',  ResultRuleInfo);
customElements.define('highlight-select',  HighlightSelect);
customElements.define('views-menu-button', ViewsMenuButton);
customElements.define('rerun-evaluation-button', RerunEvaluationButton);

var myWindowId;
var logInfo = true;

var vSummary;
var vRuleGroup;
var vRuleResult;
var views;

var sidebarView      = 'summary';  // other options 'group' or 'rule'
var sidebarGroupType = 'rc';  // options 'rc' or 'gl'
var sidebarGroupId   = 1;  // numberical value
var sidebarRuleId    = '';
var sidebarElementPosition = 0;
var sidebarHighlightOnly = false;

// Get message strings from locale-specific messages.json file
const getMessage = browser.i18n.getMessage;

const emptyContent         = getMessage("emptyContent");
const tabIsLoading         = getMessage("tabIsLoading");
const protocolNotSupported = getMessage("protocolNotSupported");

function addLabelsAndHelpContent () {
  // Header titles and labels

  document.getElementById('view-title').textContent =
    getMessage("viewTitleSummaryLabel");
  document.getElementById('back-button').textContent =
    getMessage("backButtonLabel");

  // Footer titles and labels

  document.querySelector('#info-location .label').textContent =
    getMessage("infoLocationLabel");
  document.querySelector('#info-title .label').textContent =
    getMessage("infoTitleLabel");
  document.querySelector('#info-ruleset .label').textContent =
    getMessage("infoRulesetLabel");

  document.getElementById('preferences-button').textContent =
    getMessage("preferencesButtonLabel");

}

function callbackSummaryRowActivation (event) {
  const tgt = event.currentTarget;

  sidebarView      = 'rule-group';
  sidebarGroupType = tgt.id.substring(0,2);
  sidebarGroupId   = parseInt(tgt.id.substring(2));
  runContentScripts('handleSummaryRowClick');
}

function callbackRuleGroupRowActivation (event) {
  const tgt = event.currentTarget;

  sidebarView   = 'rule-result';
  sidebarRuleId = tgt.id;
  runContentScripts('callbackSummaryRowActivation');
}

function callbackViewsMenuActivation(id) {
  if (id && id.length) {
    if (id === 'summary') {
      sidebarView = 'summary';
    }

    if (id === 'all-rules') {
      sidebarView = 'rule-group';
      if (sidebarGroupType === 'rc') {
        sidebarGroupId = 0x0FFF;  // All rules id for rule categories
      } else {
        sidebarGroupId = 0x01FFF0; // All rules id for guidelines
      }
    }

    if (id.indexOf('rc') >= 0 || id.indexOf('gl') >= 0) {
      const groupType = id.substring(0, 2);
      const groupId = parseInt(id.substring(2));
      sidebarView = 'rule-group';
      sidebarGroupType = groupType;
      sidebarGroupId   = groupId;
    }
    runContentScripts('callbackViewsMenuActivation');
  }
}

function callbackRerunEvaluation() {
  runContentScripts('callbackRerunEvaluation');
}

function callbackUpdateHighlight(position) {
  sidebarHighlightOnly = true;
  sidebarElementPosition = position;

  runContentScripts('callbackRerunEvaluation');
}

function initControls () {

  const backBtn = document.getElementById('back-button');
  backBtn.addEventListener('click', handleBackButton);

  const viewsMenuButton = document.querySelector('views-menu-button');
  viewsMenuButton.setActivationCallback(callbackViewsMenuActivation);

  const preferencesButton = document.getElementById('preferences-button');
  preferencesButton.addEventListener('click', onPreferencesClick);

  const rerunEvaluationButton = document.querySelector('rerun-evaluation-button');
  rerunEvaluationButton.setActivationCallback(callbackRerunEvaluation);

  vSummary    = new ViewSummary('summary', callbackSummaryRowActivation);
  vRuleGroup  = new ViewRuleGroup('rule-group', callbackRuleGroupRowActivation);
  vRuleResult = new ViewRuleResult('rule-result', callbackUpdateHighlight);

  views = document.querySelectorAll('main .view');
  showView(sidebarView);
}

function handleBackButton() {

  switch (sidebarView) {
    case 'rule-group':
      sidebarView = 'summary';
      break;

    case 'rule-result':
      sidebarView = 'rule-group';
      break;

    default:
      break;
  }
  runContentScripts('handleBackButton');
}


/*
*   When the sidebar loads, store the ID of the current window and update
*   the sidebar content.
*/
browser.windows.getCurrent({ populate: true }).then( (windowInfo) => {
  myWindowId = windowInfo.id;
  addLabelsAndHelpContent();
  initControls();
  runContentScripts('onload');
});

/*
*   Generic error handler
*/
function onError (error) {
  console.log(`Error: ${error}`);
}

//--------------------------------------------------------------
//  Functions that handle menu, preferences and re-run evaluation
//  button actions
//--------------------------------------------------------------

function onPreferencesClick (event) {
   chrome.runtime.openOptionsPage();
}

//-----------------------------------------------
//  Functions that handle tab and window events
//-----------------------------------------------

/*
*   Handle tabs.onUpdated event when status is 'complete'
*/
let timeoutID;
function handleTabUpdated (tabId, changeInfo, tab) {
  // Skip content update when new page is loaded in background tab
  if (!tab.active) return;

  clearTimeout(timeoutID);
  if (changeInfo.status === "complete") {
    runContentScripts('handleTabUpdated');
  }
  else {
    timeoutID = setTimeout(function () {
      updateSidebar(tabIsLoading);
    }, 250);
  }
}

/*
*   Handle tabs.onActivated event
*/
function handleTabActivated (activeInfo) {
  if (logInfo) console.log(activeInfo);

  runContentScripts('handleTabActivated');
}

/*
*   Handle window focus change events: If the sidebar is open in the newly
*   focused window, save the new window ID and update the sidebar content.
*/
function handleWindowFocusChanged (windowId) {
  if (windowId !== myWindowId) {
    let checkingOpenStatus = browser.sidebarAction.isOpen({ windowId });
    checkingOpenStatus.then(onGotStatus, onInvalidId);
  }

  function onGotStatus (result) {
    if (result) {
      myWindowId = windowId;
      runContentScripts('onGotFocus');
      if (logInfo) console.log(`Focus changed to window: ${myWindowId}`);
    }
  }

  function onInvalidId (error) {
    if (logInfo) console.log(`onInvalidId: ${error}`);
  }
}

//---------------------------------------------------------------
//  Functions that process and display data from content script
//---------------------------------------------------------------

/*
*   Show and hide views.
*/

function showView (id) {
  for (let i = 0; i < views.length; i++) {
    let view = views[i];
    if (view.id === id) {
      view.classList.add('show');
    } else {
      view.classList.remove('show');
    }
  }
}

/*
*   Display the content generated by the content script.
*/
function updateSidebar (info) {
  let viewTitle    = document.querySelector('#view-title');
  let infoLocation = document.querySelector('#info-location .value');
  let infoTitle    = document.querySelector('#info-title .value');
  let infoRuleset  = document.querySelector('#info-ruleset .value');

  // page-title and headings
  if (typeof info === 'object') {

    // Update the page information footer
    infoTitle.textContent    = info.title;
    infoLocation.textContent = info.location;
    infoRuleset.textContent  = info.ruleset;

    // Update the headings box
    if (typeof info.infoSummary === 'object') {
      viewTitle.textContent = getMessage("viewTitleSummaryLabel");
      vSummary.update(info.infoSummary);
    }
    else {
      if (typeof info.infoRuleGroup === 'object') {
        viewTitle.textContent = info.infoRuleGroup.groupLabel;
        vRuleGroup.update(info.infoRuleGroup);
      }
      else {
        if (info.infoRuleResult) {
          viewTitle.textContent = 'Rule Result';
          vRuleResult.update(info.infoRuleResult);
        }
        else {
          vSummary.clear();
          vRuleGroup.clear();
          vRuleResult.clear();
        }
      }
    }
  }
  else {
    let parts = info.split(';');
    if (parts.length == 1) {
      infoLocation.textContent = '';
      infoTitle.textContent = info;
    } else {
      infoLocation.textContent = parts[0];
      infoTitle.textContent = parts[1];
    }
    vSummary.clear();
    vRuleGroup.clear();
    vRuleResult.clear();
  }
}

//------------------------------------------------------
//  Functions that run the content script and initiate
//  processing of the data it sends via messaging
//------------------------------------------------------

/*
*   Listen for message from content script
*/
browser.runtime.onMessage.addListener(
  function (message, sender) {
    switch (message.id) {
      case 'info':
        updateSidebar(message);
        break;
    }
  }
);

//------------------------------------------------------
//  Functions that run the content scripts to initiate
//  processing of the data to be sent via port message
//------------------------------------------------------

/*
*   runContentScripts: When content.js is executed, it established a port
*   connection with this script (panel.js), which in turn has a port message
*   handler listening for the 'info' message. When that message is received,
*   the handler calls the updateSidebar function with the structure info.
*/
function runContentScripts (callerfn) {
  vSummary.clear();
  vRuleGroup.clear();
  vRuleResult.clear();
  showView(sidebarView);

  getOptions().then( (options) => {
    getActiveTabFor(myWindowId).then(tab => {
      if (tab.url.indexOf('http:') === 0 || tab.url.indexOf('https:') === 0) {
        browser.tabs.executeScript({ code: `var infoAInspectorEvaluation = {};`});
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.view      = "${sidebarView}";` });
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.groupType = "${sidebarGroupType}";` });
        // note sidebarGroupId is a number value
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.groupId        = ${sidebarGroupId};` });
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.ruleId         = "${sidebarRuleId}";` });
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.rulesetId      = "${options.rulesetId}";` });
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.highlight      = "${options.highlight}";` });
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.position       = ${sidebarElementPosition};` });
        browser.tabs.executeScript({ code: `infoAInspectorEvaluation.highlightOnly  = ${sidebarHighlightOnly};` });
        browser.tabs.executeScript({ file: '../scripts/oaa_a11y_evaluation.js' });
        browser.tabs.executeScript({ file: '../scripts/oaa_a11y_rules.js' });
        browser.tabs.executeScript({ file: '../scripts/oaa_a11y_rulesets.js' });
        browser.tabs.executeScript({ file: '../highlight.js' });
        browser.tabs.executeScript({ file: '../evaluate.js' });
        browser.tabs.executeScript({ file: '../content.js' })
        .then(() => {
          if (logInfo) console.log(`Content script invoked by ${callerfn}`)
        });
      }
      else {
        updateSidebar (protocolNotSupported);
      }
      sidebarHighlightOnly= false;
    })
  });

};

/*
*   getActiveTabFor: expected argument is ID of window with focus. The module
*   variable myWindowId is updated by handleWindowFocusChanged event handler.
*/
function getActiveTabFor (windowId) {
  return new Promise (function (resolve, reject) {
    let promise = browser.tabs.query({ windowId: windowId, active: true });
    promise.then(
      tabs => { resolve(tabs[0]) },
      msg => { reject(new Error(`getActiveTabInWindow: ${msg}`)); }
    )
  });
}

/*
*   Add event listeners when sidebar loads
*/
window.addEventListener("load", function (e) {
  browser.tabs.onUpdated.addListener(handleTabUpdated, { properties: ["status"] });
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.windows.onFocusChanged.addListener(handleWindowFocusChanged);
});
