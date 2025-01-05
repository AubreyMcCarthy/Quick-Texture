// Example usage
const dummytools = [
    {
        name: 'Crop Tool',
        aliases: ['trim', 'cut', 'resize'],
        description: 'Crop or trim parts of an image',
        action: () => console.log('Crop tool activated')
    },
    {
        name: 'Color Adjust',
        aliases: ['brightness', 'contrast', 'saturation'],
        description: 'Adjust image colors, brightness, and contrast',
        action: () => console.log('Color adjustment activated')
    },
    {
        name: 'Magic Wand',
        aliases: ['select', 'auto-select'],
        description: 'Automatically select similar areas',
        action: () => console.log('Magic wand activated')
    },
    {
        name: 'Text Tool',
        aliases: ['type', 'typography'],
        description: 'Add and edit text on images',
        action: () => console.log('Text tool activated')
    }
];

export class SearchGlass {
    // constructor() {
    //     this.tools = dummytools;
    //     this.selectedIndex = -1;
    //     this.isOpen = false;

    //     this.initialize();
    //     this.setupEventListeners();
    // }
    constructor(tools) {
        this.tools = tools;
        this.selectedIndex = -1;
        this.isOpen = false;

        this.initialize();
        this.setupEventListeners();
    }

    initialize() {

        // Create and inject HTML
        const markup = `
        <div class="spotlight-overlay">
          <div class="spotlight-container">
            <div class="spotlight-search-wrapper">
              <div class="spotlight-search-icon">🔍</div>
              <input type="text" class="spotlight-search" placeholder="Search tools... (press ↑↓ to navigate)">
            </div>
            <div class="spotlight-results"></div>
          </div>
        </div>
      `;

        const container = document.createElement('div');
        container.innerHTML = markup;
        document.body.appendChild(container);

        // Store element references
        this.overlay = document.querySelector('.spotlight-overlay');
        this.searchInput = document.querySelector('.spotlight-search');
        this.resultsContainer = document.querySelector('.spotlight-results');
    }

    setupEventListeners() {
        // Keyboard shortcut (Cmd/Ctrl + K)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Search input handling
        this.searchInput.addEventListener('input', () => this.handleSearch());

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveSelection(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveSelection(-1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.activateSelected();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        // Trigger reflow to enable transition
        this.overlay.offsetHeight;
        this.overlay.classList.add('open');
        this.searchInput.value = '';
        this.searchInput.focus();
        this.handleSearch();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('open');
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 200); // Match transition duration
        this.selectedIndex = -1;
    }

    handleSearch() {
        const query = this.searchInput.value.toLowerCase();
        const filteredTools = this.tools.filter(tool => {
            const nameMatch = tool.name.toLowerCase().includes(query);
            const aliasMatch = tool.aliases.some(alias =>
                alias.toLowerCase().includes(query)
            );
            return nameMatch || aliasMatch;
        });

        this.renderResults(filteredTools);
        this.selectedIndex = filteredTools.length > 0 ? 0 : -1;
        this.updateSelection();
    }

    renderResults(results) {
        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
          <div class="spotlight-empty">
            No matching tools found
          </div>
        `;
            return;
        }

        this.resultsContainer.innerHTML = results.map((tool, index) => `
        <div class="spotlight-item" data-index="${index}">
          <div class="spotlight-item-name">${tool.name}</div>
          <div class="spotlight-item-description">${tool.description}</div>
        </div>
      `).join('');

        // Add click handlers to results
        this.resultsContainer.querySelectorAll('.spotlight-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.activateSelected();
            });

            item.addEventListener('mouseover', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
        });
    }

    moveSelection(direction) {
        const items = this.resultsContainer.querySelectorAll('.spotlight-item');
        if (items.length === 0) return;

        this.selectedIndex = (this.selectedIndex + direction + items.length) % items.length;
        this.updateSelection();

        // Scroll selected item into view
        const selectedItem = items[this.selectedIndex];
        selectedItem.scrollIntoView({ block: 'nearest' });
    }

    updateSelection() {
        this.resultsContainer.querySelectorAll('.spotlight-item').forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    activateSelected() {
        const items = this.resultsContainer.querySelectorAll('.spotlight-item');
        if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
            const selectedTool = this.tools.filter(tool => {
                const query = this.searchInput.value.toLowerCase();
                return tool.name.toLowerCase().includes(query) ||
                    tool.aliases.some(alias => alias.toLowerCase().includes(query));
            })[this.selectedIndex];

            if (selectedTool) {
                selectedTool.action();
                this.close();
            }
        }
    }
}


