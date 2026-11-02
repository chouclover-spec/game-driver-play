import { getDriver } from './drivers.js';

const REACTION_PRIORITY = { collision: 5, pedestrian: 4, cutIn: 4, suddenStop: 3, pothole: 2, redLight: 1, idle: 0 };
const reactionLine = (quote, thought = '') => ({ quote, thought });
const response = (mood, tag, lines, title = '') => ({ mood, tag, lines: lines.map(line => typeof line === 'string' ? reactionLine(line) : line), title });

// 角色反应只消费独立的表现层随机数，不读取或改变交通随机数。
export const PERSONALITIES = {
  clover: {
    voice: 'CLOVER 说',
    pedestrian: response('angry', '规则派，红温中', ['靠，斑马线在那边！先刹车。', '横穿？马路是你家客厅吗？！', '别乱穿啊！我刹车又不是瞬移！']),
    cutIn: response('angry', '转向灯呢？！', ['妈的，转向灯是摆设吗？！', '会不会开车啊！后视镜先看一眼！', '这也能往里挤？规则让你吃了？！']),
    suddenStop: response('angry', '别拿路当停车场', ['靠，停车先打灯行不行？！', '这儿是车道，不是你家车库！', '说停就停？后面的人会瞬移啊？！']),
    collision: response('angry', '血压上来了', ['靠！……行，车距是该留大点。', '我刚才居然没躲开？再来！', '这下舒服了，保险杠先下班。']),
    pothole: response('angry', '路也不讲规则', ['这坑谁挖的？！我记住了。', '靠，路面还能随机刷新陷阱？', '先绕过去。今天没空跟坑较劲！']),
    redLight: response('impatient', '急，但守规矩', ['急归急，红灯还是得等。', '倒计时快一点。我没说让我闯！', '都停好，绿灯了再走。']),
    idle: response('cool', '速度在线，规则也在线', ['快，是因为我提前看路。', '开得快和乱开，是两回事。', '今天这条路，拿下。']),
    win: response('cool', '帅是基本操作', ['这种程度？随便开开。', '看见没？又快，又讲规矩。', '到了。帅这件事，真没办法。'], '哼，小场面。'),
    lose: response('angry', '红温，但还嘴硬', ['靠！这趟怎么就翻车了？！', '我车技没问题！……行，刚才刹晚了。', '妈的，重来！这次谁都别想乱挤！'], '谁把这局难度调高了？！'),
  },
  wulong: {
    voice: '乌龙慢悠悠地说',
    pedestrian: response('calm', '你先，我不急', ['你先走。我也不是很赶。', '嗯，等你过去。', '走慢点，别把自己摔了。']),
    cutIn: response('calm', '情绪波动 0%', ['你这么急，那你先。', '哦。前面那格给你了。', '嗯，车道又不会长出薯片。']),
    suddenStop: response('calm', '慢一点也挺好', ['停吧，我也歇一会儿。', '前面停了？那就等等。', '不急，刚好看看小鸭子。']),
    collision: response('calm', '先看看薯片', ['哦，碰了一下。薯片还在就行。', '没事，车也需要休息。', '嗯……下次离远点。']),
    pothole: response('calm', '颠一下，醒一秒', ['路有点颠。还能接受。', '绕一下，也没多远。', '刚才那一下，差点把我颠醒。']),
    redLight: response('calm', '红灯也挺好', ['又能坐一会儿，挺好。', '绿了再叫我。', '嗯，我等着呢。']),
    idle: response('calm', '海风不错', ['海风挺好。上班另说。', '今天也没有特别想赢。', '能到就到，慢点也行。']),
    win: response('calm', '到了，情绪稳定', ['哦，到了。那先吃点。', '嗯，也没费什么劲。', '到了啊。小鸭子，收工。'], '到了啊。'),
    lose: response('calm', '没到，情绪也稳定', ['哦，没到。那也先吃点。', '没事。上班又不是只有今天。', '嗯，下趟再开。薯片还够。'], '那就歇一会儿。'),
  },
  cjyyza: {
    voice: 'CJYYYZA 的内心活动',
    pedestrian: response('brooding', '有意见，但不说', [reactionLine('……', '行人路径规划，怎么也没有边界条件。'), reactionLine('……', '算了，先停。人可不能回滚。'), reactionLine('……', '传送器需求，又多了一条。')]),
    cutIn: response('brooding', '省略号就是全部评价', [reactionLine('……', '转向灯这个接口，看来没实现。'), reactionLine('……', '想提意见。算了，不说。'), reactionLine('……', '这驾驶逻辑，谁 review 的。')]),
    suddenStop: response('brooding', '把意见咽回去了', [reactionLine('……', '停了也不发个事件通知。'), reactionLine('……', '通勤系统，果然应该重构。'), reactionLine('……', '不说了，先刹车。')]),
    collision: response('brooding', '不想说话', [reactionLine('……', '又多一个不该骑车上班的理由。'), reactionLine('……', '这算运行时异常吧。'), reactionLine('……', '没关系，至少不是服务器崩了。')]),
    pothole: response('brooding', '路况也有 bug', [reactionLine('……', '路面测试，应该漏了这个 case。'), reactionLine('……', '绕过去，暂时不修这个 bug。'), reactionLine('……', '地面居然也能空指针。')]),
    redLight: response('brooding', '等待，不输出', [reactionLine('……', '阻塞就阻塞吧。'), reactionLine('……', '等信号。这个我熟。'), reactionLine('……', '传送器原型，今天就做。')]),
    idle: response('brooding', '大脑还在写代码', [reactionLine('……', '骑完这段，感觉手臂都壮了一点。'), reactionLine('……', '传送器用什么技术栈呢。'), reactionLine('……', '今天先不跟路况争论。')]),
    win: response('power', '感觉自己更强壮了', ['这趟骑完，感觉又强壮了！', '通勤经验增加，肌肉应该也增加了。', '我是不是变强了？应该是。'], '感觉，又强了一点。'),
    lose: response('brooding', '传送器，立项', ['通勤太麻烦了。不如做个传送器。', '……不骑了，回去做传送器。', '问题不在车技，在于居然还要出门。'], '不如做个传送器。'),
  },
  sebastian: {
    voice: 'SEBASTIAN 系统播报',
    pedestrian: response('ai', '礼让协议已启动', ['检测到行人自由路径规划。建议先让对方完成运算。', '行人优先。您的迟到可以稍后解释。', '已识别突发过街请求。优先处理人类。']),
    cutIn: response('ai', '驾驶样本质量存疑', ['转向灯：未检测到。驾驶自信：异常充足。', '已记录一次低质量驾驶样本。不建议用于训练。', '对方似乎将车道线识别成了装饰。']),
    suddenStop: response('ai', '刹车协议已加载', ['前车已进入停车模式，通知功能疑似缺失。', '检测到临时静止物体。建议扩大缓冲区。', '对方的行程结束了。我们的还没有。']),
    collision: response('ai', '错误报告生成中', ['碰撞已确认。优雅程度下降，但仍可挽回。', '检测到一次不必要的物理交互。', '保险杠已收到反馈。建议改进输入。']),
    pothole: response('ai', '路面数据不完整', ['地图未标记此坑。已向现实提交 issue。', '检测到地面版本不一致，建议绕行。', '路面异常。已记入人类维护待办。']),
    redLight: response('ai', '遵守交通协议', ['红灯等待中。守法模块运行正常。', '允许您着急，暂不允许前进。', '请稍候，现实世界暂不支持跳过等待。']),
    idle: response('ai', '冷幽默模块在线', ['当前路线畅通。人类驾驶水平仍待观察。', '礼貌已加载，吐槽模块未关闭。', '预计能够抵达。此结论尚未计入人类变量。']),
    win: response('ai', '任务完成 · 置信度上升', ['任务完成。对人类驾驶的信心恢复了 0.3%。', '已抵达。今日优雅通勤协议执行成功。', '行程完成。感谢您没有将刹车当作装饰。'], '抵达协议，执行成功。'),
    lose: response('ai', '错误报告已生成', ['路线已重新规划。建议下次优先使用刹车。', '本次通勤未完成。错误来源：人类与现实的兼容性。', '遗憾，优雅无法抵消相对速度。建议重试。'], '通勤请求，执行失败。'),
  },
};

export class ReactionDirector {
  constructor(driverId, random = Math.random) {
    this.driver = getDriver(driverId); this.random = random; this.queue = []; this.seen = new Set();
    this.nextAt = 0; this.idleAt = 22; this.previous = new Map();
  }
  pick(type) {
    const personality = PERSONALITIES[this.driver.id], entry = personality[type] || personality.idle;
    let index = Math.min(entry.lines.length - 1, Math.floor(this.random() * entry.lines.length));
    if (entry.lines.length > 1 && this.previous.get(type) === index) index = (index + 1) % entry.lines.length;
    this.previous.set(type, index);
    return { ...entry.lines[index], type, mood: entry.mood, tag: entry.tag, title: entry.title, voice: personality.voice, driver: this.driver.id };
  }
  update(time, incidents = []) {
    for (const event of incidents) {
      if (!REACTION_PRIORITY[event.type] || this.seen.has(event.key)) continue;
      this.seen.add(event.key); this.queue.push(event);
    }
    this.queue = this.queue.filter(event => time - event.at <= 9).slice(-6);
    if (time < this.nextAt) return null;
    this.queue.sort((a, b) => REACTION_PRIORITY[b.type] - REACTION_PRIORITY[a.type] || b.at - a.at);
    const event = this.queue.shift();
    if (event) {
      this.nextAt = time + 5.5; this.idleAt = time + 24;
      return { ...this.pick(event.type), expiresAt: time + 4.5 };
    }
    if (time >= this.idleAt) {
      this.idleAt = time + 24 + this.random() * 12; this.nextAt = time + 5.5;
      return { ...this.pick('idle'), expiresAt: time + 4.5 };
    }
    return null;
  }
  result(won) { this.queue.length = 0; return this.pick(won ? 'win' : 'lose'); }
}
