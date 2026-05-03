# OTAimer

粉丝见面会 / 签售活动专用倒计时器 PWA。

## 功能

- **倒计时 / 正计时**：支持自定义时长的倒计时，以及正计时（超时）模式
- **多计时器**：每个分组最多 10 个计时器，支持拖拽排序
- **分组管理**：最多 5 个分组，独立的默认时长设置
- **加减时间**：倒计时运行中可手动增加或减少时间，支持自定义时长
- **调整记录**：查看每次手动加减时间的详细记录
- **数据统计**：按日 / 周 / 月 / 自定义范围查看各计时器的超时次数和平均超时
- **工时统计**：按日 / 周 / 月查看累计工时和每日工时明细
- **计时器生命周期**：重命名 / 删除计时器时自动追踪，统计数据跟随计时器身份
- **提醒方式**：响铃、震动、两者、静音
- **深色 / 浅色主题**：支持切换
- **PWA**：可添加到主屏幕，离线可用
- **Android 打包**：通过 Capacitor 打包为原生 APK

## 技术栈

- Vanilla JS（无框架）
- Vite 构建
- Capacitor（Android 打包）
- localStorage 持久化

## 开发

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 构建
npm run build

# Capacitor 同步
npx cap sync

# Android 打包（需要 Android Studio + JDK）
cd android && ./gradlew assembleDebug
```

## 项目结构

```
src/
  components/          # UI 组件
    MainScreen.js        # 主屏幕（计时器网格）
    Sidebar.js           # 侧边栏菜单
    TimerCircle.js       # 计时器圆环组件
    BusinessStatsScreen.js  # 数据统计屏幕
    WorktimeStatsScreen.js  # 工时统计屏幕
    AdjustmentsModal.js  # 调整记录弹窗
    FloatingMenu.js      # 长按浮动菜单
    EditTimerModal.js    # 编辑计时器弹窗
    ConfirmDialog.js     # 确认对话框
    SplashScreen.js      # 启动画面
    NoticeScreen.js      # 公告屏幕
  core/                # 核心逻辑
    state.js             # 状态管理
    timerEngine.js       # 计时器引擎（RAF 驱动）
    statsTracker.js      # 统计数据追踪（生命周期 + 业务数据 + 工时）
    storage.js           # localStorage 持久化
    alertManager.js      # 提醒管理（响铃 / 震动）
    timeFormat.js        # 时间格式化
  styles/              # 样式
  utils/               # 工具函数
```

## 版本

当前版本：1.1.2
