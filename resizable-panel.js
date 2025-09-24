/**
 * Class representing resizable three horizontal panels with
 * two vertical resize bars between them (left–main–right).
 * * Handles mouse and touch dragging to dynamically adjust panel widths
 * and stores the state in localStorage for persistence.
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

        this._boundHandleMove = this.handleMove.bind(this);
        this._boundStopResizing = this.stopResizing.bind(this);

        this.leftPanelWidth = 1;
        this.mainPanelWidth = 1;
        this.rightPanelWidth = 1;

        this.init();
    }

    /**
     * Initialize event listeners and load stored panel widths.
     */
    init() {
        // Mouse and touch event listeners for left resizer
        this.resizeBarLeft.addEventListener('mousedown', (e) => this.startResizing(e, 'left'));
        this.resizeBarLeft.addEventListener('touchstart', (e) => this.startResizing(e, 'left'));

        // Mouse and touch event listeners for right resizer
        this.resizeBarRight.addEventListener('mousedown', (e) => this.startResizing(e, 'right'));
        this.resizeBarRight.addEventListener('touchstart', (e) => this.startResizing(e, 'right'));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.loadPanelWidths();
    }

    /**
     * Disable text selection for smoother dragging experience.
     * * @param {HTMLElement} element - The target element.
     */
    disableSelection(element) {
        element.style.userSelect = 'none';
    }

    /**
     * Enable text selection after resizing stops.
     * * @param {HTMLElement} element - The target element.
     */
    enableSelection(element) {
        element.style.userSelect = 'auto';
    }

    /**
     * Start resizing when the mouse is pressed or a touch starts.
     * * @param {MouseEvent|TouchEvent} e - The event.
     * @param {string} resizerType - Which resizer is being used: 'left' or 'right'.
     */
    startResizing(e, resizerType) {
        e.preventDefault(); // Prevent default browser behavior like scrolling
        this.isResizing = true;
        this.hasResized = false;
        this.currentResizer = resizerType;

        this.lastDownX = e.clientX || e.touches[0].clientX;

        this.disableSelection(this.leftPanel);
        this.disableSelection(this.mainPanel);
        this.disableSelection(this.rightPanel);

        // Add mouse and touch event listeners
        this.element.addEventListener('mousemove', this._boundHandleMove);
        this.element.addEventListener('mouseup', this._boundStopResizing);
        this.element.addEventListener('touchmove', this._boundHandleMove);
        this.element.addEventListener('touchend', this._boundStopResizing);
    }

    /**
     * Handle mouse or touch movement during resizing.
     * Updates panel widths dynamically.
     * * @param {MouseEvent|TouchEvent} e - The event.
     */
    handleMove(e) {
        if (!this.isResizing) return;

        let clientX = e.clientX || e.touches[0].clientX;
        let offset = clientX - this.lastDownX;
        if (offset !== 0) this.hasResized = true;

        let parentWidth = this.element.offsetWidth;

        if (this.currentResizer === 'left') {
            let newLeftWidth = this.leftPanel.offsetWidth + offset;
            let newMainWidth = this.mainPanel.offsetWidth - offset;

            // Limit widths
            if (newLeftWidth < this.minWidth || newMainWidth < this.minWidth) return;

            this.leftPanel.style.width = newLeftWidth + 'px';
            this.mainPanel.style.width = newMainWidth + 'px';

            this.lastDownX = clientX;

            this.leftPanelWidth = newLeftWidth;
            this.mainPanelWidth = newMainWidth;
            this.rightPanelWidth = parentWidth - newLeftWidth - newMainWidth - 10;
            this.onResize(this.leftPanelWidth, this.mainPanelWidth, this.rightPanelWidth);

            localStorage.setItem(this.localStorageKeyLeft, newLeftWidth);
        } else if (this.currentResizer === 'right') {
            let newMainWidth = this.mainPanel.offsetWidth + offset;
            let newRightWidth = this.rightPanel.offsetWidth - offset;

            if (newMainWidth < this.minWidth || newRightWidth < this.minWidth) return;

            this.mainPanel.style.width = newMainWidth + 'px';
            this.rightPanel.style.width = newRightWidth + 'px';

            this.lastDownX = clientX;

            this.mainPanelWidth = newMainWidth;
            this.rightPanelWidth = newRightWidth;
            this.onResize(this.leftPanelWidth, this.mainPanelWidth, this.rightPanelWidth);

            localStorage.setItem(this.localStorageKeyMain, newMainWidth);
        }
    }

    /**
     * Stop resizing and clean up event listeners.
     */
    stopResizing() {
        this.isResizing = false;
        this.currentResizer = null;

        // Remove mouse and touch event listeners
        this.element.removeEventListener('mousemove', this._boundHandleMove);
        this.element.removeEventListener('mouseup', this._boundStopResizing);
        this.element.removeEventListener('touchmove', this._boundHandleMove);
        this.element.removeEventListener('touchend', this._boundStopResizing);

        this.enableSelection(this.leftPanel);
        this.enableSelection(this.mainPanel);
        this.enableSelection(this.rightPanel);
    }

    /**
     * Resize panels programmatically with stored or default values.
     * * @param {string|number} savedLeftWidth - Width of the left panel (px).
     * @param {string|number} savedMainWidth - Width of the main panel (px).
     */
    doResize(savedLeftWidth, savedMainWidth) {
        let parentWidth = this.element.offsetWidth;
        let leftWidth = parseInt(savedLeftWidth) || 200;
        let mainWidth = parseInt(savedMainWidth) || 400;
        let rightWidth = parentWidth - leftWidth - mainWidth - 10;

        if (leftWidth < this.minWidth) leftWidth = this.minWidth;
        if (mainWidth < this.minWidth) mainWidth = this.minWidth;
        if (rightWidth < this.minWidth) rightWidth = this.minWidth;

        this.leftPanel.style.width = leftWidth + 'px';
        this.mainPanel.style.width = mainWidth + 'px';
        this.rightPanel.style.width = rightWidth + 'px';

        this.leftPanelWidth = leftWidth;
        this.mainPanelWidth = mainWidth;
        this.rightPanelWidth = rightWidth;

        this.onResize(this.leftPanelWidth, this.mainPanelWidth, this.rightPanelWidth);
    }

    /**
     * Get stored left panel width from localStorage.
     * * @returns {string} The saved left panel width in pixels.
     */
    getLeftPanelWidth() {
        return localStorage.getItem(this.localStorageKeyLeft) || '200';
    }

    /**
     * Get stored main panel width from localStorage.
     * * @returns {string} The saved main panel width in pixels.
     */
    getMainPanelWidth() {
        return localStorage.getItem(this.localStorageKeyMain) || '400';
    }

    /**
     * Load panel widths from localStorage and apply them.
     */
    loadPanelWidths() {
        this.doResize(this.getLeftPanelWidth(), this.getMainPanelWidth());
    }

    /**
     * Handle window resize event.
     * Ensures panels remain within valid size.
     */
    onWindowResize() {
        this.loadPanelWidths();
    }

    /**
     * Callback triggered when resizing occurs.
     * Can be overridden for custom behavior.
     * * @param {number} leftPanelWidth - Current left panel width in px.
     * @param {number} mainPanelWidth - Current main panel width in px.
     * @param {number} rightPanelWidth - Current right panel width in px.
     */
    onResize(leftPanelWidth, mainPanelWidth, rightPanelWidth) {

    }
}

/**
 * Class representing resizable vertical panels inside a container.
 * Allows resizing between a top panel and a bottom panel
 * using a horizontal resize bar.
 */
class ResizableVertical {
    /**
     * Create a resizable vertical split.
     * * @param {string} selector - Parent container selector.
     * @param {string} topSelector - Selector for the top panel element.
     * @param {string} bottomSelector - Selector for the bottom panel element.
     * @param {string} resizeBarSelector - Selector for the horizontal resize bar.
     * @param {number} [minHeight=100] - Minimum height (in px) allowed for each panel.
     */
    constructor(selector, topSelector, bottomSelector, resizeBarSelector, minHeight = 100) {
        this.selector = document.querySelector(selector);
        this.topPanel = document.querySelector(topSelector);
        this.bottomPanel = document.querySelector(bottomSelector);
        this.resizeBar = document.querySelector(resizeBarSelector);
        this.minHeight = minHeight;

        this.isResizing = false;
        this.lastDownY = 0;

        this._boundMouseMove = this.handleMove.bind(this);
        this._boundStop = this.stopResizing.bind(this);

        this.init();
    }

    /**
     * Initialize event listeners for vertical resizing.
     */
    init() {
        // Add mouse and touch event listeners
        this.resizeBar.addEventListener('mousedown', (e) => this.startResizing(e));
        this.resizeBar.addEventListener('touchstart', (e) => this.startResizing(e));
    }

    /**
     * Start resizing when the mouse is pressed or a touch starts.
     * * @param {MouseEvent|TouchEvent} e - The event.
     */
    startResizing(e) {
        e.preventDefault(); // Prevent default browser behavior like scrolling
        this.isResizing = true;
        this.lastDownY = e.clientY || e.touches[0].clientY;

        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundStop);
        document.addEventListener('touchmove', this._boundMouseMove);
        document.addEventListener('touchend', this._boundStop);

        this.topPanel.style.userSelect = 'none';
        this.bottomPanel.style.userSelect = 'none';
    }

    /**
     * Handle mouse or touch movement during vertical resizing.
     * Adjusts top and bottom panel heights dynamically.
     * * @param {MouseEvent|TouchEvent} e - The event.
     */
    handleMove(e) {
        if (!this.isResizing) return;

        let clientY = e.clientY || e.touches[0].clientY;
        const offset = clientY - this.lastDownY;

        let newTopHeight = this.topPanel.offsetHeight + offset;
        let newBottomHeight = this.selector.offsetHeight - newTopHeight;

        if (newTopHeight < this.minHeight) {
            newTopHeight = this.minHeight;
            newBottomHeight = this.selector.offsetHeight - newTopHeight;
        }
        if (newBottomHeight < this.minHeight) {
            newBottomHeight = this.minHeight;
            newTopHeight = this.selector.offsetHeight - newBottomHeight;
        }

        this.topPanel.style.height = newTopHeight + 'px';
        this.bottomPanel.style.height = newBottomHeight + 'px';

        this.onResize(newTopHeight, newBottomHeight);

        this.lastDownY = clientY;
    }

    /**
     * Stop vertical resizing and clean up event listeners.
     */
    stopResizing() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundStop);
        document.removeEventListener('touchmove', this._boundMouseMove);
        document.removeEventListener('touchend', this._boundStop);

        this.topPanel.style.userSelect = 'auto';
        this.bottomPanel.style.userSelect = 'auto';
    }

    /**
     * Callback triggered when vertical resizing occurs.
     * Can be overridden for custom behavior.
     * * @param {number} topPanelHeight - Current top panel height in px.
     * @param {number} bottomPanelHeight - Current bottom panel height in px.
     */
    onResize(topPanelHeight, bottomPanelHeight) {

    }
}