class ViewManager {
    constructor() {
        document.addEventListener('DOMContentLoaded', () => {
            this.init();
        });
    }

    init() {
        console.log('初始化 ViewManager');
        
        // 綁定點擊事件
        document.querySelectorAll('.menu-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.getAttribute('data-view');
                console.log('切換視圖:', view);
                this.switchView(view);
            });
        });

        // 根據 URL hash 初始化視圖，如果沒有 hash 則顯示儀表板
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.switchView(hash);
        } else {
            // 默認顯示儀表板
            this.switchView('dashboard');
        }
    }

    async switchView(view) {
        console.log('切換至視圖:', view);
    
        // 隱藏所有視圖
        ['dashboardView', 'calendarView', 'ticketManagement', 'printQueueView', 'historyTicketsView'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
            }
        });
    
        // 處理特殊情況：tickets 視圖對應到 ticketManagement
        const viewId = view === 'tickets' ? 'ticketManagement' : 
                       view === 'HistoryTicketManager' ? 'historyTicketsView' : 
                       `${view}View`;
    
        // 顯示選中的視圖
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.remove('hidden');
    

            if (view === 'dashboard') {
                const updateEvent = new Event('updateDashboardStats');
                document.dispatchEvent(updateEvent);
            }
            // 如果是待列印視圖，強制重新載入數據
            if (view === 'printQueue' && window.printQueue) {
                console.log('重新載入待列印隊列');
                await window.printQueue.loadPrintQueue();
            }
    
            // 如果是歷史罰單視圖，載入歷史罰單
            if (view === 'HistoryTicketManager' && window.historyTicketManager) {
                console.log('重新載入歷史罰單');
                await window.historyTicketManager.loadHistoryTickets();
            }
        }
    
        // 更新 URL
        window.location.hash = view;
    
        // 更新側邊欄選中狀態
        document.querySelectorAll('.menu-item a').forEach(link => {
            const linkView = link.getAttribute('data-view');
            link.classList.toggle('bg-gray-100', linkView === view);
        });
    }
}

// 確保只創建一個實例
if (!window.viewManager) {
    window.viewManager = new ViewManager();
}

export default window.viewManager;