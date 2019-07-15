/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
/* eslint-disable no-unused-vars */
/* global document, window, Element, loadIcons, URLSearchParams */

window.addEventListener('DOMContentLoaded', function() {
  var switcher = new SpectrumSwitcher();

  function selectNavItem(href) {
    var selectedNavItem = document.querySelector('.spectrum-SideNav-item.is-selected')
    if (selectedNavItem) {
      selectedNavItem.classList.remove('is-selected');
    }

    var navLink = document.querySelector('[href="' + href + '"]');
    if (navLink && navLink.parentNode.classList.contains('spectrum-SideNav-item')) {
      var navItem = navLink.parentNode;
      navItem.classList.add('is-selected');
    }
  }

  function loadPage(href) {
    function handleLoad() {
      var template = document.createElement('template');
      template.innerHTML = this.responseText;

      var newMainContainer = template.content.querySelector('.spectrum-Site-mainContainer');

      if (newMainContainer) {
        var oldMainContainer = document.querySelector('.spectrum-Site-mainContainer');
        oldMainContainer.parentNode.insertBefore(newMainContainer, oldMainContainer);
        oldMainContainer.parentNode.removeChild(oldMainContainer);

        // Load in extra depsbeforeLink
        var currentDependenciesNodeList = document.querySelectorAll('[data-dependency]');
        var currentDependencies = Array.prototype.slice.call(currentDependenciesNodeList).map(function(link) {
          return link.getAttribute('data-dependency');
        });

        var newDependencies = template.content.querySelectorAll('[data-dependency]');
        var beforeLink = currentDependenciesNodeList[currentDependenciesNodeList.length - 1];
        Array.prototype.forEach.call(newDependencies, function(link) {
          if (currentDependencies.indexOf(link.getAttribute('data-dependency')) === -1) {
            document.head.insertBefore(link, beforeLink.nextElementSibling);
            beforeLink = link;
          }
        });
      }
      else {
        console.error('Could not find main container within loaded HTML file');
      }
    }

    var req = new XMLHttpRequest();
    req.addEventListener('load', handleLoad);
    req.open('GET', './' + href);
    req.send();
  }

  function navigate(href) {
    window.history.pushState({}, '', href);

    selectNavItem(href);

    loadPage(href);
  }

  document.addEventListener('click', function(event) {
    var target = event.target.closest('a');
    if (target && target.classList.contains('js-fastLoad')) {
      navigate(target.getAttribute('href'));
      event.preventDefault();
    }
  });
});