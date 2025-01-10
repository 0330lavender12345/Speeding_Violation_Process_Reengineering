// static/js/dashboard-status.js
document.addEventListener('DOMContentLoaded', function() {
    async function updateDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            console.log('Received dashboard stats:', data); // 添加測試日誌
            
            if (data.success) {
                const totalTickets = document.getElementById('totalTickets');
                const pendingTickets = document.getElementById('pendingTickets');
                const stampedTickets = document.getElementById('stampedTickets');
                const historyTickets= document.getElementById('historyTickets');
                
                if (totalTickets) totalTickets.textContent = data.total_tickets;
                if (pendingTickets) pendingTickets.textContent = data.pending_tickets;
                if (stampedTickets) stampedTickets.textContent = data.stamped_tickets;
                if (historyTickets) historyTickets.textContent = data.history_tickets;
            } else {
                console.error('Failed to fetch stats:', data.error);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    }

    // 初始加載
    updateDashboardStats();

    // 每5分鐘更新一次
    setInterval(updateDashboardStats, 300000);

    // 監聽來自 ViewManager 的更新事件
    document.addEventListener('updateDashboardStats', updateDashboardStats);
});