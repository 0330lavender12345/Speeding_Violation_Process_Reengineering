// image-preview.js
class ImagePreview {
    constructor() {
        this.createModal();
        this.bindElements();
        this.bindEvents();
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 hidden items-center justify-center p-4';
        modal.innerHTML = `
            <div class="relative max-w-4xl max-h-[90vh] w-full h-full">
                <img id="modalImage" class="w-full h-full object-contain opacity-0 transition-all duration-700 ease-in-out" src="" alt="Enlarged Image">
                <button id="closeModal" class="absolute top-4 right-4 text-white bg-black hover:bg-gray-600 p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-500 ease-in-out transform hover:rotate-45 hover:scale-110 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    bindElements() {
        this.modal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImage');
        this.closeBtn = document.getElementById('closeModal');
    }

    bindEvents() {
        // 綁定關閉按鈕事件
        this.closeBtn.addEventListener('click', () => this.hideModal());

        // 點擊背景關閉
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // 綁定所有罰單圖片的預覽事件
        this.bindTicketImages();
    }

    bindTicketImages() {
        const ticketImages = document.querySelectorAll('.ticket-card img');
        ticketImages.forEach(img => {
            img.classList.add('cursor-pointer', 'transition-transform', 'duration-300');
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPreview(img.src);
            });
        });
    }

    showPreview(imageSrc) {
        this.modalImage.src = imageSrc;
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        
        setTimeout(() => {
            this.modalImage.classList.remove('opacity-0');
            this.modalImage.classList.add('opacity-100');
        }, 50);
    }

    hideModal() {
        this.modalImage.classList.remove('opacity-100');
        this.modalImage.classList.add('opacity-0');
        
        setTimeout(() => {
            this.modal.classList.remove('flex');
            this.modal.classList.add('hidden');
        }, 300);
    }

    // 更新綁定（當有新的罰單卡片添加時調用）
    updateBindings() {
        this.bindTicketImages();
    }
}

export default new ImagePreview();