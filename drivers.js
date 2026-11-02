// 固定角色与专属载具，依据 assets/character-references.json 的五张用户参考。
// 属性为本轮首版可调数值；首页展示与驾驶模型共用这一份配置。
export const DRIVERS = Object.freeze([
  { id: 'clover', name: 'CLOVER', title: '急性子规则派', number: '01', tag: '又快又较真',
    note: '我开得快，不代表你能乱来。', description: '急性子，讲规则，小红车开得很快。最看不惯横穿马路和乱变道；到了就装帅，翻车就红温。',
    vehicle: '红色小车', kind: 'car', color: '#f34f46', accent: '#e9ff54', sheet: 'assets/clover-turnaround.webp', tile: '0% 0%',
    homeArt: 'assets/clover-home-v2.webp', resultArt: { won: 'assets/clover-victory-v2.webp', lost: 'assets/clover-defeat-v2.webp' },
    stats: { speed: 1.2, acceleration: 1.15, handling: 1, braking: 1.15 }, length: 4.3, width: .57 },
  { id: 'cjyyza', name: 'CJYYYZA', title: '城市穿行选手', number: '02', tag: '灵活派',
    note: '……算了，回去做个传送器。', description: '对低素质驾驶有意见，但不说，只会……。成功后觉得自己更强壮了；失败后觉得通勤太麻烦，不如做传送器。',
    vehicle: '绿色折叠车', kind: 'bicycle', color: '#2caa76', accent: '#a4f5c4', sheet: 'assets/cjyyza-turnaround.webp', tile: '0% 100%',
    homeArt: 'assets/cjyyza-home-v2.webp', resultArt: { won: 'assets/cjyyza-victory-v2.webp', lost: 'assets/cjyyza-defeat-v2.webp' },
    stats: { speed: .82, acceleration: 1.2, handling: 1.25, braking: 1.2 }, length: 3.2, width: .36 },
  { id: 'wulong', name: 'WULONG', title: '慢悠悠快乐骑手', number: '03', tag: '稳当派',
    note: '到了也行，没到也行。', description: '黄色三轮车，一只小鸭子。路上遇到什么都无所谓，成功失败一样淡定，薯片比名次重要。',
    vehicle: '黄色三轮车', kind: 'tricycle', color: '#ffd348', accent: '#ffd348', sheet: 'assets/wulong-turnaround.webp', tile: '100% 0%',
    homeArt: 'assets/wulong-home-v2.webp', resultArt: { won: 'assets/wulong-victory-v2.webp', lost: 'assets/wulong-defeat-v2.webp' },
    stats: { speed: .9, acceleration: .88, handling: .86, braking: 1.3 }, length: 3.1, width: .57 },
  { id: 'sebastian', name: 'SEBASTIAN', title: '优雅的未来车手', number: '04', tag: '速度派',
    note: '礼貌已加载，吐槽模块未关闭。', description: '有礼貌的 AI 管家，擅长用系统报告讲冷笑话。成功会更新对人类的信心，失败会优雅地生成错误报告。',
    vehicle: '蓝色飞行器', kind: 'hovercraft', color: '#358bea', accent: '#bda8ff', sheet: 'assets/sebastian-turnaround.webp', tile: '100% 100%',
    homeArt: 'assets/sebastian-home-v2.webp', resultArt: { won: 'assets/sebastian-victory-v2.webp', lost: 'assets/sebastian-defeat-v2.webp' },
    stats: { speed: 1.12, acceleration: 1.08, handling: .9, braking: .9 }, length: 4.3, width: .64 },
]);
export function getDriver(id) { return DRIVERS.find(driver => driver.id === id) || DRIVERS[0]; }
