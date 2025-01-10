class PrintQueue {
    constructor() {
        console.log('PrintQueue 初始化開始');
        this.initialize();
        this.currentIndex = 0;
        this.stampedTickets = [];

        if (this.container) {
           /* this.container.style.marginBottom = '2rem';  // 添加底部間距*/
            this.container.style.minHeight = 'calc(100vh - 300px)';  // 確保最小高度
        }
    }

    initialize() {
        this.container = document.getElementById('printQueueContainer');
        
        // 添加審核按鈕和模態框到 DOM
        const reviewButtonHTML = `
            <div class="container mx-auto px-4 py-4 flex justify-end">
                <button id="reviewButton" class="bg-[#003049] hover:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center">
                    <i ></i>審核罰單
                </button>
            </div>
        `;

        const reviewModalHTML = `
        <div id="reviewModal" class="fixed inset-0 bg-black/3 backdrop-blur-sm hidden items-center justify-center z-50">
                <button id="closeReviewModal" class="absolute top-4 right-4 text-white hover:text-gray-300">
                    <i class="fas fa-times text-2xl"></i>
                </button>
                
                <div class="flex items-center justify-between w-full px-8">
                    <button id="prevTicket" class="w-12 h-12 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-full transition-all duration-200">
                        <i class="fas fa-chevron-left text-white"></i>
                    </button>
                    
                    <div id="reviewImageContainer" class="flex-1 mx-8">
                        <!-- 圖片將在這裡動態插入 -->
                    </div>
                    
                    <button id="nextTicket" class="w-12 h-12 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-full transition-all duration-200">
                        <i class="fas fa-chevron-right text-white"></i>
                    </button>
                </div>
            
                <button id="downloadAllButton" class="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black hover:bg-gray-500 text-white px-8 py-3 rounded-lg flex items-center transition-all duration-200">
                    <i class="fas fa-download mr-2"></i>列印
                </button>
        </div>
    `;

        // 插入審核按鈕和模態框
        document.querySelector('#printQueueView').insertAdjacentHTML('afterbegin', reviewButtonHTML);
        document.body.insertAdjacentHTML('beforeend', reviewModalHTML);

        // 綁定審核相關元素
        this.reviewButton = document.getElementById('reviewButton');
        this.reviewModal = document.getElementById('reviewModal');
        this.closeReviewModal = document.getElementById('closeReviewModal');
        this.prevTicket = document.getElementById('prevTicket');
        this.nextTicket = document.getElementById('nextTicket');
        this.reviewImageContainer = document.getElementById('reviewImageContainer');
        this.downloadAllButton = document.getElementById('downloadAllButton');

        // 綁定審核相關事件
        this.bindReviewEvents();
        
        if (this.container) {
            setTimeout(() => this.loadPrintQueue(), 100);
        } else {
            console.error('找不到 printQueueContainer 元素');
        }
    }

    bindReviewEvents() {
        this.reviewButton.addEventListener('click', () => this.openReviewModal());
        
        // 修改關閉模態框的邏輯
        this.closeReviewModal.addEventListener('click', () => {
            this.reviewModal.classList.add('hidden');
            this.reviewModal.style.display = 'none';
        });
    
        // 添加點擊背景關閉
        this.reviewModal.addEventListener('click', (e) => {
            if (e.target === this.reviewModal) {
                this.reviewModal.classList.add('hidden');
                this.reviewModal.style.display = 'none';
            }
        });
    
        // 添加左右按鈕事件
        this.prevTicket.addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.showCurrentTicket();
            }
        });
    
        this.nextTicket.addEventListener('click', () => {
            if (this.currentIndex < this.stampedTickets.length - 1) {
                this.currentIndex++;
                this.showCurrentTicket();
            }
        });
    
        this.downloadAllButton.addEventListener('click', () => this.downloadAllImages());
    }

    async openReviewModal() {
        // 獲取所有罰單卡片
        this.stampedTickets = Array.from(document.querySelectorAll('#printQueueContainer .ticket-card'))
            .map(card => ({
                id: card.dataset.ticketId,
                image: card.querySelector('img').src
            }));
    
        if (this.stampedTickets.length === 0) {
            alert('沒有可審核的罰單');
            return;
        }
    
        this.currentIndex = 0;
        // 設置模態框的背景
        this.reviewModal.classList.remove('hidden');
        this.reviewModal.style.cssText = `
            display: flex;
            background-color: rgba(0, 0, 0, 0.5); 
            backdrop-filter: blur(4px);
        `;
        this.showCurrentTicket();
    }

    showCurrentTicket() {
        const ticket = this.stampedTickets[this.currentIndex];
        this.reviewImageContainer.innerHTML = `
            <div class="flex flex-col items-center">
                <img src="${ticket.image}" class="max-h-[80vh] mx-auto">
                <p class="text-center mt-4 text-white">罰單 ${this.currentIndex + 1}/${this.stampedTickets.length}</p>
            </div>
        `;
    
        // 更新箭頭按鈕狀態
        this.prevTicket.disabled = this.currentIndex === 0;
        this.nextTicket.disabled = this.currentIndex === this.stampedTickets.length - 1;
        
        // 使用透明度來表示禁用狀態
        this.prevTicket.style.opacity = this.currentIndex === 0 ? '0.5' : '1';
        this.nextTicket.style.opacity = this.currentIndex === this.stampedTickets.length - 1 ? '0.5' : '1';
        
        // 禁用點擊
        this.prevTicket.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
        this.nextTicket.style.pointerEvents = this.currentIndex === this.stampedTickets.length - 1 ? 'none' : 'auto';
    }

    // 這邊
    async downloadAllImages() {
        try {
            const ticketsToMove = [];
            
            for (let i = 0; i < this.stampedTickets.length; i++) {
                const ticket = this.stampedTickets[i];
                const response = await fetch(ticket.image);
                const blob = await response.blob();
                
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = `罰單_${ticket.id}.png`;
                link.click();
                window.URL.revokeObjectURL(link.href);
    
                // 查詢目前的待列印罰單，找出對應的 Fine_Violation_Report_ID
                const pendingTickets = await this.fetchPendingTickets();
                const matchingTicket = pendingTickets.find(
                    pending => pending.Fine_Image === ticket.image.split('/').pop()
                );
    
                // 準備要移動到歷史的罰單資料
                ticketsToMove.push({
                    Fine_Violation_Report_ID: matchingTicket ? matchingTicket.Fine_Violation_Report_ID : 0,
                    Fine_Image: ticket.image.split('/').pop(),
                    Print_Timestamp: ticket.id.split('_')[1],
                    Printed_Timestamp: new Date().toISOString(),
                    Officer_Name: JSON.parse(localStorage.getItem('user'))?.name || '未知'
                });
            }
    
            // 發送已列印罰單到後端
            await this.moveToHistoryTickets(ticketsToMove);
    
            // 重新載入待列印佇列
            await this.loadPrintQueue();
    
            alert('下載完成');
        } catch (error) {
            console.error('下載失敗:', error);
            alert('下載過程中發生錯誤');
        }
    }
    
    // 新增方法：取得待列印罰單
    async fetchPendingTickets() {
        try {
            const response = await fetch('/get_pending_prints');
            const data = await response.json();
    
            if (data.success) {
                return data.tickets || [];
            }
            return [];
        } catch (error) {
            console.error('獲取待列印罰單失敗:', error);
            return [];
        }
    }

// 新增方法：將罰單移到歷史
async moveToHistoryTickets(tickets) {
    try {
        console.log('準備移動到歷史罰單的資料:', tickets);

        const processedTickets = tickets.map(ticket => {
            // 假設 ticket 是一個有 Fine_Image 的物件
            return {
                Fine_Violation_Report_ID: ticket.Fine_Violation_Report_ID || 0, // 確保有這個欄位
                Fine_Image: ticket.Fine_Image,
                Print_Timestamp: ticket.Print_Timestamp
            };
        });

        const response = await fetch('/move_to_history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickets: processedTickets })
        });

        // 其餘程式碼保持不變
        const data = await response.json();
        console.log('移動到歷史罰單的回應:', data);

        if (data.success) {
            // 如果有歷史罰單管理器，觸發重新載入
            if (window.historyTicketManager) {
                window.historyTicketManager.loadHistoryTickets();
            }
            console.log('成功移動到歷史罰單');
        } else {
            throw new Error(data.message || '移動到歷史罰單失敗');
        }
    } catch (error) {
        console.error('移動到歷史罰單時發生詳細錯誤:', error);
        
        let errorMessage = '移動到歷史罰單時發生錯誤';
        if (error.message) {
            errorMessage += `: ${error.message}`;
        }
        
        utils.showNotification('error', errorMessage);
    }
}
//到這
    async loadPrintQueue() {
        try {
            const response = await fetch('/get_pending_prints');
            const data = await response.json();

            if (data.success) {
                const tickets = data.tickets || [];
                this.renderTickets(tickets);
            } else {
                this.showErrorMessage(data.message || '無法獲取罰單');
            }
        } catch (error) {
            console.error('載入罰單失敗:', error);
            this.showErrorMessage('載入失敗');
        }
    }

    renderTickets(tickets) {
        if (!this.container) return;
    
        // 如果沒有待列印的罰單
        if (tickets.length === 0) {
            this.container.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-8 text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <p class="text-gray-500 text-lg">目前沒有待列印的罰單</p>
            </div>
            `;

            
            return;
        }
    
        // 動態生成每張罰單的 HTML
        const ticketsHTML = tickets.map(ticket => {
            return `
            <div class="ticket-card" data-ticket-id="${ticket.License_Plate}_${ticket.Print_Timestamp}" data-status="pending">
            <!-- 選取指示器 -->
            <div class="selection-indicator absolute top-3 left-3 z-10 opacity-0 transition-all duration-200">
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-check text-white text-sm"></i>
                </div>
            </div>
        
            <!-- 隱藏的 checkbox 用於保持原有功能 -->
            <input type="checkbox" 
                   class="ticket-selector hidden"
                   aria-hidden="true">
        
            <!-- 蓋章標記 -->
            <div class="stamp-mark hidden absolute top-3 right-3 z-10 bg-red-500 text-white p-1 rounded-full">
                <i class="fas fa-stamp"></i>
            </div>
        
            <img src="static/images/${ticket.Fine_Image}" 
                 alt="${ticket.License_Plate}_${ticket.Print_Timestamp}"
                 class="w-full h-48 object-cover">
            <div class="p-4">
                <h3 class="text-lg font-semibold mb-2">罰單編號: ${ticket.Fine_Image.split('.')[0]}</h3>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 print-time" data-ticket="${ticket.Fine_Image}">蓋章時間: ${ticket.Print_Timestamp || '-'}</span>
                   <!--< <div class="button-group">
                        <button onclick="stampTicket('${ticket.Fine_Image}')" 
                                class="card-btn bg-blue-500">
                            <i class="fas fa-stamp"></i>
                        </button>
                        <button class="card-btn bg-gray-500 preview-btn">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="card-btn bg-red-500">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>-->
                </div>
            </div>            
        </div>`;
        }).join('');
   
        // 將內容插入容器
        this.container.innerHTML = ticketsHTML;
    }
    


    showErrorMessage(message) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
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
}

// 創建實例
window.addEventListener('DOMContentLoaded', () => {
    window.printQueue = new PrintQueue();
});

export default PrintQueue;