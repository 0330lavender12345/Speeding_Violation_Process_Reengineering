// 全局變數
let downloadedTickets = new Set(JSON.parse(localStorage.getItem('downloadedTickets') || '[]'));
let searchTimeout;

// 工具函數
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showNotification(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded shadow-lg animate__animated animate__fadeIn ${
        type === 'error' ? 'bg-red-100 border-l-4 border-red-500 text-red-700' :
        type === 'info' ? 'bg-blue-100 border-l-4 border-blue-500 text-blue-700' :
        'bg-green-100 border-l-4 border-green-500 text-green-700'
    }`;
    
    alertDiv.innerHTML = `
        <p class="font-bold">${type === 'error' ? '錯誤' : '提示'}</p>
        <p>${message}</p>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.add('animate__fadeOut');
        setTimeout(() => alertDiv.remove(), 1000);
    }, 3000);
}

function markAsDownloaded(ticketNumber) {
    downloadedTickets.add(ticketNumber);
    localStorage.setItem('downloadedTickets', JSON.stringify([...downloadedTickets]));
}

function updateTicketStatus(image, status) {
    const ticketCard = document.querySelector(`[alt="${image}"]`).closest('.ticket-card');
    if (ticketCard) {
        ticketCard.dataset.status = status;
        
        const currentFilter = document.querySelector('.filter-select').value;
        if (currentFilter !== 'all' && currentFilter !== status) {
            ticketCard.style.display = 'none';
        }
    }
}

// 列印功能
function printTicket(image) {
    // 更新開立時間
    const timeElement = document.querySelector(`.print-time[data-ticket="${image}"]`);
    const currentDate = getCurrentDateTime();
    timeElement.textContent = `開立時間: ${currentDate}`;
    
    // 創建下載連結
    const link = document.createElement('a');
    link.href = `/static/images/${image}`;
    const ticketNumber = image.split('.')[0];
    link.download = ticketNumber;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 標記為已下載並更新UI
    markAsDownloaded(ticketNumber);
    const imgElement = document.querySelector(`img[alt="${image}"]`);
    if (imgElement) {
        imgElement.classList.add('brightness-50');
        updateTicketStatus(image, 'completed');
    }
}

// 更新票據列表
function updateTicketList(images) {
    const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    
    if (images.length === 0) {
        container.innerHTML = '<div class="col-span-3 text-center text-gray-500">沒有找到符合條件的罰單</div>';
        return;
    }

    // 按時間排序
    const sortedImages = images.sort((a, b) => a.localeCompare(b));

    // 重新渲染列表，新增 data-ticket-id
    container.innerHTML = sortedImages.map(image => `
        <div class="ticket-card" data-ticket-id="${image.split('.')[0]}" data-status="pending">
            <!-- 選取指示器 -->
            <div class="selection-indicator">
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center opacity-0 transition-all duration-200">
                    <i class="fas fa-check text-white text-sm"></i>
                </div>
            </div>

            <!-- 隱藏的 checkbox -->
            <input type="checkbox" class="ticket-selector hidden" aria-hidden="true">

            <!-- 圖片預覽區域 -->
            <img src="/static/images/${image}" 
                 alt="${image}"
                 class="w-full h-48 object-cover transition-all duration-200">
            
            <div class="p-4">
                <h3 class="text-lg font-semibold mb-2">罰單編號: ${image.split('.')[0]}</h3>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 print-time" data-ticket="${image}">開立時間: </span>
                    <div class="button-group">
                        <button onclick="printTicket('${image}')" 
                                class="card-btn bg-blue-500">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="card-btn bg-gray-500">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="card-btn bg-red-500">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // 重新綁定事件
    setupTicketSelectors();
}
// 圖片預覽功能
function bindImagePreviewEvents() {
    const previewAreas = document.querySelectorAll('.preview-area');
    previewAreas.forEach(area => {
        area.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止觸發卡片選取
            const img = area.querySelector('img');
            if (img) {
                const modalImage = document.getElementById('modalImage');
                const imageModal = document.getElementById('imageModal');
                modalImage.src = img.src;
                imageModal.classList.remove('hidden');
                imageModal.classList.add('flex');
                setTimeout(() => {
                    modalImage.classList.remove('opacity-0');
                    modalImage.classList.add('opacity-100');
                }, 50);
            }
        });
    });
}

// DOM 載入完成後的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 車牌搜尋功能
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const plateNumber = this.value.trim();
            
            searchTimeout = setTimeout(async () => {
                if (plateNumber) {
                    try {
                        const response = await fetch('/search_by_plate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plateNumber: plateNumber })
                        });

                        const data = await response.json();
                        if (data.success) {
                            updateTicketList(data.images);
                        }
                    } catch (error) {
                        console.error('搜尋錯誤:', error);
                        showNotification('error', '搜尋過程發生錯誤');
                    }
                } else {
                    location.reload();
                }
            }, 500);
        });
    }

    // 初始化篩選功能
    const filterSelect = document.querySelector('.filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', function(e) {
            const status = e.target.value;
            const cards = document.querySelectorAll('.ticket-card');
            
            cards.forEach(card => {
                if (status === 'all' || card.dataset.status === status) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // 搜尋按鈕功能
    // 搜尋按钮功能部分的代码修改
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', async function() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const plateNumber = document.querySelector('.search-input').value.trim();
    
            try {
                const button = this;
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜尋中...';
    
                const hasPlate = plateNumber !== '';
                const hasDateRange = startDate !== '' && endDate !== '';
    
                if (hasDateRange && new Date(endDate) < new Date(startDate)) {
                    throw new Error('結束日期不能早於開始日期');
                }
    
                const searchUrl = hasPlate && hasDateRange ? '/combined_search' : 
                                hasPlate ? '/search_by_plate' : '/search_tickets';
    
                const response = await fetch(searchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plateNumber, startDate, endDate })
                });
    
                const data = await response.json();
                if (data.success) {
                    updateTicketList(data.images); // updateTicketList 已经包含了 setupTicketSelectors
                    if (data.images.length === 0) {
                        showNotification('info', '沒有找到符合條件的罰單');
                    }
                } else {
                    throw new Error(data.message || '搜尋失敗');
                }
            } catch (error) {
                console.error('搜尋錯誤:', error);
                showNotification('error', error.message || '搜尋過程發生錯誤');
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-search mr-2"></i>搜尋';
            }
        });
    }
    // 批量列印功能
    const batchPrintButton = document.querySelector('.action-btn.bg-black');
    if (batchPrintButton) {
        batchPrintButton.addEventListener('click', function() {
            const visibleTickets = document.querySelectorAll('.ticket-card img');
            
            if (visibleTickets.length === 0) {
                showNotification('error', '當前頁面沒有罰單可下載');
                return;
            }

            const currentDate = getCurrentDateTime();
            
            visibleTickets.forEach((img, index) => {
                setTimeout(() => {
                    const imagePath = img.src.split('/static/images/')[1];
                    const timeElement = document.querySelector(`.print-time[data-ticket="${imagePath}"]`);
                    timeElement.textContent = `開立時間: ${currentDate}`;
                    
                    const ticketNumber = imagePath.split('.')[0];
                    printTicket(imagePath);
                }, index * 500);
            });
        });
    }

    // 按鈕動畫效果
    const buttons = document.querySelectorAll('.action-btn, .card-btn');
    buttons.forEach(button => {
        button.addEventListener('mouseover', function() {
            this.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseout', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // 處理開始處理按鈕
const startProcessingButton = document.getElementById('startProcessing');
if (startProcessingButton) {
    startProcessingButton.addEventListener('click', async function() {
        try {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';

            const response = await fetch('/process_tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (data.success) {
                if (data.newImagesCreated) {
                    location.reload();
                } else {
                    // 創建自定義提示視窗
                    const modalHtml = `
                        <div id="processModal" class="fixed inset-0 z-50 flex items-center justify-center animate__animated animate__fadeIn">
                            <div class="absolute inset-0 bg-black bg-opacity-60"></div>
                            <div class="bg-white w-[320px] rounded-2xl shadow-xl relative">
                                <!-- 圖示區域 -->
                                <div class="absolute -top-12 left-1/2 transform -translate-x-1/2">
                                    <div class="w-24 h-24 rounded-full bg-white flex items-center justify-center">
                                        <div class="w-20 h-20 rounded-full bg-emerald-400 flex items-center justify-center">
                                            <i class="fas fa-check text-3xl text-white"></i>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 內容區域 -->
                                <div class="px-6 pt-16 pb-4">
                                    <p class="text-gray-800 text-center text-lg font-medium">${data.message}</p>
                                </div>

                                <!-- 按鈕區域 -->
                                <div class="px-6 pb-6 text-center">
                                    <button id="closeProcessModal" 
                                            class="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors duration-200 focus:outline-none text-base font-medium">
                                        確定
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;

                    // 添加模態視窗到頁面
                    document.body.insertAdjacentHTML('beforeend', modalHtml);

                    // 綁定關閉按鈕事件
                    const modal = document.getElementById('processModal');
                    const closeBtn = document.getElementById('closeProcessModal');

                    const closeModal = () => {
                        modal.classList.remove('animate__fadeIn');
                        modal.classList.add('animate__fadeOut');
                        setTimeout(() => {
                            modal.remove();
                        }, 500);
                    };

                    closeBtn.addEventListener('click', closeModal);

                    // 點擊視窗外關閉
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            closeModal();
                        }
                    });

                    // ESC 鍵關閉
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && modal) {
                            closeModal();
                        }
                    });
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('錯誤:', error);
            // 顯示錯誤模態視窗
            const errorModalHtml = `
                <div id="processModal" class="fixed inset-0 z-50 flex items-center justify-center animate__animated animate__fadeIn">
                    <div class="absolute inset-0 bg-black bg-opacity-60"></div>
                    <div class="bg-white w-[320px] rounded-2xl shadow-xl relative">
                        <!-- 圖示區域 -->
                        <div class="absolute -top-12 left-1/2 transform -translate-x-1/2">
                            <div class="w-24 h-24 rounded-full bg-white flex items-center justify-center">
                                <div class="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                                    <i class="fas fa-times text-3xl text-white"></i>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 內容區域 -->
                        <div class="px-6 pt-16 pb-4">
                            <p class="text-gray-800 text-center text-lg font-medium">處理過程發生錯誤</p>
                        </div>

                        <!-- 按鈕區域 -->
                        <div class="px-6 pb-6 text-center">
                            <button id="closeProcessModal" 
                                    class="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors duration-200 focus:outline-none text-base font-medium">
                                確定
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', errorModalHtml);

            // 綁定關閉按鈕事件
            const modal = document.getElementById('processModal');
            const closeBtn = document.getElementById('closeProcessModal');

            const closeModal = () => {
                modal.classList.remove('animate__fadeIn');
                modal.classList.add('animate__fadeOut');
                setTimeout(() => {
                    modal.remove();
                }, 500);
            };

            closeBtn.addEventListener('click', closeModal);

            // 點擊視窗外關閉
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            // ESC 鍵關閉
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal) {
                    closeModal();
                }
            });
        } finally {
            this.disabled = false;
            this.innerHTML = '開始處理';
        }
    });
}
    // 初始化圖片預覽
    bindImagePreviewEvents();
});

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    let isOpen = false;

    function toggleSidebar() {
        isOpen = !isOpen;
        sidebar.classList.toggle('active');
        hamburgerButton.classList.toggle('active');
        mainContent.classList.toggle('shifted');
    }

    hamburgerButton.addEventListener('click', toggleSidebar);

    // 點擊外部關閉選單
    document.addEventListener('click', (e) => {
        if (isOpen && 
            !sidebar.contains(e.target) && 
            !hamburgerButton.contains(e.target)) {
            toggleSidebar();
        }
    });
});
document.addEventListener('DOMContentLoaded', function() {
    // 初始化變數
    const batchPanel = document.getElementById('batchPanel');
    const selectedCount = document.getElementById('selectedCount');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const cancelSelectBtn = document.getElementById('cancelSelectBtn');
    const batchStampBtn = document.getElementById('batchStampBtn');
    const moveToPrintBtn = document.getElementById('moveToPrintBtn');
    const stampPreviewModal = document.getElementById('stampPreviewModal');
    let selectedTickets = new Set();

    // 設置選擇功能
    function setupTicketSelectors() {
        const ticketCards = document.querySelectorAll('.ticket-card');
        ticketCards.forEach(card => {
            // 為卡片圖片添加點擊事件（預覽）
            const img = card.querySelector('img');
            if (img) {
                img.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止觸發卡片點擊事件
                    const modalImage = document.getElementById('modalImage');
                    const imageModal = document.getElementById('imageModal');
                    modalImage.src = img.src;
                    imageModal.classList.remove('hidden');
                    imageModal.classList.add('flex');
                    setTimeout(() => {
                        modalImage.classList.remove('opacity-0');
                        modalImage.classList.add('opacity-100');
                    }, 50);
                });
            }
    
            // 為卡片添加點擊事件（選取）
            card.addEventListener('click', function(e) {
                // 如果點擊的是按鈕組或者圖片，不觸發選取
                if (e.target.closest('.button-group') || 
                    e.target.tagName === 'IMG') {
                    return;
                }
    
                // 獲取相關元素
                const checkbox = this.querySelector('.ticket-selector');
                const ticketId = this.dataset.ticketId;
    
                // 切換選取狀態
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    selectedTickets.add(ticketId);
                    this.classList.add('selected');
                } else {
                    selectedTickets.delete(ticketId);
                    this.classList.remove('selected');
                }
    
                updateBatchPanel();
                updateSelectButtons();
            });
    
            // 確保功能按鈕不會觸發選取
            const buttonGroup = card.querySelector('.button-group');
            if (buttonGroup) {
                buttonGroup.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });
    }
    // 更新批次操作面板
    function updateBatchPanel() {
        const count = selectedTickets.size;
        selectedCount.textContent = count;
        
        if (count > 0) {
            batchPanel.classList.remove('translate-y-full');
        } else {
            batchPanel.classList.add('translate-y-full');
        }
    }

    // 更新選擇按鈕狀態
    function updateSelectButtons() {
        const totalTickets = document.querySelectorAll('.ticket-selector').length;
        const selectedTicketsCount = selectedTickets.size;

        if (selectedTicketsCount === 0) {
            selectAllBtn.classList.remove('hidden');
            cancelSelectBtn.classList.add('hidden');
        } else if (selectedTicketsCount === totalTickets) {
            selectAllBtn.classList.add('hidden');
            cancelSelectBtn.classList.remove('hidden');
        } else {
            selectAllBtn.classList.remove('hidden');
            cancelSelectBtn.classList.remove('hidden');
        }
    }

    // 全選功能
    selectAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.ticket-selector').forEach(checkbox => {
            checkbox.checked = true;
            const ticketCard = checkbox.closest('.ticket-card');
            const ticketId = ticketCard.dataset.ticketId;
            selectedTickets.add(ticketId);
            ticketCard.classList.add('selected');
        });
        updateBatchPanel();
        updateSelectButtons();
    });

    // 取消選擇功能
    cancelSelectBtn.addEventListener('click', function() {
        document.querySelectorAll('.ticket-selector').forEach(checkbox => {
            checkbox.checked = false;
            const ticketCard = checkbox.closest('.ticket-card');
            ticketCard.classList.remove('selected');
        });
        selectedTickets.clear();
        updateBatchPanel();
        updateSelectButtons();
    });

    // 批次蓋章功能
    batchStampBtn.addEventListener('click', async function() {
        const selectedCards = Array.from(document.querySelectorAll('.ticket-card.selected'));
        
        // 生成預覽內容
        const previewGrid = document.getElementById('previewGrid');
        previewGrid.innerHTML = selectedCards.map(card => `
            <div class="preview-ticket">
                <img src="${card.querySelector('img').src}" alt="罰單預覽">
                <div class="preview-overlay">
                    <div class="stamp-mark bg-red-500 text-white p-2 rounded-full transform rotate-[-15deg]">
                        <i class="fas fa-stamp text-xl"></i>
                    </div>
                </div>
            </div>
        `).join('');

        // 顯示預覽模態視窗
        stampPreviewModal.classList.remove('hidden');
    });

    // 確認蓋章
    document.getElementById('confirmStamp').addEventListener('click', async function() {
        try {
            const response = await fetch('/batch_stamp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickets: Array.from(selectedTickets)
                })
            });

            const data = await response.json();
            if (data.success) {
                // 更新UI
                selectedTickets.forEach(ticketId => {
                    const card = document.querySelector(`[data-ticket-id="${ticketId}"]`);
                    card.querySelector('.stamp-mark').classList.remove('hidden');
                    card.classList.remove('selected');
                    card.querySelector('.ticket-selector').checked = false;
                });
                
                selectedTickets.clear();
                updateBatchPanel();
                updateSelectButtons();
                stampPreviewModal.classList.add('hidden');
                showNotification('success', '蓋章完成');
            }
        } catch (error) {
            showNotification('error', '蓋章失敗');
        }
    });

    // 移至待列印功能
    moveToPrintBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/move_to_print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickets: Array.from(selectedTickets)
                })
            });

            const data = await response.json();
            if (data.success) {
                selectedTickets.forEach(ticketId => {
                    const card = document.querySelector(`[data-ticket-id="${ticketId}"]`);
                    card.dataset.status = 'print_ready';
                    card.classList.remove('selected');
                    card.querySelector('.ticket-selector').checked = false;
                });

                selectedTickets.clear();
                updateBatchPanel();
                updateSelectButtons();
                showNotification('success', '已移至待列印區');
            }
        } catch (error) {
            showNotification('error', '操作失敗');
        }
    });

    // 關閉預覽模態視窗
    document.getElementById('closePreviewModal').addEventListener('click', () => {
        stampPreviewModal.classList.add('hidden');
    });

    document.getElementById('cancelStamp').addEventListener('click', () => {
        stampPreviewModal.classList.add('hidden');
    });

    // 初始化
    setupTicketSelectors();
    updateSelectButtons();
});

document.addEventListener('DOMContentLoaded', function() {
    // 獲取元素
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const modalContent = document.getElementById('modalContent');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    // 檢查是否已登入
    function checkLoginStatus() {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            showUserInfo(userData.name);
        }
    }

    // 顯示用戶信息
    function showUserInfo(name) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userInfo.querySelector('.user-name').textContent = name;
        // 添加進入動畫
        userInfo.style.transform = 'translateX(20px)';
        userInfo.style.opacity = '0';
        setTimeout(() => {
            userInfo.style.transform = 'translateX(0)';
            userInfo.style.opacity = '1';
        }, 50);
    }

    // 關閉模態框的動畫
    function closeModalWithAnimation() {
        modalContent.style.transform = 'scale(0.95)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            loginModal.classList.add('hidden');
            loginModal.classList.remove('flex');
            // 重置模態框狀態
            modalContent.style.transform = 'scale(0.95)';
            modalContent.style.opacity = '0';
        }, 300);
    }

    // 打開登入視窗
    loginBtn.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        loginModal.classList.add('flex');
        // 添加進入動畫
        setTimeout(() => {
            modalContent.style.transform = 'scale(1)';
            modalContent.style.opacity = '1';
        }, 50);
    });

    // 關閉登入視窗
    closeLoginModal.addEventListener('click', closeModalWithAnimation);

    // 點擊外部關閉視窗
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            closeModalWithAnimation();
        }
    });

    // 處理登入表單提交
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
    
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        submitBtn.disabled = true;
    
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
    
            const data = await response.json();
            
            if (data.status === 'success') {
                // 使用 full_name 而不是 username
                localStorage.setItem('user', JSON.stringify({
                    name: data.full_name,  // 使用 full_name
                    id: data.user_id
                }));
    
                closeModalWithAnimation();
                setTimeout(() => {
                    showUserInfo(data.full_name);  // 使用 full_name
                }, 300);
    
                loginForm.reset();
                showNotification('success', data.message);
            } else {
                showNotification('error', data.message);
            }
        } catch (error) {
            console.error('登入失敗:', error);
            showNotification('error', '登入失敗，請稍後再試');
        } finally {
            submitBtn.innerHTML = '<span>登入</span><i class="fas fa-arrow-right ml-2"></i>';
            submitBtn.disabled = false;
        }
    });

    // 處理登出
    logoutBtn.addEventListener('click', () => {
        // 添加登出動畫
        userInfo.style.transform = 'translateX(20px)';
        userInfo.style.opacity = '0';
        
        setTimeout(() => {
            localStorage.removeItem('user');
            userInfo.classList.add('hidden');
            loginBtn.classList.remove('hidden');
            // 添加登入按鈕進入動畫
            loginBtn.style.transform = 'translateX(-20px)';
            loginBtn.style.opacity = '0';
            setTimeout(() => {
                loginBtn.style.transform = 'translateX(0)';
                loginBtn.style.opacity = '1';
            }, 50);
        }, 300);
    });

    // 顯示通知提示
    function showNotification(type, message) {
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

        // 顯示動畫
        setTimeout(() => {
            notification.style.transform = 'translate(0)';
            notification.style.opacity = '1';
        }, 50);

        // 自動消失
        setTimeout(() => {
            notification.style.transform = 'translate-y-[-100%]';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // ESC 鍵關閉模態框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !loginModal.classList.contains('hidden')) {
            closeModalWithAnimation();
        }
    });

    // 檢查初始登入狀態
    checkLoginStatus();
});
