(function() {
  let offsetX = 0, offsetY = 0;
  let currentElement = null;
  let currentZIndex = 10;

  document.addEventListener('mousedown', startDragging);

  function finishDragging(e) {
    document.removeEventListener('mouseup', finishDragging);
    document.removeEventListener('mousemove', handleDrag);
    currentElement = null;
  }

  function handleDrag(e) {
    e.preventDefault();
    currentElement.style.top = (e.clientY - offsetY) + 'px';
    currentElement.style.left = (e.clientX - offsetX) + 'px';
  }

  function startDragging(e) {
    if (e.target.hasAttribute('dragHandle')) {
      // Find if the element or anyone up the tree is draggable
      let element = e.target.closest('[draggablePanel]');

      if (element) {
        e.preventDefault();
        currentElement = element;

        var rect = currentElement.getBoundingClientRect();

        offsetY = e.clientY - rect.top;
        offsetX = e.clientX - rect.left;

        currentElement.style.position = 'fixed';
        currentElement.style.zIndex = ++currentZIndex;
        document.body.appendChild(currentElement);

        if (currentElement.classList.contains('spectrum-Panel')) {
          currentElement.classList.add('spectrum-Panel--floating');
        }

        document.addEventListener('mouseup', finishDragging);
        document.addEventListener('mousemove', handleDrag);
      }
    }
  }
}());
