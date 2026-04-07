// ━━━ Admin Mock Data — aligned to turtle_project real structures ━━━

/* ── Dashboard ── */
export interface DashboardStats {
  todayNewMarkets: number;
  todayNewBattles: number;
  todayNewTopics: number;
  todayBetAmount: number;
  todayBetCount: number;
  todayBurnAmount: number;
  pendingDisputes: number;
  abnormalAlerts: number;
  totalUsers: number;
  activeUsers: number;
  totalMarkets: number;
  openMarkets: number;
  closedMarkets: number;
  settledMarkets: number;
  totalBattles: number;
  totalTopics: number;
  totalComments: number;
}

export const mockStats: DashboardStats = {
  todayNewMarkets: 12, todayNewBattles: 8, todayNewTopics: 34,
  todayBetAmount: 156800, todayBetCount: 1243, todayBurnAmount: 3200,
  pendingDisputes: 3, abnormalAlerts: 2,
  totalUsers: 4521, activeUsers: 876,
  totalMarkets: 147, openMarkets: 68, closedMarkets: 31, settledMarkets: 48,
  totalBattles: 312, totalTopics: 2841, totalComments: 12563,
};

export interface TrendPoint { date: string; value: number }
export const betTrend: TrendPoint[] = [
  { date: '03-26', value: 98000 }, { date: '03-27', value: 125000 },
  { date: '03-28', value: 110000 }, { date: '03-29', value: 142000 },
  { date: '03-30', value: 138000 }, { date: '03-31', value: 168000 },
  { date: '04-01', value: 156800 },
];
export const userTrend: TrendPoint[] = [
  { date: '03-26', value: 720 }, { date: '03-27', value: 810 },
  { date: '03-28', value: 790 }, { date: '03-29', value: 865 },
  { date: '03-30', value: 840 }, { date: '03-31', value: 910 },
  { date: '04-01', value: 876 },
];

/* ── Prediction Markets (FootballMarket + PredictContext) ── */
export type MktStatus = 'OPEN' | 'CLOSED' | 'SETTLED' | 'VOIDED';

export interface AdminMarket {
  id: number;
  title: string;
  proText: string;
  conText: string;
  status: MktStatus;
  poolA: number;
  poolB: number;
  baseA: number;
  baseB: number;
  betCount: number;
  closeTime: number;
  createTime: number;
  source: string;
  isPinned: boolean;
  isRecommended: boolean;
  tags: string[];
  heat: number;
  outcome?: 'A' | 'B' | 'VOID' | null;
  settledBy?: string;
  settleReason?: string;
}

export const adminMarkets: AdminMarket[] = [
  { id: 1001, title: '2026世界杯决赛：巴西 vs 德国，谁将夺冠？', proText: '巴西夺冠', conText: '德国夺冠', status: 'OPEN', poolA: 280920, poolB: 187280, baseA: 1000, baseB: 1000, betCount: 2341, closeTime: Date.parse('2026-07-19T22:00'), createTime: Date.parse('2026-03-01'), source: 'sync_worldcup', isPinned: true, isRecommended: true, tags: ['世界杯', '足球', '热门'], heat: 9800 },
  { id: 1002, title: 'GPT-5 是否会在 2026 Q2 发布？', proText: '会发布', conText: '不会', status: 'OPEN', poolA: 222720, poolB: 148480, baseA: 1000, baseB: 1000, betCount: 1856, closeTime: Date.parse('2026-06-30T23:59'), createTime: Date.parse('2026-02-15'), source: 'sync_polymarket', isPinned: false, isRecommended: true, tags: ['AI', '科技'], heat: 8200 },
  { id: 1003, title: '特斯拉 Q2 交付量超 50 万辆？', proText: '超过50万', conText: '不到50万', status: 'CLOSED', poolA: 118440, poolB: 78960, baseA: 1000, baseB: 1000, betCount: 987, closeTime: Date.parse('2026-04-01'), createTime: Date.parse('2026-01-20'), source: 'manual', isPinned: false, isRecommended: false, tags: ['特斯拉', '财报'], heat: 3100 },
  { id: 1004, title: '奥斯卡最佳影片由流媒体出品？', proText: '流媒体', conText: '传统片厂', status: 'SETTLED', poolA: 52320, poolB: 78480, baseA: 1000, baseB: 1000, betCount: 654, closeTime: Date.parse('2026-03-15'), createTime: Date.parse('2026-01-05'), source: 'sync_polymarket', isPinned: false, isRecommended: false, tags: ['奥斯卡'], heat: 1200, outcome: 'B', settledBy: '系统自动', settleReason: 'Polymarket 数据同步' },
  { id: 1005, title: '美联储 4 月会议加息？', proText: '加息', conText: '不加息', status: 'OPEN', poolA: 100240, poolB: 186160, baseA: 1000, baseB: 1000, betCount: 1432, closeTime: Date.parse('2026-04-30'), createTime: Date.parse('2026-03-10'), source: 'sync_polymarket', isPinned: true, isRecommended: true, tags: ['美联储', '经济'], heat: 7600 },
  { id: 1006, title: '《黑神话：悟空2》年内公布？', proText: '年内公布', conText: '明年再说', status: 'VOIDED', poolA: 44940, poolB: 19260, baseA: 1000, baseB: 1000, betCount: 321, closeTime: Date.parse('2026-12-31'), createTime: Date.parse('2026-02-28'), source: 'manual', isPinned: false, isRecommended: false, tags: ['游戏'], heat: 2800, outcome: 'VOID', settledBy: '运营-张三', settleReason: '标题歧义，退还全部下注' },
];

/* ── Battles ── */
export type BtlStatus = 'waiting' | 'active' | 'pending_declare' | 'pending_confirm' | 'disputed' | 'resolved' | 'voided';

export interface AdminBattle {
  id: string;
  topic: string;
  optionA: string;
  optionB: string;
  creator: { name: string; avatar: string; side: 'A' | 'B' };
  challenger: { name: string; avatar: string; side: 'A' | 'B' } | null;
  wager: number;
  status: BtlStatus;
  winner: 'A' | 'B' | null;
  createdTime: string;
  disputeReason?: string;
  disputeDeadline?: string;
  resolveReason?: string;
  resolvedBy?: string;
  pendingDeadline?: string;
}

export const adminBattles: AdminBattle[] = [
  { id: 'bt-a001', topic: '今晚 LOL 世界赛 T1 能否夺冠', optionA: 'T1 夺冠', optionB: 'T1 输了', creator: { name: '电竞老炮', avatar: '🎮', side: 'A' }, challenger: { name: '反向大师', avatar: '🃏', side: 'B' }, wager: 500, status: 'disputed', winner: null, createdTime: '03-30 18:00', disputeReason: '庄家宣判自己赢，但 T1 第五局被翻盘', disputeDeadline: '04-02 02:15' },
  { id: 'bt-a002', topic: 'BTC 今天收盘价高于 7 万美元', optionA: '高于7万', optionB: '低于7万', creator: { name: '币圈大佬', avatar: '💰', side: 'A' }, challenger: { name: '空军总司令', avatar: '🐻', side: 'B' }, wager: 1000, status: 'disputed', winner: null, createdTime: '03-29 09:00', disputeReason: '双方对"收盘价"定义有分歧', disputeDeadline: '04-01 00:30' },
  { id: 'bt-a003', topic: '周末北京是否下雨', optionA: '下雨', optionB: '不下雨', creator: { name: '天气预报员', avatar: '🌧️', side: 'A' }, challenger: { name: '晴天娃娃', avatar: '☀️', side: 'B' }, wager: 200, status: 'disputed', winner: null, createdTime: '03-28 10:00', disputeReason: '庄家说小雨算下雨，挑战者说几滴不算', disputeDeadline: '04-02 09:00' },
  { id: 'bt-a004', topic: '苹果春季发布 AR 眼镜？', optionA: '发布', optionB: '不发布', creator: { name: '果粉一号', avatar: '🍎', side: 'A' }, challenger: null, wager: 300, status: 'waiting', winner: null, createdTime: '04-01 08:00' },
  { id: 'bt-a005', topic: '中超 申花 vs 恒大', optionA: '申花赢', optionB: '恒大赢', creator: { name: '上海球迷', avatar: '⚽', side: 'A' }, challenger: { name: '广州死忠', avatar: '🏟️', side: 'B' }, wager: 800, status: 'pending_declare', winner: null, createdTime: '03-29 15:00', pendingDeadline: '04-01 16:00' },
  { id: 'bt-a006', topic: '诺贝尔文学奖颁给亚洲作家？', optionA: '亚洲', optionB: '非亚洲', creator: { name: '文学青年', avatar: '📚', side: 'A' }, challenger: { name: '欧美派', avatar: '🏰', side: 'B' }, wager: 400, status: 'resolved', winner: 'B', createdTime: '2025-09-01', resolveReason: '挑战者确认，正常结算', resolvedBy: '系统自动' },
];

/* ── Topics (TopicResponse) ── */
export interface AdminTopic {
  id: string;
  title: string;
  content: string;
  user: { nickname: string; username: string; avatar: string };
  node: { id: number; name: string };
  tags: string[];
  viewCount: number;
  commentCount: number;
  likeCount: number;
  sticky: boolean;
  recommend: boolean;
  createTime: string;
  ipLocation: string;
  reported: boolean;
  reportReason?: string;
  imageCount: number;
}

export const adminTopics: AdminTopic[] = [
  { id: 'tp-001', title: '世界杯巴西 vs 德国深度分析', content: '从历史战绩来看巴西在大赛中...', user: { nickname: '路边社社长', username: 'roadside_chief', avatar: '🦊' }, node: { id: 1, name: '预测讨论' }, tags: ['分析', '世界杯'], viewCount: 3421, commentCount: 89, likeCount: 234, sticky: true, recommend: true, createTime: '04-01 09:30', ipLocation: '上海', reported: false, imageCount: 3 },
  { id: 'tp-002', title: '爆料：GPT-5 内部测试已经开始', content: '据可靠消息源透露...', user: { nickname: '科技内幕', username: 'tech_insider', avatar: '🔬' }, node: { id: 2, name: '爆料专区' }, tags: ['爆料', 'AI'], viewCount: 8921, commentCount: 156, likeCount: 567, sticky: false, recommend: true, createTime: '03-31 22:15', ipLocation: '北京', reported: false, imageCount: 1 },
  { id: 'tp-003', title: '这个平台是不是有人刷量？', content: '我看到有人在同一个市场疯狂下注...', user: { nickname: '吃瓜群众', username: 'melon_eater', avatar: '🍉' }, node: { id: 3, name: '反馈建议' }, tags: ['讨论'], viewCount: 1234, commentCount: 45, likeCount: 78, sticky: false, recommend: false, createTime: '03-31 18:00', ipLocation: '广州', reported: true, reportReason: '质疑平台公正性，引发恐慌', imageCount: 0 },
  { id: 'tp-004', title: '美联储加息概率分析（附数据）', content: '根据 CME FedWatch 工具...', user: { nickname: '华尔街之狼', username: 'wall_st_wolf', avatar: '🐺' }, node: { id: 1, name: '预测讨论' }, tags: ['分析', '经济'], viewCount: 2156, commentCount: 67, likeCount: 189, sticky: false, recommend: true, createTime: '03-31 14:00', ipLocation: '深圳', reported: false, imageCount: 2 },
  { id: 'tp-005', title: '求助：我的结算金额不对', content: '我下注了100币在市场mk-004...', user: { nickname: '新手小白', username: 'newbie123', avatar: '🐣' }, node: { id: 3, name: '反馈建议' }, tags: ['讨论'], viewCount: 456, commentCount: 12, likeCount: 5, sticky: false, recommend: false, createTime: '03-30 20:00', ipLocation: '成都', reported: false, imageCount: 0 },
  { id: 'tp-006', title: '【违规】发布虚假爆料信息', content: '某某消息完全是编造的...', user: { nickname: '假新闻制造机', username: 'fake_news', avatar: '🤥' }, node: { id: 2, name: '爆料专区' }, tags: ['爆料'], viewCount: 678, commentCount: 23, likeCount: 3, sticky: false, recommend: false, createTime: '03-30 11:00', ipLocation: '未知', reported: true, reportReason: '发布虚假信息，多人举报', imageCount: 0 },
];

/* ── Operation Logs ── */
export type LogAction = 'resolve_battle' | 'void_market' | 'settle_market' | 'ban_user' | 'edit_context' | 'refresh_tags' | 'force_close' | 'unban_user' | 'pin_market' | 'sync_data' | 'sticky_topic' | 'recommend_topic' | 'delete_topic' | 'admin_mint';

export interface OpLog {
  id: string;
  operator: string;
  role: string;
  action: LogAction;
  targetType: string;
  targetId: string;
  detail: string;
  ip: string;
  time: string;
}

export const opLogs: OpLog[] = [
  { id: 'lg-01', operator: '运营-张三', role: '仲裁', action: 'resolve_battle', targetType: 'battle', targetId: 'bt-old-001', detail: '裁定庄家胜，比赛录像确认 T1 3:2 获胜', ip: '192.168.1.101', time: '03-31 14:30' },
  { id: 'lg-02', operator: '运营-李四', role: '内容', action: 'void_market', targetType: 'market', targetId: '1006', detail: '作废"黑神话2"市场，标题歧义', ip: '192.168.1.102', time: '03-31 11:00' },
  { id: 'lg-03', operator: '系统', role: '系统', action: 'settle_market', targetType: 'market', targetId: '1004', detail: '自动结算奥斯卡 → B，Polymarket同步', ip: '-', time: '03-15 13:00' },
  { id: 'lg-04', operator: '风控-王五', role: '风控', action: 'ban_user', targetType: 'user', targetId: 'u-999', detail: '封禁"刷量小王子"，24h下注200+次', ip: '192.168.1.103', time: '03-30 09:45' },
  { id: 'lg-05', operator: '运营-张三', role: '内容', action: 'edit_context', targetType: 'market', targetId: '1001', detail: '编辑世界杯决赛上下文，更新封面图', ip: '192.168.1.101', time: '03-29 16:20' },
  { id: 'lg-06', operator: '运营-李四', role: '内容', action: 'sticky_topic', targetType: 'topic', targetId: 'tp-001', detail: '置顶帖子"世界杯深度分析"', ip: '192.168.1.102', time: '03-29 10:00' },
  { id: 'lg-07', operator: '风控-王五', role: '风控', action: 'delete_topic', targetType: 'topic', targetId: 'tp-006', detail: '删除虚假爆料帖，多人举报确认', ip: '192.168.1.103', time: '03-28 15:00' },
  { id: 'lg-08', operator: '运营-张三', role: '内容', action: 'admin_mint', targetType: 'user', targetId: 'u-100', detail: '活动奖励发放 500 币', ip: '192.168.1.101', time: '03-28 10:00' },
];

/* ── Risk Alerts ── */
export interface RiskAlert {
  id: string;
  type: 'brush' | 'fund' | 'bigbet' | 'sensitive' | 'report';
  level: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  userName?: string;
  targetId?: string;
  time: string;
  handled: boolean;
  handledBy?: string;
}

export const riskAlerts: RiskAlert[] = [
  { id: 'ra-1', type: 'brush', level: 'high', title: '疑似刷量', detail: '用户"快枪手"30分钟对市场1002下注150次，单次10币', userName: '快枪手', targetId: '1002', time: '04-01 10:30', handled: false },
  { id: 'ra-2', type: 'fund', level: 'high', title: '资金池单边偏移', detail: '市场1001 A/B比例 92%:8%，可能存在操纵', targetId: '1001', time: '04-01 09:15', handled: false },
  { id: 'ra-3', type: 'bigbet', level: 'medium', title: '大额下注', detail: '用户"土豪金"单笔5000币（市场1005），超阈值', userName: '土豪金', targetId: '1005', time: '04-01 08:00', handled: true, handledBy: '风控-王五' },
  { id: 'ra-4', type: 'report', level: 'medium', title: '内容举报', detail: '帖子tp-006被5人举报为虚假信息', targetId: 'tp-006', time: '03-30 16:00', handled: true, handledBy: '运营-张三' },
  { id: 'ra-5', type: 'sensitive', level: 'low', title: '敏感词', detail: '用户"键盘侠"在对局评论中触发敏感词，已屏蔽', userName: '键盘侠', time: '03-31 22:00', handled: true, handledBy: '系统' },
];

/* ── Banned Users ── */
export interface BannedUser {
  userId: string;
  name: string;
  avatar: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
  expiresAt: string | null;
  totalBets: number;
}

export const bannedUsers: BannedUser[] = [
  { userId: 'u-999', name: '刷量小王子', avatar: '🤖', reason: '24h同一市场下注200+次', bannedAt: '03-30 09:45', bannedBy: '风控-王五', expiresAt: null, totalBets: 3421 },
  { userId: 'u-777', name: '喷子大王', avatar: '🔥', reason: '多次发布违规内容，3次警告后封禁', bannedAt: '03-25 14:00', bannedBy: '运营-张三', expiresAt: '04-25 14:00', totalBets: 156 },
];

/* ── Fund Ledger (UserCoinLog) ── */
export interface FundRecord {
  id: number;
  userId: number;
  userName: string;
  bizType: string;
  amount: number;
  balanceAfter: number;
  remark: string;
  createTime: string;
}

export const fundRecords: FundRecord[] = [
  { id: 1, userId: 101, userName: '电竞老炮', bizType: 'battle_stake', amount: -500, balanceAfter: 5000, remark: '对局押注 bt-a001', createTime: '03-30 18:00' },
  { id: 2, userId: 102, userName: '反向大师', bizType: 'battle_stake', amount: -500, balanceAfter: 2700, remark: '对局押注 bt-a001', createTime: '03-30 18:30' },
  { id: 3, userId: 201, userName: '快枪手', bizType: 'predict_bet', amount: -10, balanceAfter: 1490, remark: '市场1002 下注A', createTime: '04-01 10:30' },
  { id: 4, userId: 202, userName: '土豪金', bizType: 'predict_bet', amount: -5000, balanceAfter: 45000, remark: '市场1005 下注B', createTime: '04-01 08:00' },
  { id: 5, userId: 111, userName: '欧美派', bizType: 'battle_win', amount: 800, balanceAfter: 2000, remark: '对局 bt-a006 胜出', createTime: '2025-10-11' },
  { id: 6, userId: 100, userName: '活动用户', bizType: 'admin_mint', amount: 500, balanceAfter: 1500, remark: '管理员发放活动奖励', createTime: '03-28 10:00' },
];

/* ── Labels ── */
export const mktStatusLabel: Record<MktStatus, string> = { OPEN: '进行中', CLOSED: '已关闭', SETTLED: '已结算', VOIDED: '已作废' };
export const btlStatusLabel: Record<BtlStatus, string> = { waiting: '等待应战', active: '对局中', pending_declare: '待宣判', pending_confirm: '待确认', disputed: '争议中', resolved: '已结算', voided: '已作废' };
export const actionLabel: Record<LogAction, string> = { resolve_battle: '仲裁裁决', void_market: '作废市场', settle_market: '结算市场', ban_user: '封禁用户', edit_context: '编辑上下文', refresh_tags: '刷新标签', force_close: '强制关闭', unban_user: '解封用户', pin_market: '置顶市场', sync_data: '数据同步', sticky_topic: '置顶帖子', recommend_topic: '推荐帖子', delete_topic: '删除帖子', admin_mint: '发放金币' };

/* ── Violation Rules ── */
export const PENALTY_RULES = [
  { violation: '庄家虚假宣布结果', result: 'banker_loses', penalty: '正常输钱赔付 + 扣除本金 10% + 封号 7 天', color: 'red' as const },
  { violation: '议题模糊不可判定', result: 'void（作废）', penalty: '挑战者全额退还，庄家扣除 10% 本金 + 封号 7 天（入场费不退）', color: 'amber' as const },
  { violation: '挑战者虚假异议', result: 'banker_wins', penalty: '正常庄家赢赔付 + 扣除异议者冻结额 10%', color: 'blue' as const },
];
