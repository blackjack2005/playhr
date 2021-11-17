# Wistron Human Resource 請假记录 Spider using Playwright
## 指定始末日期，截取所有员工請假记录。
## Output to CSV file
## Details
   * 员工资讯
   * 假別
   * 起訖日期
   * 時數
   * 代理人
   * 理由
   * 核准狀態
   * 签核历程 (not yet)

# How to use
git clone https://github.com/alex632/playhr.git
> node index.js

# Insights
	How to wait properly using playwright?
	Single page application cause trouble waiting for readiness?
	Wait till hourglass gif disappears in this situation.
	trim() almost everywhere.
	Microsoft playwright is still good.
	理由 might have newline characters.