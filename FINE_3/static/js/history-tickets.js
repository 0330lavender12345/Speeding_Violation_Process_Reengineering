import utils from './utils.js';
import imagePreview from './image-preview.js';

class HistoryTicketManager {
    constructor() {
        this.container = null;
        this.searchInput = null;
        this.startDateInput = null;
        this.endDateInput = null;
        this.searchButton = null;
        this.sortButton = null;
        this.currentTickets = [];
        this.displayedTickets = []; 
        this.clearButton = null;
        this.sortDirection = 'desc';
        this.init();
    }

    init() {
        window.addEventListener('DOMContentLoaded', () => {
            this.bindElements();
            this.bindEvents();
            this.loadHistoryTickets();
        });
    }

    bindElements() {
        this.container = document.querySelector('#historyTicketsView #historyTicketContainer');
        this.searchInput = document.querySelector('#historyTicketsView input[placeholder="搜尋車牌號碼..."]');
        this.startDateInput = document.querySelector('#historyTicketsView #startDate');
        this.endDateInput = document.querySelector('#historyTicketsView #endDate');
        this.searchButton = document.querySelector('#historyTicketsView #searchButton');
        this.sortButton = document.querySelector('#historyTicketsView #sortButton');
        this.clearButton = document.querySelector('#historyTicketsView #clearButton');
    }

    bindEvents() {
        // 搜尋按鈕事件
        if (this.searchButton) {
            this.searchButton.addEventListener('click', () => this.smartSearch());
        }

        // Enter 鍵搜尋
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.smartSearch();
                }
            });
        }

        // 排序按鈕事件
        if (this.sortButton) {
            this.sortButton.addEventListener('click', () => this.toggleSortDirection());
        }
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearFilter());
        }
    }

    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
        
        // 更新按鈕圖示
        if (this.sortButton) {
            const icon = this.sortButton.querySelector('i');
            icon.className = this.sortDirection === 'desc' 
                ? 'fas fa-sort-amount-down' 
                : 'fas fa-sort-amount-up';
            
            this.sortButton.setAttribute('title', 
                this.sortDirection === 'desc' ? '由新到舊' : '由舊到新'
            );
        }

        // 重新排序現有結果
        this.reorderCurrentResults();
    }


    clearFilter() {
        // 清除輸入值
        if (this.searchInput) this.searchInput.value = '';
        if (this.startDateInput) this.startDateInput.value = '';
        if (this.endDateInput) this.endDateInput.value = '';

        // 重設顯示的票券為所有票券
        this.displayedTickets = [...this.currentTickets];

        // 根據當前排序方向排序
        const sortedTickets = [...this.displayedTickets].sort((a, b) => {
            const dateA = new Date(a.Record_Timestamp || a.Print_Timestamp);
            const dateB = new Date(b.Record_Timestamp || b.Print_Timestamp);
            return this.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
        });

        // 更新顯示
        this.displayedTickets = sortedTickets;
        this.renderTickets(this.displayedTickets);

        // 顯示提示訊息
        utils.showNotification('info', '已清除所有篩選條件');
    }
    
    reorderCurrentResults() {
        if (!this.displayedTickets || this.displayedTickets.length === 0) return;

        const sortedTickets = [...this.displayedTickets].sort((a, b) => {
            const dateA = new Date(a.Record_Timestamp || a.Print_Timestamp);
            const dateB = new Date(b.Record_Timestamp || b.Print_Timestamp);
            return this.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
        });

        this.displayedTickets = sortedTickets; // 更新當前顯示的票券
        this.renderTickets(sortedTickets);
    }

    async loadHistoryTickets() {
        try {
            this.showLoadingState();
            const response = await fetch('/get_history_tickets');
            const data = await response.json();

            if (data.success) {
                this.currentTickets = data.tickets || [];
                this.displayedTickets = [...this.currentTickets]; // 初始時顯示所有票券
                this.renderTickets(this.displayedTickets);
            } else {
                this.showErrorMessage(data.message || '無法獲取歷史罰單');
            }
        } catch (error) {
            console.error('載入歷史罰單失敗:', error);
            this.showErrorMessage('載入失敗');
        }
    }

    async smartSearch() {
        try {
            if (!this.currentTickets || this.currentTickets.length === 0) {
                utils.showNotification('warning', '尚無可搜尋的罰單');
                return;
            }
    
            this.searchButton.disabled = true;
            this.searchButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>搜尋中';
    
            const plateNumber = (this.searchInput.value || '').trim().toLowerCase();
            const startDate = this.startDateInput.value;
            const endDate = this.endDateInput.value;
    
            if ((startDate && !endDate) || (!startDate && endDate)) {
                utils.showNotification('warning', '請完整選擇起始與結束日期');
                return;
            }
    
            // 篩選邏輯
            const filteredTickets = this.currentTickets.filter(ticket => {
                const plateMatch = !plateNumber || 
                    ticket.License_Plate.toLowerCase().includes(plateNumber);
    
                let dateMatch = true;
                if (startDate && endDate) {
                    const ticketDate = new Date(ticket.Record_Timestamp || ticket.Violation_Timestamp);
                    const startDateTime = new Date(startDate + 'T00:00:00');
                    const endDateTime = new Date(endDate + 'T23:59:59');
                    dateMatch = ticketDate >= startDateTime && ticketDate <= endDateTime;
                }
    
                return plateMatch && dateMatch;
            });
    
            // 先更新 displayedTickets
            this.displayedTickets = [...filteredTickets];
    
            // 根據當前排序方向排序
            const sortedTickets = [...this.displayedTickets].sort((a, b) => {
                const dateA = new Date(a.Record_Timestamp || a.Print_Timestamp);
                const dateB = new Date(b.Record_Timestamp || b.Print_Timestamp);
                return this.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            });
    
            // 更新排序後的結果
            this.displayedTickets = sortedTickets;
    
            // 渲染結果
            this.renderTickets(this.displayedTickets);
    
            // 顯示搜尋結果訊息
            let message = '';
            if (filteredTickets.length === 0) {
                message = '沒有找到符合條件的罰單';
            } else if (plateNumber && startDate) {
                message = `找到 ${filteredTickets.length} 張同時符合車號和日期的罰單`;
            } else if (plateNumber) {
                message = `找到 ${filteredTickets.length} 張符合車號的罰單`;
            } else if (startDate) {
                message = `找到該日期區間的 ${filteredTickets.length} 張罰單`;
            }
    
            if (plateNumber || (startDate && endDate)) {
                utils.showNotification(
                    filteredTickets.length > 0 ? 'success' : 'info', 
                    message
                );
            }
    
        } catch (error) {
            console.error('搜尋發生錯誤:', error);
            utils.showNotification('error', '搜尋過程發生錯誤');
        } finally {
            if (this.searchButton) {
                this.searchButton.disabled = false;
                this.searchButton.innerHTML = '<i class="fas fa-search mr-2"></i>搜尋';
            }
        }
    }

    renderTickets(tickets) {
        if (!this.container) return;

        if (!tickets || tickets.length === 0) {
            this.container.innerHTML = `
                <div class="col-span-3 bg-gray-50 rounded-lg p-8 text-center">
                    <i class="fas fa-file-alt text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg">沒有符合條件的罰單</p>
                </div>
            `;
            return;
        }

        const ticketsHTML = tickets.map(ticket => {
            const imageName = ticket.Fine_Image.split('.')[0].replace('_stamped', '');
            
            return `
                <div class="ticket-card bg-white rounded-lg shadow-md overflow-hidden" 
                     data-plate="${ticket.License_Plate}" 
                     data-timestamp="${ticket.Record_Timestamp}">
                    <img src="static/images/${ticket.Fine_Image}" 
                         alt="${ticket.License_Plate}"
                         class="w-full h-48 object-cover cursor-pointer hover:opacity-75 transition-opacity">
                    <div class="p-4">
                        <h3 class="text-lg font-semibold mb-2">罰單編號: ${imageName}</h3>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <p class="text-sm text-gray-600">車牌號碼</p>
                                <p class="font-medium">${ticket.License_Plate}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">開立時間</p>
                                <p class="font-medium">${this.formatDateTime(ticket.Print_Timestamp)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">駕駛人</p>
                                <p class="font-medium">${ticket.Owner_Name || '-'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">處理警員</p>
                                <p class="font-medium">${ticket.Officer_Name || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.container.innerHTML = ticketsHTML;
        this.bindImagePreview();
    }

    bindImagePreview() {
        const images = this.container.querySelectorAll('.ticket-card img');
        images.forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                imagePreview.showPreview(img.src);
            });
        });
    }

    showLoadingState() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="col-span-3 flex justify-center items-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        `;
    }

    showErrorMessage(message) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="col-span-3 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">${message}</p>
                    </div>
                </div>
            </div>
        `;
    }

    formatDateTime(timestamp) {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
}

const historyTicketManager = new HistoryTicketManager();
window.historyTicketManager = historyTicketManager;

export default historyTicketManager;