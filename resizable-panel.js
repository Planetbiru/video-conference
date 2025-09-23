/**
 * Class representing resizable three panels with two resize bars between them.
 */
class ResizableThreePanels {
    /**
     * @param {string} selector - Parent container selector
     * @param {string} leftPanelSelector - Left panel selector
     * @param {string} mainPanelSelector - Main panel selector
     * @param {string} rightPanelSelector - Right panel selector
     * @param {string} resizeBarLeftSelector - Selector for the left resize bar
     * @param {string} resizeBarRightSelector - Selector for the right resize bar
     * @param {number} [minWidth=100] - Minimum width for each panel
     */
    constructor(selector, leftPanelSelector, mainPanelSelector, rightPanelSelector, resizeBarLeftSelector, resizeBarRightSelector, minWidth = 100) {
        this.selector = selector;
        this.element = document.querySelector(this.selector);
        this.leftPanel = document.querySelector(`${selector} ${leftPanelSelector}`);
        this.mainPanel = document.querySelector(`${selector} ${mainPanelSelector}`);
        this.rightPanel = document.querySelector(`${selector} ${rightPanelSelector}`);
        this.resizeBarLeft = document.querySelector(`${selector} ${resizeBarLeftSelector}`);
        this.resizeBarRight = document.querySelector(`${selector} ${resizeBarRightSelector}`);
        this.minWidth = minWidth;

        this.isResizing = false;
        this.lastDownX = 0;
        this.currentResizer = null;

        this.localStorageKeyLeft = `${this.selector}leftPanelWidth`;
        this.localStorageKeyMain = `${this.selector}mainPanelWidth`;

        this._boundHandleMouseMove = this.handleMouseMove.bind(this);
        this._boundStopResizing = this.stopResizing.bind(this);

        this.init();
    }

    init() {
        // Start resizing for left resizer
        this.resizeBarLeft.addEventListener('mousedown', (e) => this.startResizing(e, 'left'));

        // Start resizing for right resizer
        this.resizeBarRight.addEventListener('mousedown', (e) => this.startResizing(e, 'right'));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.loadPanelWidths();
    }

    disableSelection(element) {
        element.style.mozUserSelect = 'none';
        element.style.msUserSelect = 'none';
        element.style.userSelect = 'none';
    }

    enableSelection(element) {
        element.style.mozUserSelect = 'auto';
        element.style.msUserSelect = 'auto';
        element.style.userSelect = 'auto';
    }

    startResizing(e, resizerType) {
        console.log('startResizing');
        this.isResizing = true;
        this.hasResized = false;
        this.currentResizer = resizerType;
        this.lastDownX = e.clientX;

        this.disableSelection(this.leftPanel);
        this.disableSelection(this.mainPanel);
        this.disableSelection(this.rightPanel);

        this.element.addEventListener('mousemove', this._boundHandleMouseMove);
        this.element.addEventListener('mouseup', this._boundStopResizing);
    }

    handleMouseMove(e) {
        if (!this.isResizing) return;

        let offset = e.clientX - this.lastDownX;
        if (offset !== 0) this.hasResized = true;

        let parentWidth = this.element.offsetWidth;

        if (this.currentResizer === 'left') {
            let newLeftWidth = this.leftPanel.offsetWidth + offset;
            let newMainWidth = this.mainPanel.offsetWidth - offset;

            // Limit widths
            if (newLeftWidth < this.minWidth || newMainWidth < this.minWidth) return;

            this.leftPanel.style.width = newLeftWidth + 'px';
            this.mainPanel.style.width = newMainWidth + 'px';

            this.lastDownX = e.clientX;

            localStorage.setItem(this.localStorageKeyLeft, newLeftWidth);
        } else if (this.currentResizer === 'right') {
            let newMainWidth = this.mainPanel.offsetWidth + offset;
            let newRightWidth = this.rightPanel.offsetWidth - offset;

            if (newMainWidth < this.minWidth || newRightWidth < this.minWidth) return;

            this.mainPanel.style.width = newMainWidth + 'px';
            this.rightPanel.style.width = newRightWidth + 'px';

            this.lastDownX = e.clientX;

            localStorage.setItem(this.localStorageKeyMain, newMainWidth);
        }
    }

    stopResizing() {
        this.isResizing = false;
        this.currentResizer = null;

        this.element.removeEventListener('mousemove', this._boundHandleMouseMove);
        this.element.removeEventListener('mouseup', this._boundStopResizing);

        this.enableSelection(this.leftPanel);
        this.enableSelection(this.mainPanel);
        this.enableSelection(this.rightPanel);
    }

    doResize(savedLeftWidth, savedMainWidth) {
        let parentWidth = this.element.offsetWidth;
        let leftWidth = parseInt(savedLeftWidth) || 200;
        let mainWidth = parseInt(savedMainWidth) || 400;
        let rightWidth = parentWidth - leftWidth - mainWidth - 20; // 2 bars ~ 10px each

        if (leftWidth < this.minWidth) leftWidth = this.minWidth;
        if (mainWidth < this.minWidth) mainWidth = this.minWidth;
        if (rightWidth < this.minWidth) rightWidth = this.minWidth;

        this.leftPanel.style.width = leftWidth + 'px';
        this.mainPanel.style.width = mainWidth + 'px';
        this.rightPanel.style.width = rightWidth + 'px';
    }

    getLeftPanelWidth() {
        return localStorage.getItem(this.localStorageKeyLeft) || '200';
    }

    getMainPanelWidth() {
        return localStorage.getItem(this.localStorageKeyMain) || '400';
    }

    loadPanelWidths() {
        this.doResize(this.getLeftPanelWidth(), this.getMainPanelWidth());
    }

    onWindowResize() {
        this.loadPanelWidths();
    }
}


class ResizableVertical {
    constructor(topSelector, bottomSelector, resizeBarSelector, minHeight = 100) {
        this.topPanel = document.querySelector(topSelector);
        this.bottomPanel = document.querySelector(bottomSelector);
        this.resizeBar = document.querySelector(resizeBarSelector);
        this.minHeight = minHeight;

        this.isResizing = false;
        this.lastDownY = 0;

        this._boundMouseMove = this.handleMouseMove.bind(this);
        this._boundStop = this.stopResizing.bind(this);

        this.init();
    }

    init() {
        this.resizeBar.addEventListener('mousedown', (e) => this.startResizing(e));
    }

    startResizing(e) {
        this.isResizing = true;
        this.lastDownY = e.clientY;

        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundStop);

        this.topPanel.style.userSelect = 'none';
        this.bottomPanel.style.userSelect = 'none';
    }

    handleMouseMove(e) {
        if (!this.isResizing) return;

        const offset = e.clientY - this.lastDownY;

        let newTopHeight = this.topPanel.offsetHeight + offset;
        let newBottomHeight = this.bottomPanel.offsetHeight - offset;

        if (newTopHeight < this.minHeight || newBottomHeight < this.minHeight) return;

        this.topPanel.style.height = newTopHeight + 'px';
        this.bottomPanel.style.height = newBottomHeight + 'px';

        this.lastDownY = e.clientY;
    }

    stopResizing() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundStop);

        this.topPanel.style.userSelect = 'auto';
        this.bottomPanel.style.userSelect = 'auto';
    }
}
