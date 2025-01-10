// sidebar.js
class Sidebar {
    constructor() {
        this.hamburgerButton = document.querySelector('.hamburger-button');
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('#mainContent');
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 漢堡按鈕點擊事件
        this.hamburgerButton?.addEventListener('click', () => this.toggleSidebar());

        // 點擊外部關閉選單
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.sidebar.contains(e.target) && 
                !this.hamburgerButton.contains(e.target)) {
                this.toggleSidebar();
            }
        });
    }

    toggleSidebar() {
        this.isOpen = !this.isOpen;
        this.sidebar.classList.toggle('active');
        this.hamburgerButton.classList.toggle('active');
        this.mainContent.classList.toggle('shifted');
    }
}

// 創建並導出實例
const sidebar = new Sidebar();
export default sidebar;