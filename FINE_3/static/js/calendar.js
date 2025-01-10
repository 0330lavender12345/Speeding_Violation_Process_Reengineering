// calendar.js - 日曆和活動記錄功能
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.activities = new Map();
        this.calendarContainer = document.getElementById('calendar');
        this.activityLog = document.getElementById('activityLog');
        this.monthDisplay = document.getElementById('currentMonth');
    }

    init() {
        this.loadActivities();
        this.renderCalendar();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 更新月份顯示
        this.monthDisplay.textContent = `${year}年 ${month + 1}月`;
        
        // 清空日曆
        this.calendarContainer.innerHTML = '';

        // 添加星期標題
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'text-center font-semibold p-2 bg-gray-50';
            dayElement.textContent = day;
            this.calendarContainer.appendChild(dayElement);
        });

        // 獲取當月的第一天和最後一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 填充開始空白日期
        for (let i = 0; i < firstDay.getDay(); i++) {
            this.createEmptyDay();
        }

        // 填充實際日期
        for (let day = 1; day <= lastDay.getDate(); day++) {
            this.createCalendarDay(year, month, day);
        }
    }

    createEmptyDay() {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'p-2 bg-gray-50';
        this.calendarContainer.appendChild(emptyDay);
    }

    createCalendarDay(year, month, day) {
        const dateElement = document.createElement('div');
        const dateString = utils.formatDate(new Date(year, month, day));
        
        dateElement.className = 'p-2 border hover:bg-gray-50 cursor-pointer relative';
        dateElement.textContent = day;

        // 檢查是否有活動
        if (this.activities.has(dateString)) {
            const marker = document.createElement('div');
            marker.className = 'absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full';
            dateElement.appendChild(marker);
        }

        dateElement.addEventListener('click', () => this.showDayActivities(dateString));
        this.calendarContainer.appendChild(dateElement);
    }

    showDayActivities(dateString) {
        const activities = this.activities.get(dateString) || [];
        this.renderActivityLog(activities);
    }

    renderActivityLog(activities) {
        this.activityLog.innerHTML = activities.length > 0
            ? activities.map(activity => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-semibold text-lg">${activity.officer}</div>
                            <div class="text-gray-600">處理日期: ${activity.dateRange}</div>
                            <div class="text-gray-500 text-sm">${activity.timestamp}</div>
                        </div>
                        <div class="flex items-center text-green-500">
                            <i class="fas fa-check-circle mr-2"></i>
                            <span>${activity.status}</span>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<div class="text-center text-gray-500 py-8">該日期無活動記錄</div>';
    }

    addActivity(date, activity) {
        const dateString = utils.formatDate(new Date(date));
        
        if (!this.activities.has(dateString)) {
            this.activities.set(dateString, []);
        }
        
        this.activities.get(dateString).push({
            ...activity,
            timestamp: new Date().toLocaleString()
        });
        
        this.saveActivities();
        this.renderCalendar();
    }

    loadActivities() {
        const saved = localStorage.getItem('calendarActivities');
        if (saved) {
            this.activities = new Map(JSON.parse(saved));
        }
    }

    saveActivities() {
        localStorage.setItem('calendarActivities', 
            JSON.stringify(Array.from(this.activities.entries())));
    }
}