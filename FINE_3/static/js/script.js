// script.js
import Auth from './auth.js';
import Calendar from './calendar.js';
import TicketManager from './ticket.js';
import PrintQueue from './print-queue.js';
import ViewManager from './view-manager.js';

class App {
    constructor() {
        this.modules = {};
        this.init();
    }

    async init() {
        // 確保按正確順序初始化模組
        try {
            // 首先初始化 PrintQueue（因為其他模組依賴它）
            this.modules.printQueue = new PrintQueue();
            window.printQueue = this.modules.printQueue;

            // 然後初始化其他模組
            this.modules.auth = new Auth();
            this.modules.calendar = new Calendar();
            this.modules.tickets = new TicketManager();
            
            // ViewManager 最後初始化，因為它依賴其他模組
            this.modules.viewManager = new ViewManager();

            // 將模組添加到全局範圍
            window.auth = this.modules.auth;
            window.calendar = this.modules.calendar;
            window.ticketManager = this.modules.tickets;
            window.viewManager = this.modules.viewManager;

            // 綁定模組之間的事件監聽器
            this.bindModuleEvents();

            // 根據登入狀態初始化視圖
            const user = localStorage.getItem('user');
            if (user) {
                this.modules.viewManager.switchView('tickets');
            } else {
                this.modules.viewManager.hideAllViews();
            }

        } catch (error) {
            console.error('初始化失敗:', error);
        }
    }

    bindModuleEvents() {
        // 監聽視圖切換事件
        document.querySelectorAll('.menu-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.getAttribute('data-view');
                if (view === 'printQueue') {
                    // 確保待列印區顯示最新數據
                    this.modules.printQueue.render();
                }
            });
        });
    }
}

// 當 DOM 載入完成後初始化應用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// 導出工具函數
export const utils = {
    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg transform translate-y-[-100%] opacity-0 transition-all duration-300
            ${type === 'error' ? 'bg-red-100 text-red-700 border-l-4 border-red-500' : 'bg-green-100 text-green-700 border-l-4 border-green-500'}`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translate(0)';
            notification.style.opacity = '1';
        }, 50);

        setTimeout(() => {
            notification.style.transform = 'translate-y-[-100%]';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};