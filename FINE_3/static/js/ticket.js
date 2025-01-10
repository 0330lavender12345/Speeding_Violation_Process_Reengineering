import utils from './utils.js';
import imagePreview from './image-preview.js'; 

// ticket.js - 罰單管理功能
class TicketManager {
    constructor() {
        this.selectedTickets = new Set();
        this.sortDirection = 'desc';
        this.stampedTickets = new Set(); // 追蹤已蓋章的罰單
        this.init();
        this.loadPendingTickets(); // 初始化時載入待處理罰單
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.setupTicketSelectors();
    }

    bindElements() {
        // 批次操作面板
        this.batchPanel = document.getElementById('batchPanel');
        this.selectedCount = document.getElementById('selectedCount');
        this.selectAllBtn = document.getElementById('selectAllBtn');
        this.cancelSelectBtn = document.getElementById('cancelSelectBtn');
        this.batchStampBtn = document.getElementById('batchStampBtn');
        //this.moveToPrintBtn = document.getElementById('moveToPrintBtn');
        
        // 預覽模態框
        this.stampPreviewModal = document.getElementById('stampPreviewModal');
        this.previewGrid = document.getElementById('previewGrid');
        
        // 搜尋相關
        this.searchInput = document.querySelector('.search-input');
        this.searchButton = document.getElementById('searchButton');
        this.startDateInput = document.getElementById('startDate');
        this.endDateInput = document.getElementById('endDate');
        
        // 排序按鈕
        this.sortButton = document.getElementById('sortButton');
        this.clearButton = document.getElementById('clearButton');
    }

    bindEvents() {
        // 全選/取消全選
        this.selectAllBtn.addEventListener('click', () => this.selectAll());
        this.cancelSelectBtn.addEventListener('click', () => this.cancelSelection());

        // 批次操作
        this.batchStampBtn.addEventListener('click', () => this.showStampPreview());
        //this.moveToPrintBtn.addEventListener('click', () => this.moveToPrintQueue());

        // 蓋章預覽相關
        document.getElementById('confirmStamp').addEventListener('click', () => this.confirmStamp());
        document.getElementById('cancelStamp').addEventListener('click', () => this.hideStampPreview());
        document.getElementById('closePreviewModal').addEventListener('click', () => this.hideStampPreview());

        // 搜尋相關
        this.bindSearchEvents();

        // 排序按鈕點擊事件
        this.sortButton.addEventListener('click', () => this.toggleSortDirection());

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearFilter());
        }

        // 添加開始處理按鈕的事件監聽
     // 添加開始處理按鈕的事件監聽
     document.getElementById('startProcessing').addEventListener('click', async () => {
        try {
            const response = await fetch('/process_tickets', {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                utils.showNotification('success', '罰單處理完成');
                // 重新載入待處理的罰單
                await this.loadPendingTickets();
            } else {
                utils.showNotification('info', data.message);
            }
        } catch (error) {
            console.error('處理罰單失敗:', error);
            utils.showNotification('error', '處理罰單時發生錯誤');
        }
    });
}

    clearFilter() {
        // 清除輸入值
        if (this.searchInput) this.searchInput.value = '';
        if (this.startDateInput) this.startDateInput.value = '';
        if (this.endDateInput) this.endDateInput.value = '';

        // 重新載入所有待處理罰單
        this.loadPendingTickets();

        // 顯示提示訊息
        utils.showNotification('info', '已清除所有篩選條件');
    }

    // 排序相關方法
    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
        
        // 更新按鈕圖示和提示文字
        const icon = this.sortButton.querySelector('i');
        if (this.sortDirection === 'desc') {
            icon.className = 'fas fa-sort-amount-down';
            this.sortButton.setAttribute('title', '由新到舊');
        } else {
            icon.className = 'fas fa-sort-amount-up';
            this.sortButton.setAttribute('title', '由舊到新');
        }

        // 重新排序目前的結果
        this.reorderCurrentResults();
    }

    reorderCurrentResults() {
        const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
        const currentCards = Array.from(container.querySelectorAll('.ticket-card'));
        
        if (currentCards.length === 0) return;

        const sortedCards = currentCards.sort((a, b) => {
            const dateA = a.querySelector('img').src.split('_')[1].split('.')[0];
            const dateB = b.querySelector('img').src.split('_')[1].split('.')[0];
            
            return this.sortDirection === 'desc' 
                ? dateB.localeCompare(dateA)
                : dateA.localeCompare(dateB);
        });

        container.innerHTML = '';
        sortedCards.forEach(card => container.appendChild(card));
        this.setupTicketSelectors();
    }

    updateTicketList(images) {
        const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
        
        if (!images || images.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="text-gray-500">
                        <i class="fas fa-search mb-4 text-4xl"></i>
                        <p>沒有找到符合條件的罰單</p>
                    </div>
                </div>`;
            this.updateSortButtonState(false);
            return;
        }

        // 根據當前排序方向排序圖片
        const sortedImages = images.sort((a, b) => {
            try {
                const dateA = a.split('_')[1].split('.')[0];
                const dateB = b.split('_')[1].split('.')[0];
                
                return this.sortDirection === 'desc'
                    ? dateB.localeCompare(dateA)
                    : dateA.localeCompare(dateB);
            } catch (error) {
                console.error('排序時發生錯誤:', error);
                return 0;
            }
        });

        container.innerHTML = sortedImages.map(image => this.createTicketCard(image)).join('');
        this.setupTicketSelectors();
        this.updateSortButtonState(true);
    }

    // 更新排序按鈕狀態
    updateSortButtonState(hasResults) {
        if (this.sortButton) {
            this.sortButton.disabled = !hasResults;
            this.sortButton.classList.toggle('opacity-50', !hasResults);
        }
    }


    bindSearchEvents() {
        // 原有的搜尋按鈕點擊事件
        this.searchButton.addEventListener('click', async () => {
            const plateNumber = this.searchInput.value.trim();
            const startDate = this.startDateInput.value;
            const endDate = this.endDateInput.value;
    
            await this.smartSearch(plateNumber, startDate, endDate);
        });
    
        // 新增 Enter 鍵監聽
        this.searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // 防止表單提交
                const plateNumber = this.searchInput.value.trim();
                const startDate = this.startDateInput.value;
                const endDate = this.endDateInput.value;
    
                await this.smartSearch(plateNumber, startDate, endDate);
            }
        });
    }

    /*async smartSearch(plateNumber, startDate, endDate) {
        try {
            this.searchButton.disabled = true;
            this.searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜尋中...';
    
            // 判斷搜尋模式
            const hasPlate = plateNumber.length > 0;
            const hasDateRange = startDate && endDate;
    
            // 日期區間檢查
            if ((startDate && !endDate) || (!startDate && endDate)) {
                utils.showNotification('warning', '請完整選擇起始與結束日期');
                return;
            }
    
            // 選擇搜尋模式和準備請求數據
            let searchUrl, searchData;
    
            if (hasPlate && !hasDateRange) {
                searchUrl = '/search_by_plate';
                searchData = { plateNumber };
                console.log('執行車牌搜尋:', plateNumber);
            } 
            else if (!hasPlate && hasDateRange) {
                searchUrl = '/search_tickets';
                searchData = { startDate, endDate };
                console.log('執行日期區間搜尋:', { startDate, endDate });
            } 
            else if (hasPlate && hasDateRange) {
                searchUrl = '/combined_search';
                searchData = { plateNumber, startDate, endDate };
                console.log('執行複合搜尋:', { plateNumber, startDate, endDate });
            } 
            else {
                utils.showNotification('warning', '請輸入車牌號碼或選擇日期區間');
                return;
            }
    
            console.log('發送搜尋請求:', searchUrl, searchData);
    
            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchData)
            });
    
            const data = await response.json();
            console.log('搜尋結果:', data);
    
            if (data.success) {
                // 過濾掉帶有 _stamped 的圖片
                const unstampedImages = data.images.filter(image => !image.includes('_stamped'));
                this.updateTicketList(unstampedImages);
                
                // 根據不同搜尋模式顯示對應提示
                let message = '';
                if (unstampedImages.length === 0) {
                    message = '沒有找到符合條件的未處理罰單';
                } else {
                    if (hasPlate && !hasDateRange) {
                        message = `找到 ${unstampedImages.length} 張符合車號的未處理罰單`;
                    } else if (!hasPlate && hasDateRange) {
                        message = `找到該日期區間的 ${unstampedImages.length} 張未處理罰單`;
                    } else {
                        message = `找到 ${unstampedImages.length} 張符合所有條件的未處理罰單`;
                    }
                }
                
                utils.showNotification(unstampedImages.length > 0 ? 'success' : 'info', message);
            } else {
                throw new Error(data.message || '搜尋失敗');
            }
        } catch (error) {
            console.error('搜尋錯誤:', error);
            utils.showNotification('error', error.message || '搜尋過程發生錯誤');
        } finally {
            this.searchButton.disabled = false;
            this.searchButton.innerHTML = '<i class="fas fa-search mr-2"></i>搜尋';
        }
    }*/
    // 新增載入待處理罰單的方法
    async loadPendingTickets() {
        try {
            const response = await fetch('/get_pending_process_tickets');
            const data = await response.json();

            if (data.success) {
                const tickets = data.tickets;
                this.updateTicketList(tickets.map(ticket => ticket.Fine_Image));
            } else {
                throw new Error(data.message || '載入失敗');
            }
        } catch (error) {
            console.error('載入待處理罰單失敗:', error);
            utils.showNotification('error', '載入罰單失敗');
        }
    }
    async smartSearch(plateNumber, startDate, endDate) {
    try {
        this.searchButton.disabled = true;
        this.searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜尋中...';

        // 日期區間檢查
        if ((startDate && !endDate) || (!startDate && endDate)) {
            utils.showNotification('warning', '請完整選擇起始與結束日期');
            return;
        }

        // 如果沒有任何搜尋條件，載入所有待處理罰單
        if (!plateNumber && !startDate && !endDate) {
            await this.loadPendingTickets();
            return;
        }

        const response = await fetch('/get_pending_process_tickets');
        const data = await response.json();

        if (data.success) {
            console.log('收到的罰單資料:', data.tickets);

            let filteredTickets = data.tickets;

            // 根據搜尋條件過濾
            if (plateNumber) {
                filteredTickets = filteredTickets.filter(ticket => 
                    ticket.License_Plate.toLowerCase().includes(plateNumber.toLowerCase())
                );
                console.log('車牌過濾後的罰單:', filteredTickets);
            }

            if (startDate && endDate) {
                const start = new Date(startDate + 'T00:00:00');
                const end = new Date(endDate + 'T23:59:59');
                
                filteredTickets = filteredTickets.filter(ticket => {
                    const recordDate = new Date(ticket.Record_Timestamp);
                    console.log('比較日期:', {
                        ticket: ticket.Fine_Image,
                        recordDate,
                        start,
                        end,
                        isInRange: recordDate >= start && recordDate <= end
                    });
                    return recordDate >= start && recordDate <= end;
                });
                console.log('日期過濾後的罰單:', filteredTickets);
            }

            if (filteredTickets.length > 0) {
                this.updateTicketList(filteredTickets.map(ticket => ticket.Fine_Image));
                utils.showNotification('success', `找到 ${filteredTickets.length} 張待處理罰單`);
            } else {
                this.updateTicketList([]);
                utils.showNotification('info', '沒有找到符合條件的待處理罰單');
            }
        } else {
            throw new Error(data.message || '搜尋失敗');
        }
    } catch (error) {
        console.error('搜尋錯誤:', error);
        utils.showNotification('error', error.message || '搜尋過程發生錯誤');
    } finally {
        this.searchButton.disabled = false;
        this.searchButton.innerHTML = '<i class="fas fa-search mr-2"></i>搜尋';
    }
}

     // 重新排序當前顯示的結果
    reorderCurrentResults() {
        const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
        const currentCards = Array.from(container.querySelectorAll('.ticket-card'));
        
        if (currentCards.length === 0) return;

        const sortedCards = currentCards.sort((a, b) => {
            const dateA = a.querySelector('img').src.split('_')[1].split('.')[0];
            const dateB = b.querySelector('img').src.split('_')[1].split('.')[0];
            
            return this.sortDirection === 'desc' 
                ? dateB.localeCompare(dateA)
                : dateA.localeCompare(dateB);
        });

        container.innerHTML = '';
        sortedCards.forEach(card => container.appendChild(card));
        this.setupTicketSelectors();
    }

    createTicketCard(image) {
        return `
            <div class="ticket-card" data-ticket-id="${image.split('.')[0]}" data-status="pending">
                <div class="selection-indicator absolute top-3 left-3 z-10 opacity-0 transition-all duration-200">
                    <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-check text-white text-sm"></i>
                    </div>
                </div>
                
                <input type="checkbox" class="ticket-selector hidden" aria-hidden="true">
                
                <div class="stamp-mark hidden absolute top-3 right-3 z-10 bg-red-500 text-white p-1 rounded-full">
                    <i class="fas fa-stamp"></i>
                </div>
                
                <img src="/static/images/${image}" alt="${image}" class="w-full h-48 object-cover">
                
                <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2">罰單編號: ${image.split('.')[0]}</h3>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 print-time" data-ticket="${image}">開立時間: </span>
                        
                    </div>
                </div>
            </div>
        `;
    }

    setupTicketSelectors() {
        const ticketCards = document.querySelectorAll('.ticket-card');
        ticketCards.forEach(card => {
            // 圖片預覽點擊事件
            const img = card.querySelector('img');
            if (img) {
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    imagePreview.showPreview(img.src);
                });
            }
    
            // 卡片選擇事件
            card.addEventListener('click', (e) => {
                // 排除按鈕組和圖片的點擊
                if (e.target.closest('.button-group, img')) return;
                
                const ticketId = card.dataset.ticketId;
                this.toggleTicketSelection(card, ticketId);
            });
    
            // 防止按鈕點擊觸發選擇
            const buttonGroup = card.querySelector('.button-group');
            if (buttonGroup) {
                buttonGroup.addEventListener('click', e => e.stopPropagation());
            }
        });
        imagePreview.updateBindings();
    }

    toggleTicketSelection(card, ticketId) {
        const checkbox = card.querySelector('.ticket-selector');
        checkbox.checked = !checkbox.checked;

        if (checkbox.checked) {
            this.selectedTickets.add(ticketId);
            card.classList.add('selected');
        } else {
            this.selectedTickets.delete(ticketId);
            card.classList.remove('selected');
        }

        this.updateBatchPanel();
        this.updateSelectButtons();
    }

    selectAll() {
        document.querySelectorAll('.ticket-selector').forEach(checkbox => {
            const card = checkbox.closest('.ticket-card');
            checkbox.checked = true;
            this.selectedTickets.add(card.dataset.ticketId);
            card.classList.add('selected');
        });
        this.updateBatchPanel();
        this.updateSelectButtons();
    }

    cancelSelection() {
        document.querySelectorAll('.ticket-selector').forEach(checkbox => {
            const card = checkbox.closest('.ticket-card');
            checkbox.checked = false;
            card.classList.remove('selected');
        });
        this.selectedTickets.clear();
        this.updateBatchPanel();
        this.updateSelectButtons();
    }

    updateBatchPanel() {
        this.selectedCount.textContent = this.selectedTickets.size;
        
        if (this.selectedTickets.size > 0) {
            this.batchPanel.classList.remove('translate-y-full');
        } else {
            this.batchPanel.classList.add('translate-y-full');
        }
    }

    updateSelectButtons() {
        const totalTickets = document.querySelectorAll('.ticket-selector').length;
        
        if (this.selectedTickets.size === 0) {
            this.selectAllBtn.classList.remove('hidden');
            this.cancelSelectBtn.classList.add('hidden');
        } else if (this.selectedTickets.size === totalTickets) {
            this.selectAllBtn.classList.add('hidden');
            this.cancelSelectBtn.classList.remove('hidden');
        } else {
            this.selectAllBtn.classList.remove('hidden');
            this.cancelSelectBtn.classList.remove('hidden');
        }
    }

    showStampPreview() {
        const selectedCards = Array.from(document.querySelectorAll('.ticket-card.selected'));
        this.previewGrid.innerHTML = selectedCards.map(card => `
        <div class="preview-ticket">
            <img src="${card.querySelector('img').src}" 
                 alt="罰單預覽" 
                 class="w-full h-48 object-cover rounded-lg">
        </div>
    `).join('');

        this.stampPreviewModal.classList.remove('hidden');
    }

    hideStampPreview() {
        this.stampPreviewModal.classList.add('hidden');
    }

    // 在 TicketManager 類的 confirmStamp 方法中修改
    async confirmStamp() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.name) {
                utils.showNotification('error', '請先登入');
                return;
            }
    
            // 收集所選罰單資訊
            const tickets = Array.from(this.selectedTickets);
            
            // 發送蓋章請求
            const response = await fetch('/batch_stamp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickets: tickets,
                    officer_name: user.name
                })
            });
    
            const data = await response.json();
            if (data.success) {
                // 更新界面顯示
                this.selectedTickets.forEach(ticketId => {
                    const card = document.querySelector(`[data-ticket-id="${ticketId}"]`);
                    if (card) {
                        // 更新卡片狀態
                        card.querySelector('.stamp-mark').classList.remove('hidden');
                        card.classList.remove('selected');
                        card.querySelector('.ticket-selector').checked = false;
                        card.classList.add('opacity-50', 'pointer-events-none');
                        
                        // 更新圖片來源為蓋章後的圖片
                        const img = card.querySelector('img');
                        const originalSrc = img.src;
                        const stampedSrc = originalSrc.replace('.png', '_stamped.png');
                        img.src = stampedSrc;

                        
                    }
                });
    
                // 清除選擇
                this.selectedTickets.clear();
                this.updateBatchPanel();
                this.hideStampPreview();
    
                // 刷新待列印區
                if (window.printQueue) {
                    await window.printQueue.loadPrintQueue();  // 改用 loadPrintQueue
                }
    
                utils.showNotification('success', '蓋章完成，罰單已移至待列印區');
            } else {
                throw new Error(data.message || '蓋章失敗');
            }
        } catch (error) {
            console.error('蓋章失敗:', error);
            utils.showNotification('error', error.message || '蓋章處理過程發生錯誤');
        }
    }
    
    async moveToPrintQueue() {
        try {
            // 只選擇已蓋章的罰單
            const selectedCards = Array.from(document.querySelectorAll('.ticket-card.selected'))
                .filter(card => !card.querySelector('.stamp-mark').classList.contains('hidden'));
            
            if (selectedCards.length === 0) {
                utils.showNotification('warning', '請先對選擇的罰單進行蓋章');
                return;
            }

            const tickets = selectedCards.map(card => ({
                id: card.dataset.ticketId,
                image: card.querySelector('img').src,
                stamped: true,
                officerName: JSON.parse(localStorage.getItem('user'))?.name,
                moveDate: new Date().toISOString()
            }));

            if (window.printQueue) {
                window.printQueue.add(tickets);
                this.cancelSelection();
                
                // 切換到待列印視圖
                if (window.viewManager) {
                    window.viewManager.switchView('printQueue');
                    utils.showNotification('success', '已將已蓋章的罰單移至待列印區');
                }
            }
        } catch (error) {
            console.error('移動至待列印區失敗:', error);
            utils.showNotification('error', '移動至待列印區時發生錯誤');
        }
    }
    // 更新罰單卡片顯示狀態
    updateTicketCardState(card, isStamped) {
        if (isStamped) {
            card.classList.add('opacity-50', 'pointer-events-none');
            card.setAttribute('data-stamped', 'true');
        } else {
            card.classList.remove('opacity-50', 'pointer-events-none');
            card.removeAttribute('data-stamped');
        }
    }

    // 更新移動到待列印區按鈕狀態
    updateMoveToPrintButton() {
        const hasStampedSelection = Array.from(this.selectedTickets)
            .some(ticketId => this.stampedTickets.has(ticketId));
        
        if (this.moveToPrintBtn) {
            this.moveToPrintBtn.disabled = !hasStampedSelection;
            this.moveToPrintBtn.classList.toggle('opacity-50', !hasStampedSelection);
        }
    }

    // 檢查罰單是否已蓋章
    isTicketStamped(ticketId) {
        return this.stampedTickets.has(ticketId);
    }

    // 在建立罰單卡片時檢查狀態
    createTicketCard(image) {
        const ticketId = image.split('.')[0];
        const isStamped = this.stampedTickets.has(ticketId);
        const opacityClass = isStamped ? 'opacity-50' : '';
        const pointerClass = isStamped ? 'pointer-events-none' : '';
        
        return `
            <div class="ticket-card ${opacityClass} ${pointerClass}" 
                 data-ticket-id="${ticketId}" 
                 data-status="pending"
                 ${isStamped ? 'data-stamped="true"' : ''}>
                <div class="selection-indicator absolute top-3 left-3 z-10 opacity-0 transition-all duration-200">
                    <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-check text-white text-sm"></i>
                    </div>
                </div>
                
                <input type="checkbox" class="ticket-selector hidden" aria-hidden="true">
                
                <div class="stamp-mark ${isStamped ? '' : 'hidden'} absolute top-3 right-3 z-10 bg-red-500 text-white p-1 rounded-full">
                    <i class="fas fa-stamp"></i>
                </div>
                
                <img src="/static/images/${image}" alt="${image}" class="w-full h-48 object-cover">
                
                <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2">罰單編號: ${ticketId}</h3>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 print-time" data-ticket="${image}">開立時間: </span>
                        
                    </div>
                </div>
            </div>
        `;
    }
}

// 創建全局實例
window.ticketManager = new TicketManager();
export default ticketManager;