// Util
function debounce(fn, time) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(() => { fn.apply(this, arguments) }, time);
  }
}

function throttle(fn, time) {
  let lastExecution = 0;
  return function() {
    if (Date.now() - lastExecution >= time) {
      fn.apply(this, arguments);
    }
  }
}

function toTitleCase(string) {
  string = string.replace(/[A-Z]/g, (match) => ` ${match.toUpperCase()}`);
  return string.substr(0, 1).toUpperCase() + string.substr(1);
}

function stripVar(string) {
  return string.replace(/var\((.*?)\)/, '$1');
}

function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Variable manipulation
function CSSVariables() {
  this.sheets = {};
  this.changed = {};
  this.getSheets();
};

CSSVariables.log = (message) => {
  console.log(`𝑥 CSSVariables: ${message}`);
};

// Statics
CSSVariables.getVariablesFromRule = function(rule) {
  let variables = {};

  rule.styleMap.forEach((value, property) => {
    if (property.indexOf('--') === 0) {
      value = value.toString().trim();
      variables[property] = value;
    }
  });

  return variables;
};

CSSVariables.getVariablesFromSheet = function(sheet) {
  let variables = {};

  for (let rule of sheet.rules) {
    Object.assign(variables, CSSVariables.getVariablesFromRule(rule));
  }

  return variables;
};

CSSVariables.getSheetAsCSS = function(sheet) {
  return Array.prototype.slice.call(sheet.rules).map(rule => rule.cssText.replace('{', '{\n').split(';').join(';\n')).join('\n');
};

CSSVariables.setSheetFromCSS = function(sheet, css) {
  let rule = sheet.rules[0];
  rule.cssText = css;
};

CSSVariables.getRuleFromSheet = function(sheet) {
  if (!sheet) {
    throw new Error(`CSSVariables: No rules found in ${sheetName}`);
  }

  let rule = sheet.rules[0];
  if (!rule) {
    throw new Error(`CSSVariables: Sheet ${sheetName} not found`);
  }

  return rule;
};

// Instance methods
CSSVariables.prototype.set = function(sheetName, property, value) {
  let rule = CSSVariables.getRuleFromSheet(this.sheets[sheetName]);
  let oldValue = rule.style.getPropertyValue(property, value).trim();

  if (oldValue !== value) {
    // Store what changed
    this.changed[sheetName] = this.changed[sheetName] || {};
    if (this.changed[sheetName][property]) {
      if (this.changed[sheetName][property].oldValue === value) {
        // Drop variable from changelog if its changed back
        delete this.changed[sheetName][property];

        // Drop the entire entry if its empty
        if (Object.keys(this.changed[sheetName]).length === 0) {
          delete this.changed[sheetName];
        }
      }
      else {
        // Update to the new value
        this.changed[sheetName][property].value = value;
      }
    }
    else {
      // Store the old and new values in the changelog
      this.changed[sheetName][property] = {
        selector: rule.selectorText,
        property: property,
        oldValue: oldValue,
        value: value
      };
    }

    rule.style.setProperty(property, value);
  }
};

CSSVariables.prototype.get = function(sheetName, property) {
  let rule = CSSVariables.getRuleFromSheet(this.sheets[sheetName]);

  return rule.style.getPropertyValue(property).trim();
};

CSSVariables.prototype.getAllVariables = function() {
  let variables = {};

  for (let sheetName in this.sheets) {
    let sheet = this.sheets[sheetName];
    Object.assign(variables, CSSVariables.getVariablesFromSheet(sheet));
  }

  return variables;
};

CSSVariables.prototype.getSheets = function() {
  // Read in all stylesheets
  let sheets = document.styleSheets;

  for (let sheet of sheets) {
    // Skip inline sheets
    if (!sheet.href) {
      continue;
    }

    // Only bother with Spectrum sheets
    let match = sheet.href.match(/spectrum-([\w-]*?)\.css/) || sheet.href.match(/components\/(.*?)\/vars\.css/);
    if (!match) {
      continue;
    }

    let sheetName = match[1];

    if (this.sheets[sheetName] != sheet) {
      CSSVariables.log(`Loaded sheet ${sheetName}`);
      this.sheets[sheetName] = sheet;
    }
  }
};

CSSVariables.prototype.getSheetAsCSS = function(sheetName) {
  let sheet = this.sheets[sheetName];
  if (!sheet) {
    throw new Error(`CSSVariables: Sheet ${sheetName} not found`);
  }
  return CSSVariables.getSheetAsCSS(sheet);
};

CSSVariables.prototype.setSheetFromCSS = function(sheetName, css) {
  let sheet = this.sheets[sheetName];
  if (!sheet) {
    throw new Error(`CSSVariables: Sheet ${sheetName} not found`);
  }
  return CSSVariables.setSheetFromCSS(sheet, css);
};

CSSVariables.prototype.getVariablesFromSheet = function(sheetName) {
  return CSSVariables.getVariablesFromSheet(this.sheets[sheetName]);
};

// Editor interface
function CSSVariableEditor() {
  this.variables = new CSSVariables();
  window.addEventListener('PageFastLoaded', this._handleFastLoad.bind(this));

  let template = document.createElement('div');
  template.innerHTML = CSSVariableEditor.templates.container();
  this.container = template.querySelector('#editorContainer');
  this.fields = template.querySelector('#editorFields');
  window.addEventListener('DOMContentLoaded', this._attach.bind(this));

  this._tokenFilterField = template.querySelector('.js-tokenFilter');
  this._clearFilter = template.querySelector('.js-clearFilter');
  this._inspectModeButton = template.querySelector('.js-inspectMode');
  this._inspectangle = template.querySelector('.js-inspectangle');
  this._inspectangleLabel = template.querySelector('.js-inspectangleLabel');
  this._inspectangleTooltip = template.querySelector('.js-inspectangleTooltip');
  this._inspectanglePadding = template.querySelector('.js-inspectanglePadding');
  this._breadcrumbs = template.querySelector('.js-breadcrumbs');
  this._systemCrumb = template.querySelector('.js-systemCrumb');
  this._componentCrumb = template.querySelector('.js-componentCrumb');
  this._componentCrumbLabel = template.querySelector('.js-componentCrumbLabel');
  this._componentCrumb.parentElement.removeChild(this._componentCrumb);

  let handleChange = debounce(this._handleEditorChange.bind(this), 200);
  this.container.addEventListener('keypress', handleChange);
  this.container.addEventListener('input', handleChange);
  this.container.addEventListener('submit', e => {
    // Forms are used for accessbility, not submitting form data
    e.preventDefault();
  });
  this.container.addEventListener('click', this._handleClick.bind(this));

  this.saveButton = template.querySelector('.js-saveButton');
  this.filenameField = template.querySelector('.js-filenameField');

  this._autocomplete = new DelegatedAutocomplete(this);

  this._handleInspect = this._handleInspect.bind(this);
  this._handleEmptyClick = this._handleEmptyClick.bind(this);

  this._inspectModeButton.addEventListener('click', e => {
    this._inspectMode = !this._inspectMode;
    this._showHideInspectangle();

    // Don't catch the click listener for resetting
    e.stopPropagation();
  });

  this._systemCrumb.addEventListener('click', e => {
    this.stopInspecting();
  });

  this._inspectangle.addEventListener('click', e => {
    this.inspect(this._inspectedElement);
  });

  this.container.addEventListener('mouseover', e => {
    let field = e.target.closest('.js-variableField');
    if (field && field != this._inspectedField) {
      let varName = field.getAttribute('data-varName');
      this.inspectVar(varName);
      this._inspectedField = field;
    }
  });

  this.container.addEventListener('mouseout', e => {
    let field = e.target.closest('.js-variableField');
    if (field !== this._inspectedField) {
      this.hideInspectangle();
      this._inspectedField = null;
    }
  });

  window.addEventListener('contextmenu', e => {
    if (this._inspectMode) {
      if (this._inspectangle.contains(e.target)) {
        // Move in to maximum precision on the first click
        console.log('Inpspecting');
        if (this._precisionInspectedElement) {
          // Start moving up a level on the next click
          if (this._precisionInspectedElement === this._inspectedElement && this._precisionInspectedElement.parentElement) {
            console.log('Moving up');
            this._precisionInspectedElement = this._precisionInspectedElement.parentElement;
          }
          // Draw the inspectangle loosely so we catch subcomponents
          this._drawInspectangle(this._precisionInspectedElement, true);

          this._contextualized = true;
        }
      }
      e.preventDefault();
    }
  });

  this._clearFilter.addEventListener('click', e => {
    this._handleSearchReset();
  });

  this._tokenFilterField.addEventListener('keyup', e => {
    let query = this._tokenFilterField.value.trim();
    if (query.length) {
      this.filterSheetsByQuery(query, this._inspectedVariables);
      this._clearFilter.hidden = false;
    }
    else {
      this._handleSearchReset();
    }
  });

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      let toggled = this.container.classList.toggle('is-open');
      // document.querySelector('.spectrum-Site').classList.toggle('spectrum-Site--editorMode', toggled);
      e.preventDefault();
    }
  }.bind(this));
}

CSSVariableEditor.templates = {
  container: function() {
    return `
<div class="CSSVariableEditor-inspectangle js-inspectangle u-tooltip-showOnHover">
  <div class="CSSVariableEditor-inspectanglePadding js-inspectanglePadding"></div>
  <div class="spectrum-Tooltip spectrum-Tooltip--top js-inspectangleTooltip">
    <span class="spectrum-Tooltip-label js-inspectangleLabel"></span>
    <span class="spectrum-Tooltip-tip"></span>
  </div>
</div>

<div class="spectrum-Site-panel CSSVariableEditor-container spectrum--dark spectrum" id="editorContainer">
  <div class="spectrum-Site-panel-section">
    <div class="CSSVariableEditor-actionContainer">
      <button class="spectrum-Tool js-inspectMode">
        <svg class="spectrum-Icon spectrum-Icon--sizeS" focusable="false" aria-hidden="true" aria-label="Select">
          <use xlink:href="#spectrum-icon-18-Select"></use>
        </svg>
      </button>

      <nav>
        <ul class="spectrum-Breadcrumbs js-breadcrumbs">
          <li class="spectrum-Breadcrumbs-item">
            <div class="spectrum-Breadcrumbs-itemLink js-systemCrumb" role="link" tabindex="0">Spectrum</div>
            <svg class="spectrum-Icon spectrum-UIIcon-ChevronRightSmall spectrum-Breadcrumbs-itemSeparator" focusable="false" aria-hidden="true">
              <use xlink:href="#spectrum-css-icon-ChevronRightSmall" />
            </svg>
          </li>
          <li class="spectrum-Breadcrumbs-item js-componentCrumb">
            <div class="spectrum-Breadcrumbs-itemLink js-componentCrumbLabel" role="link">Component</a>
          </li>
        </ul>
      </nav>
    </div>

    <hr class="spectrum-Rule spectrum-Rule--medium">

    <form class="spectrum-Search CSSVariableEditor-filter">
      <input type="search" placeholder="Filter tokens" name="search" value="" autocomplete="off" class="spectrum-Textfield spectrum-Textfield--quiet spectrum-Search-input js-tokenFilter">
      <svg class="spectrum-Icon spectrum-UIIcon-Magnifier spectrum-Search-icon" focusable="false" aria-hidden="true">
        <use xlink:href="#spectrum-css-icon-Magnifier" />
      </svg>
      <button type="reset" class="spectrum-ClearButton js-clearFilter" tabindex="-1" hidden>
        <svg class="spectrum-Icon spectrum-UIIcon-CrossSmall" focusable="false" aria-hidden="true">
          <use xlink:href="#spectrum-css-icon-CrossSmall" />
        </svg>
      </button>
    </form>

  </div>
  <div class="spectrum-Site-panel-section spectrum-Site-panel-section--primary">
    <div class="spectrum-Accordion" role="region" id="editorFields"></div>
  </div>
  <div class="spectrum-Site-panel-section">
    <div class="CSSVariableEditor-saveArea spectrum-ButtonGroup">
      <button class="spectrum-Button spectrum-Button--cta js-saveButton" disabled>
        <span class="spectrum-Button-label">Save</span>
      </button>
      <input autocomplete="off" class="spectrum-Textfield CSSVariableEditor-filenameField js-filenameField" value="spectrum-custom.css" disabled>
    </div>
  </div>
</div>
`;
  },
  variableField: function(sheetName, varName, value) {
    let fieldId = `${sheetName}-${varName}`;
    return `
<div class="spectrum-Form-item js-variableField" data-varName="${varName}">
  <label class="spectrum-Form-itemLabel" for="${fieldId}" label="${varName}">${varName.replace(/^--spectrum-/, '')}</label>
  <div class="spectrum-Form-itemField">
    <div class="CSSVariableEditor-variableFieldContainer">
      <input autocomplete="off" class="spectrum-Textfield CSSVariableEditor-variableField" id="${fieldId}" value="${htmlEntities(value)}" data-sheetName="${sheetName}" data-varName="${varName}">

      <div class="CSSVariableEditor-variableFieldPreview">
        ${DelegatedAutocomplete.templates.value(this.resolveVariable(varName), varName, this.getVariableChain(varName))}
      </div>
    </div>
  </div>
</div>
`;
  },
  field: function(sheetName, variables, isComponent) {
    let accordionId = `editor-${sheetName}`;
    return `
<div class="spectrum-Accordion-item js-sheetEditor ${isComponent ? 'js-componentEditor' : 'js-globalEditor'}" role="presentation" id="${accordionId}" ${isComponent ? 'hidden' : ''}>
  <h3 class="spectrum-Accordion-itemHeading">
    <button class="spectrum-Accordion-itemHeader" type="button" id="${accordionId}-header" aria-controls="${accordionId}-content" aria-expanded="true">${toTitleCase(sheetName)}</button>
    <svg class="spectrum-Icon spectrum-UIIcon-ChevronRightMedium spectrum-Accordion-itemIndicator" focusable="false" aria-hidden="true">
      <use xlink:href="#spectrum-css-icon-ChevronRightMedium" />
    </svg>
  </h3>

  <div class="spectrum-Accordion-itemContent" role="region" id="${accordionId}-content" aria-labelledby="${accordionId}-header">
    <form class="spectrum-Form spectrum-Form--labelsAbove CSSVariableEditor-sheetForm">
      ${Object.keys(variables).map(varName => CSSVariableEditor.templates.variableField.call(this, sheetName, varName, variables[varName])).join('\n')}
    </form>
  </div>
</div>
`;
  }
};

CSSVariableEditor.log = (message) => {
  console.log(`📝 CSSVariableEditor: ${message}`);
};

CSSVariableEditor.prototype._attach = function() {
  document.querySelector('.spectrum-Site-content').appendChild(this.container);
  document.body.appendChild(this._inspectangle);
  this._handleLoad();
};

CSSVariableEditor.componentClassnameRE = /^spectrum-[^-]+$/;
CSSVariableEditor.subElementClassnameRE = /^spectrum-[\w-]+$/;
CSSVariableEditor.getComponentNameFromElement = function(element, loose) {
  if (CSSVariableEditor.isBanned(element.className)) {
    return null;
  }

  let classList = element.classList;
  for (let className of classList) {
    let match = className.match(loose ? CSSVariableEditor.subElementClassnameRE : CSSVariableEditor.componentClassnameRE);
    if (match) {
      return match[0];
    }
  }
  return null;
};

CSSVariableEditor.bannedClassNames = [
  'spectrum-CSSExample',
  'spectrum-CSSComponent',
  'spectrum-Site',
  'spectrum-BigSubtleLink'
];

CSSVariableEditor.isBanned = function(className) {
  if (!className) {
    return false;
  }

  return className.split(' ').filter(className => className.startsWith('spectrum-')).every(className => {
    return CSSVariableEditor.bannedClassNames.some(bannedClassName => className.startsWith(bannedClassName));
  });
};

CSSVariableEditor.prototype._drawInspectangle = function(activeEl, precision) {
  if (activeEl) {
    this._precisionInspectedElement = activeEl;

    let componentName = CSSVariableEditor.getComponentNameFromElement(activeEl, precision);
    if (!componentName) {
      let level = 0;
      while (activeEl && activeEl.parentElement && !componentName) {
        activeEl = activeEl.parentElement;
        componentName = CSSVariableEditor.getComponentNameFromElement(activeEl, precision);
      }

      // We couldn't find anything to inspect
      if (activeEl === document.documentElement) {
        return;
      }
    }

    if (activeEl && !CSSVariableEditor.isBanned(activeEl.className)) {
      if (activeEl === this._inspectedElement) {
        this._inspectangle.hidden = false;
      }
      else if (activeEl) {
        let rect = activeEl.getBoundingClientRect();
        this._showInspectangleAt(rect, componentName);

        this._inspectedElement = activeEl;
      }
    }
  }
};

CSSVariableEditor.prototype._showInspectangleAt = function(rect, label) {
  this._inspectangle.style.left = rect.left + 'px';
  this._inspectangle.style.top = rect.top + 'px';
  this._inspectangle.style.width = rect.width === 'auto' ? 'auto' : (rect.width + 'px');
  this._inspectangle.style.height = rect.height === 'auto' ? 'auto' : (rect.height + 'px');
  this._inspectangle.style.borderRadius = (rect.borderRadius || '');
  this._inspectanglePadding.style.borderRadius = (rect.borderRadius || '');

  this._inspectangle.classList.remove('is-fading');
  if (rect.hideQuickly) {
    setTimeout(() => {
      this._inspectangle.classList.add('is-fading');
    }, 100);
  }

  if (rect.borderWidth) {
    this._inspectanglePadding.style.borderWidth = (rect.borderWidth || '');
  }
  else {
    this._inspectanglePadding.style.borderLeftWidth = (rect.borderLeftWidth || '');
    this._inspectanglePadding.style.borderRightWidth = (rect.borderRightWidth || '');
    this._inspectanglePadding.style.borderTopWidth = (rect.borderTopWidth || '');
    this._inspectanglePadding.style.borderBottomWidth = (rect.borderBottomWidth || '');
  }
  this._inspectangle.style.backgroundColor = (rect.backgroundColor || '');
  if (this._inspectangleClass) {
    this._inspectangle.classList.remove(this._inspectangleClass);
  }
  if (rect.className) {
    this._inspectangleClass = rect.className;
    this._inspectangle.classList.add(rect.className);
  }
  else {
    this._inspectangleClass = null;
  }
  this._inspectangleClass = rect.className;
  this._inspectangle.hidden = false;
  this._inspectangleLabel.innerHTML = label;
  this._inspectangleTooltip.parentElement.classList.add('is-open');

  if (rect.from === 'side' || rect.from === 'right' || rect.from === 'left') {
    this._inspectangleTooltip.classList.remove('spectrum-Tooltip--bottom');
    this._inspectangleTooltip.classList.remove('spectrum-Tooltip--top');
  }

  if (rect.from === 'side') {
    if (rect.left - 80 < 0) {
      rect.from = 'right';
    }
    else {
      rect.from = 'left';
    }
  }
  if (rect.from === 'right') {
    this._inspectangleTooltip.classList.add('spectrum-Tooltip--right');
    this._inspectangleTooltip.classList.remove('spectrum-Tooltip--left');
  }
  else if (rect.from === 'left') {
    this._inspectangleTooltip.classList.add('spectrum-Tooltip--left');
    this._inspectangleTooltip.classList.remove('spectrum-Tooltip--right');
  }

  if (!rect.from || rect.from === 'top' || rect.from === 'bottom') {
    this._inspectangleTooltip.classList.remove('spectrum-Tooltip--left');
    this._inspectangleTooltip.classList.remove('spectrum-Tooltip--right');

    if (rect.from === 'bottom' || (rect.top - 80 < 0 && rect.bottom < window.innerHeight)) {
      this._inspectangleTooltip.classList.add('spectrum-Tooltip--bottom');
      this._inspectangleTooltip.classList.remove('spectrum-Tooltip--top');
    }
    else {
      this._inspectangleTooltip.classList.add('spectrum-Tooltip--top');
      this._inspectangleTooltip.classList.remove('spectrum-Tooltip--bottom');
    }
  }
};

CSSVariableEditor.prototype._handleInspect = function(e) {
  this._inspectangle.hidden = true;
  let activeEl = document.elementFromPoint(e.clientX, e.clientY);

  if (this.container.contains(activeEl)) {
    // Don't get too meta
    return;
  }

  this._drawInspectangle(activeEl);
};

CSSVariableEditor.prototype._handleSearchReset = function() {
  if (this._inspectedVariables) {
    this.filterSheetsByVariables(this._inspectedVariables);
  }
  else {
    this.showAllSheets();
    this.collapseAllSheets();
  }
  this._clearFilter.hidden = true;
};

CSSVariableEditor.prototype._showHideInspectangle = function() {
  this._inspectModeButton.classList.toggle('is-selected', this._inspectMode);

  window[this._inspectMode ? 'addEventListener' : 'removeEventListener']('mousemove', this._handleInspect);
  if (!this._inspectMode) {
    this._inspectangle.hidden = true;
    this._inspectangleTooltip.parentElement.classList.remove('is-open');
  }

  window[this._inspectMode ? 'addEventListener' : 'removeEventListener']('click', this._handleEmptyClick);

  // console.log(`📝 CSSVariableEditor: Inspect mode ${this._inspectMode ? 'en' : 'dis'}abled`);
};

CSSVariableEditor.prototype.showInspectangle = function() {
  this._inspectMode = true;
  this._showHideInspectangle();
};

CSSVariableEditor.prototype.hideInspectangle = function() {
  this._inspectMode = false;
  this._showHideInspectangle();
};

CSSVariableEditor.prototype._handleEmptyClick = function() {
  // We clicked on nothing, so show all variables
  this.hideInspectangle();
  this.stopInspecting();
};

CSSVariableEditor.prototype.inspect = function(element) {
  console.log(`📝 CSSVariableEditor: Inspecting ${element.className}`);

  this._inspecting = true;

  // Inspect the highlighted element
  let variables = CSSVariableEditor.getVariablesForTree(element);
  this._inspectedVariables = variables;
  this._inspectedElement = element;
  this._tokenFilterField.value = '';
  this.filterSheetsByVariables(variables);
  this.hideInspectangle();
  this.expandAllSheets();

  let name = CSSVariableEditor.getComponentNameFromElement(element) || element.className.split(' ').shift();
  this._componentCrumbLabel.innerText = name.replace(/^spectrum-/, '');
  this._breadcrumbs.appendChild(this._componentCrumb);
};

CSSVariableEditor.prototype.stopInspecting = function() {
  this._inspecting = false;
  this._inspectedElement = null;
  this._inspectedVariables = null;
  this._componentCrumb.parentElement && this._componentCrumb.parentElement.removeChild(this._componentCrumb);

  this.collapseAllSheets();
  this.showGlobalSheets();
};

CSSVariableEditor.prototype.search = function(query, varName) {
  query = query.replace(/var\(/, '').replace(/\)/g, '').replace('--spectrum-', '');
  query = query.replace(/-/g, ' ');

  let queryParts = query.trim().split(' ');
  queryParts = queryParts
    .filter(term => term.length > 1);

  // Let the last bit be a wildcard
  queryParts[queryParts.length - 1] = queryParts[queryParts.length - 1] + '*';

  queryParts = queryParts
    .map((term, index) => `${term}${(index < queryParts.length - 1) ? `^${(queryParts.length - index) * 10}` : ''}`);

  query = queryParts.join(' ');

  if (varName) {
    if (varName.match(/-color[^\w]?/)) {
      // Colors only
      query += ' +color -opacity';
    }
    else {
      // Dimensions only
      query += ' -color';
    }
  }

  // Don't search twice in a row
  if (query === this._lastQuery) {
    return this._lastResults;
  }

  CSSVariableEditor.log(`Searching for ${query}`);

  let results = this._lastResults = this._index.search(query);
  this._lastQuery = query;

  return results
};

CSSVariableEditor.prototype.resolveVariable = function(varName) {
  let value = varName;
  while (this._allVariables[value]) {
    value = stripVar(this._allVariables[value]);
  }
  return value;
};

CSSVariableEditor.prototype.getVariableChain = function(varName) {
  let chain = [varName];
  let value = varName;
  while (this._allVariables[value]) {
    value = stripVar(this._allVariables[value]);
    chain.push(value);
  }
  return chain;
};

CSSVariableEditor.prototype.getValue = function(varName) {
  return this._allVariables[varName] || varName;
};

CSSVariableEditor.expandValue = function(value) {
  let styleValue = CSSStyleValue.parse('--padding', value);

  let parts = Array.prototype.slice.call(styleValue)
    .map(styleValue => typeof styleValue === 'string' ? styleValue.trim() : styleValue.variable)
    .filter(Boolean);

  let expanded = {};
  if (parts.length === 1) {
    expanded.top = value;
    expanded.right = value;
    expanded.bottom = value;
    expanded.left = value;
  }
  else if (parts.length === 2) {
    expanded.top = parts[0];
    expanded.bottom = parts[0];
    expanded.right = parts[1];
    expanded.left = parts[1];
  }
  else if (parts.length === 3) {
    expanded.top = parts[0];
    expanded.bottom = parts[2];
    expanded.right = parts[1];
    expanded.left = parts[1];
  }
  else if (parts.length === 4) {
    expanded.top = parts[0];
    expanded.right = parts[1];
    expanded.bottom = parts[2];
    expanded.left = parts[3];
  }
  else {
    throw new Error(`CSSVariableEditor: Cannot expand ${value}, it has ${parts.length} parts`);
  }

  return expanded;
};

CSSVariableEditor.searchableSheets = {
  animationGlobals: true,
  colorAliases: true,
  colorGlobals: true,
  colorSemantics: true,
  dimensionAliases: true,
  dimensionGlobals: true,
  fontGlobals: true,
  staticAliases: true,
  // dark: true,
  // darkest: true,
  // lightest: true,
  light: true,
  // large: true,
  medium: true,
  // icons: true,
  // typography: true
};

CSSVariableEditor.prototype.inspectVar = function(varName) {
  let rules = CSSVariableEditor.getRulesForVariable(varName);
  for (let rule of rules) {
    // Determine the property that is set to the variable
    let matches = rule.cssText.match(new RegExp(`([\\w-]+):[^;]+?${varName}`, 'g'));
    let property;
    if (matches && matches.length) {
      for (let potentialMatch of matches) {
        // Determine which prop to get
        let matchedProperty = potentialMatch.substr(0, potentialMatch.indexOf(':'));
        if (!property) {
          property = matchedProperty;
        }
        else if (varName.toLowerCase().indexOf(matchedProperty.split('-').shift().toLowerCase()) !== -1) {
          property = matchedProperty;
        }
      }
    }

    if (property) {
      let selector;
      let elements;
      if (this._inspectedElement) {
        selector = rule.selectorText;
        elements = [this._inspectedElement].concat(Array.prototype.slice.call(this._inspectedElement.querySelectorAll('*'))).filter(element => element.matches(selector));
      }
      else {
        selector = rule.selectorText.split(',').map(selector => `.spectrum-CSSExample-example ${selector}`).join(', ');
        elements = document.querySelectorAll(selector);
      }

      if (elements.length) {
        let element = elements[0];
        let style = window.getComputedStyle(element);
        let elementRect = element.getBoundingClientRect();
        let rect = {
          bottom: elementRect.bottom,
          height: elementRect.height,
          left: elementRect.left,
          right: elementRect.right,
          top: elementRect.top,
          width: elementRect.width,
          x: elementRect.x,
          y: elementRect.y
        };

        rect.className = 'CSSVariableEditor-inspectangle--redline';
        CSSVariableEditor.log(`Inspecting: ${property} = ${style[property]}`);

        let label = `<strong>${property}</strong>: ${varName.replace('--spectrum-', '')}`;

        if (property === 'width' || property === 'min-width' || property === 'height' || property === 'min-height') {
          rect.from = 'side';
          if (property === 'width' || property === 'min-width') {
            rect.height = 4;
            rect.from = 'top';
          }
          else if (property === 'height' || property === 'min-height') {
            rect.width = 4;
          }
          rect.borderWidth = '0px';
          this._showInspectangleAt(rect, label);
        }
        else if (property.startsWith('padding')) {
          rect.from = 'top';
          if (property === 'padding') {
            // Calculate where the padding is
            let padding;
            try {
              padding = CSSVariableEditor.expandValue(rule.style.padding);
            }
            catch(err) {
              CSSVariableEditor.log(`Could not expand padding value: ${rule.style.padding}`);
            }

            if (padding) {
              for (let paddingSide in padding) {
                let paddingValue = padding[paddingSide];
                if (paddingValue === varName) {
                  rect.from = paddingSide;
                  rect[`border${paddingSide.substr(0, 1).toUpperCase()}${paddingSide.substr(1)}Width`] = style[`padding-${paddingSide}`];
                }
              }
            }
            else {
              // Fall back if we can't parse the value (due to calc)
              rect.borderLeftWidth = style['padding-left'];
              rect.borderRightWidth = style['padding-right'];
              rect.borderBottomWidth = style['padding-bottom'];
              rect.borderBottomWidth = style['padding-top'];
              rect.from = 'top';
            }
          }
          else {
            if (property === 'padding-left') {
              rect.from = 'left';
              rect.borderLeftWidth = style['padding-left'];
            }
            else if (property === 'padding-right') {
              rect.from = 'right';
              rect.borderRightWidth = style['padding-right'];
            }
            else if (property === 'padding-bottom') {
              rect.from = 'bottom';
              rect.borderBottomWidth = style['padding-bottom'];
            }
            else if (property === 'padding-top') {
              rect.from = 'top';
              rect.borderBottomWidth = style['padding-top'];
            }
          }

          rect.backgroundColor = 'transparent';
          this._showInspectangleAt(rect, label);
        }
        else if (property.startsWith('margin')) {
          rect.from = 'top';
          if (property === 'margin-left') {
            rect.from = 'left';
          }
          else if (property === 'margin-right') {
            rect.from = 'right';
          }
          else if (property === 'margin-bottom') {
            rect.from = 'bottom';
          }
          rect.top -= parseInt(style['margin-top'], 10);
          rect.left -= parseInt(style['margin-left'], 10);
          rect.height += parseInt(style['margin-bottom'], 10) + parseInt(style['margin-top'], 10);
          rect.width += parseInt(style['margin-left'], 10) + parseInt(style['margin-right'], 10);
          rect.borderTopWidth = style['margin-top'];
          rect.borderBottomWidth = style['margin-bottom'];
          rect.borderLeftWidth = style['margin-left'];
          rect.borderRightWidth = style['margin-right'];
          rect.backgroundColor = 'transparent';
          this._showInspectangleAt(rect, label);
        }
        else if (property === 'border-width' || property === 'border-radius' || property === 'border-color') {
          rect.from = 'top';
          rect.borderWidth = style['border-width'] || 2;
          rect.borderRadius = style['border-radius'];
          rect.backgroundColor = 'transparent';

          if (property === 'border-color') {
            rect.hideQuickly = true;
          }

          this._showInspectangleAt(rect, label);
        }
        else if (property === 'background-color' || property === 'color') {
          rect.hideQuickly = true;
          this._showInspectangleAt(rect, label);
        }
        else {
          CSSVariableEditor.log(`Not implemented: ${property} = ${style[property]}`);
        }
      }
      else {
        CSSVariableEditor.log(`Could not find element matching: ${selector}`);
      }
    }
  }
};

CSSVariableEditor.findElementsUsingVariable = function(varName) {
  let rules = CSSVariableEditor.getRulesForVariable(varName);
  let selector = rules.map(rule => rule.selectorText).join(', ');
  let elements = document.querySelectorAll(selector);
  return elements;
};

CSSVariableEditor.getRulesForVariable = function(varName) {
  let matchingRules = [];
  let sheets = document.styleSheets;
  for (let sheetIndex in sheets) {
    let rules = sheets[sheetIndex].rules;
    for (let ruleIndex in rules) {
      let rule = rules[ruleIndex];
      if (rule.cssText && rule.cssText.match(new RegExp(varName + '[^a-z\-]?'))) {
        matchingRules.push(rule);
      }
    }
  }
  return matchingRules;
};

CSSVariableEditor.getRulesForElement = function(element) {
  let matchingRules = [];
  let sheets = document.styleSheets;
  for (let sheetIndex in sheets) {
    let rules = sheets[sheetIndex].rules;
    for (let ruleIndex in rules) {
      let rule = rules[ruleIndex];
      if (element.matches(rule.selectorText)) {
        matchingRules.push(rule);
      }
    }
  }
  return matchingRules;
};

CSSVariableEditor.getVariablesFromRules = function(rules) {
  let variables = [];

  if (CSSVariableEditor.TypedCSSOM) {
    // Use the CSS Object Model to parse out values
    rules.forEach(rule => {
      let styleMap = rule.styleMap;
      styleMap.forEach((value, propName) => {
        // Check the property name
        // if (propName.startsWith('--')) {
        //   variables.push(propName);
        // }
        for (let part of value) {
          if (part instanceof CSSUnparsedValue) {
            // It contains CSS custom properties, delve deeper
            for (let item of part) {
              if (item instanceof CSSVariableReferenceValue) {
                variables.push(item.variable);
              }
            }
          }
        }
      });
    });
  }
  else {
    // Parse cssText the old fashioned way
    rules.forEach(rule => {
      // We have to check every property since expanded properties (as returned by the iterator), are all emptry
      Object.keys(rule.style).forEach((prop) => {
        let value = rule.style[prop];
        if (value) {
          let parsed = CSSStyleValue.parse('--test', value);
          for (let item of parsed) {
            if (item instanceof CSSVariableReferenceValue) {
              variables.push(item.variable);
            }
          }
        }
      });
    });
  }

  return variables;
};

CSSVariableEditor.getVariablesForElement = function(element) {
  let rules = CSSVariableEditor.getRulesForElement(element);
  let variables = CSSVariableEditor.getVariablesFromRules(rules);

  return variables;
};

CSSVariableEditor.getVariablesForTree = function(element) {
  // First, get the element an all of its spectrum-y children
  let children = [element].concat(Array.prototype.slice.call(element.querySelectorAll('*'))).filter(subElement => subElement.className.toString().indexOf('spectrum-') !== -1);

  // Next, make sure we're not doing lookups multiple times
  let childMap = new Map();
  let uniqueChildren = [];
  for (let child of children) {
    if (!childMap.has(child.className)) {
      childMap.set(child.className, true);
      uniqueChildren.push(child);
    }
  }

  CSSVariableEditor.log(`Getting variables for ${uniqueChildren.length} elements within ${element.className}...`);

  let variables = [];
  for (let child of uniqueChildren) {
    let newVariables = CSSVariableEditor.getVariablesForElement(child);
    variables = variables.concat(newVariables);
  }

  // Make it unique
  variables = [ ... new Set(variables)];

  CSSVariableEditor.log(`  Found ${variables.length} variables!`);

  return variables;
};

CSSVariableEditor.getClassTree = function(element) {
  let selectors = [];
  while (element && element.parentElement) {
    for (let className of element.classList) {
      if (className.match('spectrum-')) {
        selectors.push('.' + className);
      }
    }

    element = element.parentElement;
  }
  return selectors;
};

CSSVariableEditor.prototype.showAllSheets = function(query) {
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-variableField'), el => el.hidden = false);
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-sheetEditor'), el => el.hidden = false);
};

CSSVariableEditor.prototype.showGlobalSheets = function(query) {
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-variableField'), el => el.hidden = false);
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-globalEditor'), el => el.hidden = false);
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-componentEditor'), el => el.hidden = true);
};

CSSVariableEditor.prototype.collapseAllSheets = function(query) {
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-sheetEditor'), el => el.classList.remove('is-open'));
};

CSSVariableEditor.prototype.expandAllSheets = function(query) {
  Array.prototype.forEach.call(this.fields.querySelectorAll('.js-sheetEditor'), el => el.classList.add('is-open'));
};

CSSVariableEditor.prototype.filterSheetsByQuery = function(query, variables) {
  for (let sheetName in this.variables.sheets) {
    let sheetEl = this.fields.querySelector(`#editor-${sheetName}`);
    if (sheetEl) {
      // Check each variable
      let variableFields = sheetEl.querySelectorAll('.js-variableField');
      let sheetMatches = false;
      for (let variableField of variableFields) {
        let fieldMatches = variableField.getAttribute('data-varName').match(query);
        if (variables) {
          fieldMatches = fieldMatches && variables.indexOf(variableField.getAttribute('data-varName')) !== -1;
        }
        if (fieldMatches) {
          sheetMatches = true;
        }
        variableField.hidden = !fieldMatches;
      }

      sheetEl.hidden = !sheetMatches;
      sheetEl.classList.toggle('is-open', sheetMatches);
    }
  }
};

CSSVariableEditor.prototype.filterSheetsByVariables = function(variables) {
  for (let sheetName in this.variables.sheets) {
    let sheetEl = this.fields.querySelector(`#editor-${sheetName}`);
    if (sheetEl) {
      // Check each variable
      let variableFields = sheetEl.querySelectorAll('.js-variableField');
      let sheetMatches = false;
      for (let variableField of variableFields) {
        let fieldMatches = variables.indexOf(variableField.getAttribute('data-varName')) !== -1;
        if (fieldMatches) {
          sheetMatches = true;
        }
        variableField.hidden = !fieldMatches;
      }

      sheetEl.hidden = !sheetMatches;
    }
  }
};

CSSVariableEditor.prototype.filterSheetsBySelector = function(selectors) {
  for (let sheetName in this.variables.sheets) {
    let sheet = this.variables.sheets[sheetName];
    let matched = false;
    for (let rule of sheet.rules) {
      for (let selector of selectors) {
        if (rule.selectorText.split(',').indexOf(selector) !== -1) {
          matched = true;
          break;
        }
      }
    }

    let sheetEditor = this.fields.querySelector(`#editor-${sheetName}`);
    if (sheetEditor) {
      sheetEditor.hidden = !matched;
    }
  }
};

CSSVariableEditor.prototype._drawEditors = function() {
  let searchVariables = this._searchVariables = this._searchVariables || {};
  let allVariables = this._allVariables = this._allVariables || {};
  let sheetVariables = this._sheetVariables = this._sheetVariables || {};

  // Load up all variables
  for (let sheetName in this.variables.sheets) {
    // Don't bother fetching variables if we've already loaded them
    if (!sheetVariables[sheetName]) {
      let variables = this.variables.getVariablesFromSheet(sheetName);
      sheetVariables[sheetName] = variables;
      Object.assign(allVariables, variables);

      // Only bother with sheets that we want to search
      if (CSSVariableEditor.searchableSheets[sheetName]) {
        Object.assign(searchVariables, variables);
      }
    }
  }

  // Expose editor for each sheet
  for (let sheetName in sheetVariables) {
    let variables = sheetVariables[sheetName];

    // Add any new editors
    if (!this.fields.querySelector(`#editor-${sheetName}`)) {
      if (Object.keys(variables).length > 0) {
        this.fields.insertAdjacentHTML('afterbegin', CSSVariableEditor.templates.field.call(this, sheetName, variables, !this.variables.sheets[sheetName].href.match('/components/vars/')));
      }
    }
  }

  // Generate search index
  this._index = lunr(function() {
    this.ref('name');
    this.field('value');
    this.field('separatedName', { boost: 10 });

    for (let varName in searchVariables) {
      // Skip overrides
      if (
        varName.indexOf('--spectrum-global') === 0 ||
        varName.indexOf('--spectrum-alias') === 0 ||
        varName.indexOf('--spectrum-semantic') === 0
      ) {
        this.add({
          name: varName,
          separatedName: varName.replace(/-/g, ' '),
          value: searchVariables[varName]
        });
      }
    }
  });
};

CSSVariableEditor.prototype._handleClick = function(event) {
  if (event.target.closest('.js-saveButton')) {
    this.downloadChangedSheets(this.filenameField.value);
    event.preventDefault();
  }
};

CSSVariableEditor.prototype._handleEditorChange = function(event) {
  // Update sheet
  let input = event.target;
  if (input.matches('.CSSVariableEditor-variableField')) {
    let sheetName = input.getAttribute('data-sheetName');
    let varName = input.getAttribute('data-varName');
    let value = input.value;
    let preview = input.parentNode.querySelector('.CSSVariableEditor-variableFieldPreview');

    // Skip halfwritten variables
    if (value.indexOf('var(') === 0 && value.substr(-1) !== ')') {
      return;
    }

    preview.innerHTML = DelegatedAutocomplete.templates.value(this.resolveVariable(stripVar(value)), value, this.getVariableChain(varName));
    CSSVariableEditor.log(`Changing ${sheetName}:${varName} to ${value}`);
    this.variables.set(sheetName, varName, value);

    let disabled = Object.keys(this.variables.changed).length === 0;
    this.saveButton.toggleAttribute('disabled', disabled);
    this.filenameField.toggleAttribute('disabled', disabled);
  }
};

CSSVariableEditor.prototype.getChangedSheet = function() {
  let selectors = {};
  for (let sheetName in this.variables.changed) {
    let sheet = this.variables.changed[sheetName];
    for (let varName in sheet) {
      let entry = sheet[varName];
      selectors[entry.selector] = selectors[entry.selector] || {};
      selectors[entry.selector][entry.property] = entry.value;
    }
  }

  let cssText = '';
  for (let selectorName in selectors) {
    let rules = selectors[selectorName];
    cssText += `
${selectorName} {
${Object.keys(rules).map(property => `  ${property}: ${rules[property]};`).join('\n')}
}
`;
  }

  // create anchor with blob?

  return cssText;
};

CSSVariableEditor.prototype.downloadChangedSheets = function(filename) {
  if (!filename.match(/\.css$/)) {
    filename = `${fileName}.css`;
  }
  return download(filename, this.getChangedSheet());
};

CSSVariableEditor.prototype._handleLoad = function() {
  this._drawEditors();

  let inspectCandidate = document.querySelector('.spectrum-CSSExample-example [class*=spectrum-]');
  if (inspectCandidate) {
    this.inspect(inspectCandidate);
  }
  else {
    this.stopInspecting();
  }
};

CSSVariableEditor.prototype._handleFastLoad = function() {
  this.variables.getSheets();
  this._handleLoad();
};

function DelegatedAutocomplete(editor) {
  this._editor = editor;
  this.container = editor.container;

  var template = document.createElement('div');
  template.innerHTML = DelegatedAutocomplete.templates.base();

  this.popover = template.querySelector('.js-popover');
  this.searchResults = template.querySelector('.js-searchResults');

  this.primarySection = this.container.firstElementChild;
  this.primarySection.addEventListener('scroll', throttle(this.hideResults.bind(this), 2000));

  this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
  this.container.addEventListener('keyup', this.handleKeyUp.bind(this));
  this.container.addEventListener('focusout', this.handleFocusOut.bind(this));
  this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
  this.container.addEventListener('click', this.handleClick.bind(this));

  this.popover.addEventListener('keydown', this.handlePopoverNavigation.bind(this));
  this.popover.addEventListener('click', this.handleListClick.bind(this));
  this.popover.addEventListener('focusin', this.handleListInteraction.bind(this));
  this.popover.addEventListener('mouseenter', this.handleListInteraction.bind(this));
  this.popover.addEventListener('keydown', this.handleListInteraction.bind(this));
  this.popover.addEventListener('focusout', this.handleFocusOut.bind(this));

  window.addEventListener('DOMContentLoaded', this._attach.bind(this));
}

DelegatedAutocomplete.templates = {
  base: function() {
    return `
<div class="spectrum-Popover is-open spectrum-Site-searchResults js-popover">
  <ul class="spectrum-Menu js-searchResults">
  </ul>
</div>
`;
  },
  value: function(value, varName, chain) {
    let markup = `
<div class="CSSVariableEditor-value u-tooltip-showOnHover">
  <div class="spectrum-Tooltip spectrum-Tooltip--bottomLeft">
    <span class="spectrum-Tooltip-label">${chain.join('<br>')}</span>
    <span class="spectrum-Tooltip-tip"></span>
  </div>
`;
    if (value.indexOf('rgb') === 0) {
      markup += `<div class="CSSVariableEditor-swatch" style="background-color: ${value}"></div>`;
    }
    else if (value === 'transparent') {
      markup += `<div class="CSSVariableEditor-swatch CSSVariableEditor-swatch--transparent"></div>`;
    }
    else if (value[0] === '(') {
      // Animation
      markup += `
<svg class="spectrum-Icon spectrum-Icon--sizeXXS" focusable="false" aria-hidden="true" aria-label="Forward">
  <use xlink:href="#spectrum-icon-18-Forward"></use>
</svg>`;
    }
    else if (value.length > 5) {
      // Too long
      markup += `
<svg class="spectrum-Icon spectrum-Icon--sizeXXS" focusable="false" aria-hidden="true" aria-label="More">
  <use xlink:href="#spectrum-icon-18-More"></use>
</svg>`;
    }
    else {
      markup += value;
    }

    markup += '</div>';

    return markup;
  },
  autocomplete: function(results) {
    return results.map(result => `
<li class="spectrum-Menu-item" role="option" tabindex="0" value="${result.ref}">
  <span class="spectrum-Menu-itemLabel">${result.ref}</span>
  <span class="spectrum-Menu-itemDetail">${DelegatedAutocomplete.templates.value(this._editor.resolveVariable(result.ref), result.ref, this._editor.getVariableChain(result.ref))}</span>
</li>`).join('\n');
  }
};

DelegatedAutocomplete.prototype.handleFocusIn = function(e) {
  if (e.target.matches('.CSSVariableEditor-variableField')) {
    if (this.input !== e.target) {
      this.hideResults();
    }
    this.input = e.target;
  }
};

DelegatedAutocomplete.prototype.handleFocusOut = function(e) {
  if (this.popover.contains(e.relatedTarget)) {
    return;
  }

  this.hideResults();
};

DelegatedAutocomplete.prototype.handleReset = function(event) {
  this.hideResults();
  this.input.focus();
  document.execCommand('selectAll');
  document.execCommand('delete', false);
};

DelegatedAutocomplete.prototype.hideResults = function(event) {
  // this.form.setAttribute('aria-expanded', 'false');
  this.popover.classList.remove('is-open');
  this._resultsVisible = false;
};

DelegatedAutocomplete.prototype.showResults = function(event) {
  // this.form.setAttribute('aria-expanded', 'true');
  var inputRect = this.input.getBoundingClientRect();
  this.popover.style.top = `${inputRect.bottom + 10}px`;
  this.popover.style.left = `${inputRect.left}px`;
  this.popover.style.right = `${window.innerWidth - inputRect.right}px`;
  this.popover.style.maxHeight = `calc(${((window.innerHeight - inputRect.bottom - 10) / window.innerHeight) * 100}vh - 10px)`;
  this.popover.classList.add('is-open');
  this.popover.scrollTo(0, 0);

  let firstItem = this.popover.querySelector('.spectrum-Menu-item');
  if (firstItem) {
    // Provide some visual indication that we will navigate here on enter
    firstItem.classList.add('is-highlighted');
  }
  this._resultsVisible = true;
};

DelegatedAutocomplete.prototype.handleListInteraction = function(e) {
  let firstItem = this.popover.querySelector('.spectrum-Menu-item');
  if (firstItem) {
    firstItem.classList.remove('is-highlighted');
  }
};

DelegatedAutocomplete.prototype.handleClick = function(e) {
  if (e.target.closest('.CSSVariableEditor-value')) {
    let container = e.target.closest('.CSSVariableEditor-variableFieldContainer');
    if (container) {
      let input = container.querySelector('.CSSVariableEditor-variableField');
      if (input) {
        this.input = input;
        this.showAndHighlightFirstItem();
      }
    }
  }
};

DelegatedAutocomplete.prototype.showAndHighlightFirstItem = function(e) {
  this.search(this.input.value, this.input.getAttribute('data-varName'));
  let firstItem = this.popover.querySelector('.spectrum-Menu-item');
  if (firstItem) {
    this.showResults();
    firstItem.focus();
  }
};

DelegatedAutocomplete.prototype.handleListClick = function(e) {
  let menuItem = e.target.closest('.spectrum-Menu-item');
  if (menuItem) {
    this.setValue(menuItem.getAttribute('value'));
  }
};

DelegatedAutocomplete.prototype.setValue = function(value) {
  this.input.focus();
  document.execCommand('selectAll');
  document.execCommand('insertText', false, `var(${value})`);
  var changeEvent = new Event('change', { bubbles: true });
  this.input.dispatchEvent(changeEvent);
  this.hideResults();
  setTimeout(() => {
    this.input.focus();
  }, 20);
};

DelegatedAutocomplete.prototype.handlePopoverNavigation = function(e) {
  let currentItem = document.activeElement;
  if (currentItem.classList.contains('spectrum-Menu-item')) {
    let items = Array.prototype.slice.call(this.popover.querySelectorAll('.spectrum-Menu-item'));
    let currentItemIndex = items.indexOf(currentItem);
    let newItemIndex = -1;
    if (e.key === 'ArrowDown') {
      newItemIndex = currentItemIndex + 1 < items.length ? currentItemIndex + 1 : 0;
    }
    else if (e.key === 'ArrowUp') {
      newItemIndex = currentItemIndex - 1 >= 0 ? currentItemIndex - 1 : items.length - 1;
    }
    else if (e.key === 'Home') {
      newItemIndex = 0;
    }
    else if (e.key === 'End') {
      newItemIndex = items.length - 1;
    }
    else if (e.key === 'Escape') {
      this.input.focus();
      this.hideResults();
    }
    else if (e.key === 'Enter') {
      this.setValue(items[currentItemIndex].getAttribute('value'));
    }
    if (newItemIndex !== -1) {
      items[newItemIndex].focus();

      // Don't scroll the list
      e.preventDefault();
    }
  }
};

DelegatedAutocomplete.prototype._attach = function() {
  document.body.appendChild(this.popover);
};

DelegatedAutocomplete.prototype.handleKeyDown = function(e) {
  if (!e.target.matches('.CSSVariableEditor-variableField')) {
    return;
  }

  let input = e.target;
  this.input = input;

  if (e.key === 'ArrowDown') {
    this.showAndHighlightFirstItem();
    e.preventDefault();
  }
  else if (e.key === 'Escape') {
    this.handleReset();
  }
};

DelegatedAutocomplete.prototype.handleKeyUp = function(e) {
  if (!e.target.matches('.CSSVariableEditor-variableField')) {
    return;
  }

  let input = e.target;
  this.input = input;

  if (e.key === 'Enter') {
    if (this._resultsVisible) {
      let firstItem = this.popover.querySelector('.spectrum-Menu-item');
      if (firstItem) {
        firstItem.click();
        this.input.blur();
        this.hideResults();
      }
    }
    e.preventDefault();
  }
  else if (e.key !== 'Escape' && e.key !== 'Tab' && !(e.ctrlKey || e.metaKey) && e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Shift') {
    if (this.input.value.length === 0) {
      this.handleReset();
    }
    else {
      this.search(input.value, input.getAttribute('data-varName'));
    }
  }
};

DelegatedAutocomplete.prototype.search = function(val, varName) {
  if (val.length > 1) {
    let results = this._editor.search(val, varName);

    if (results.length > 0) {
      let markup = DelegatedAutocomplete.templates.autocomplete.call(this, results);
      this.searchResults.innerHTML = markup;
      this.showResults();
    }
  }
};

let editor = new CSSVariableEditor();
