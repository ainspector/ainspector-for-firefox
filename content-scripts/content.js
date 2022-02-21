/*
*   content.js
*/
// sidebarViews is a copy of sidebarViews constant in
// panel.js
var sidebarViews = {
  summary : 'summary',
  ruleResults: 'rule-results',
  elementResults: 'element-results'
};

/*
**  Connect to panel.js script and set up listener/handler
*/
var panelPort = browser.runtime.connect({ name: 'content' });

panelPort.onMessage.addListener(messageHandler);

function messageHandler (message) {
  switch (message.id) {
    case 'getInfo':
      getEvaluationInfo(panelPort);
      break;
  }
}

/*
*   Send 'info' message with evaluation information to sidebar script.
*/

function getEvaluationInfo(panelPort) {

  let view      = infoAInspectorEvaluation.view;
  let groupType = infoAInspectorEvaluation.groupType;
  let groupId   = infoAInspectorEvaluation.groupId;
  let ruleId    = infoAInspectorEvaluation.ruleId;
  let rulesetId = infoAInspectorEvaluation.rulesetId;
  let highlight = infoAInspectorEvaluation.highlight;
  let position  = infoAInspectorEvaluation.position;
  let highlightOnly   = infoAInspectorEvaluation.highlightOnly;
  let removeHighlight = infoAInspectorEvaluation.removeHighlight;

  let info = {};
  info.id       = 'info';
  info.title    = document.title;
  info.location = document.location.href
  info.ruleset  = rulesetId;

  switch(view) {
    case sidebarViews.summary:
      highlightModule.removeHighlight(document);
      info.infoSummary = getSummaryInfo();
      break;

    case sidebarViews.ruleResults:
      highlightModule.removeHighlight(document);
      info.infoRuleGroup = getRuleGroupInfo(groupType, groupId);
      break;

    case sidebarViews.elementResults:
      if (highlightOnly) {
        info.infoHighlight = highlightElements(highlight, position);
      } else {
        highlightModule.removeHighlight(document);
        info.infoRuleResult = getRuleResultInfo(ruleId, highlight, position);
        highlightElements(highlight, position);
      }
      break;

    default:
      break;
  }

  panelPort.postMessage(info);
}

/*
*  This message handler is used to remove element highlighting
*  when the sidebar is closed
*/
browser.runtime.onMessage.addListener(request => {
  // to be executed on receiving messages from the panel
  if ((request.option    === 'highlight') &&
      (request.highlight === 'none')) {
    highlightModule.removeHighlight(document);
  }
});
