// auth.js
import utils from './utils.js';

class Auth {
    constructor() {
        this.init();
    }

    init() {
        // 等待 DOM 加載完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        // 基本元素
        this.loginBtn = document.getElementById('loginBtn');
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.sidebarUserName = document.getElementById('sidebarUserName');

        // 錯誤提示元素
        this.loginError = document.getElementById('loginError');

        // 登入表單相關元素
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.togglePasswordBtn = document.getElementById('togglePassword');

        // 綁定事件
        this.bindEvents();
        // 檢查登入狀態
        this.checkLoginStatus();
        
    }

    bindEvents() {
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        if (this.loginModal) {
            this.loginModal.addEventListener('click', (e) => {
                if (e.target === this.loginModal) {
                    this.hideLoginModal();
                }
            });
        }
        if (this.togglePasswordBtn && this.passwordInput) {
            this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }


        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    showLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.remove('hidden');
            this.loginModal.classList.add('flex');
            // 確保錯誤訊息被隱藏
            if (this.loginError) {
                this.loginError.classList.add('hidden');
            }
        }
    }
    togglePasswordVisibility() {
        const passwordInput = this.passwordInput;
        const icon = this.togglePasswordBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    hideLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.add('hidden');
            this.loginModal.classList.remove('flex');
            // 重置表單
            if (this.loginForm) {
                this.loginForm.reset();
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (!this.usernameInput || !this.passwordInput) {
            utils.showNotification('error', '無法獲取登入表單資料');
            return;
        }

        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');

        if (!username || !password) {
            utils.showNotification('error', '請輸入帳號和密碼');
            return;
        }

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
                localStorage.setItem('user', JSON.stringify({
                    name: data.full_name,
                    id: data.user_id
                }));

                this.hideLoginModal();
                this.updateLoginStatus(true, data.full_name);
                utils.showNotification('success', '登入成功');
                
                // 更新頁面狀態
                document.body.classList.add('authenticated');
            } else {
                if (this.loginError) {
                    this.loginError.classList.remove('hidden');
                }
                utils.showNotification('error', data.message || '登入失敗');
            }
        } catch (error) {
            console.error('登入失敗:', error);
            utils.showNotification('error', '登入失敗，請稍後再試');
        } finally {
            submitBtn.innerHTML = '<span class="flex items-center justify-center"><i class="fas fa-sign-in-alt mr-2"></i>登入</span>';
            submitBtn.disabled = false;
        }
    }

    handleLogout() {
        localStorage.removeItem('user');
        this.updateLoginStatus(false);
        document.body.classList.remove('authenticated');
        utils.showNotification('info', '已登出系統');

        // 重置顯示
        if (this.loginBtn) {
            this.loginBtn.classList.remove('hidden');
        }
        if (this.sidebarUserName) {
            this.sidebarUserName.textContent = '未登入';
        }
    }

    updateLoginStatus(isLoggedIn, userName = '') {
        if (isLoggedIn) {
            this.loginBtn?.classList.add('hidden');
            this.logoutBtn?.classList.remove('hidden');
            if (this.sidebarUserName) {
                this.sidebarUserName.textContent = userName;
            }
        } else {
            this.loginBtn?.classList.remove('hidden');
            this.logoutBtn?.classList.add('hidden');
            if (this.sidebarUserName) {
                this.sidebarUserName.textContent = '未登入';
            }
        }
    }

    checkLoginStatus() {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            this.updateLoginStatus(true, userData.name);
            document.body.classList.add('authenticated');
        } else {
            this.updateLoginStatus(false);
            document.body.classList.remove('authenticated');
        }
    }
}

// 創建全局實例
window.auth = new Auth();
export default window.auth;