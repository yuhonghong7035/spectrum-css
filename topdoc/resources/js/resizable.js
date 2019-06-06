(function() {
  let startWidth = 0, startHeight = 0;
  let startX = 0, startY = 0;
  let currentElement = null;
  let direction = null;

  document.addEventListener('mousedown', startDragging);

  function finishDragging(e) {
    document.removeEventListener('mouseup', finishDragging);
    document.removeEventListener('mousemove', handleDrag);
    currentElement = null;
    direction = null;
  }

  function handleDrag(e) {
    e.preventDefault();

    if (direction === 'width') {
      currentElement.style.width = (startWidth + (startX - e.clientX)) + 'px';
    }
    else if (direction === 'height') {
      currentElement.style.height = (startHeight + (startY - e.clientY)) + 'px';
    }
  }

  function startDragging(e) {
    if (e.target.hasAttribute('resizable')) {
      let element = e.target;

      // Make sure the drag is on the border
      if (
        element.className.indexOf('--right') > 0 && e.offsetX <= 0 ||
        element.className.indexOf('--left') > 0 && e.offsetX > element.offsetWidth
      ) {
        direction = element.getAttribute('resizable');

        e.preventDefault();
        currentElement = element;

        startX = e.clientX;
        startY = e.clientY;

        if (direction === 'width') {
          startWidth = element.offsetWidth;
        }
        else if (direction === 'height') {
          startHeight = element.offsetHeight;
        }

        document.addEventListener('mouseup', finishDragging);
        document.addEventListener('mousemove', handleDrag);
      }
    }
  }
}());
