export const TAMPER_PERMISSIONS = {
  unranked: {
    canTamper: false,
    canImplant: false,
    capability: 'none',
    description: '权限不足 (需铜环及以上)',
  },
  copper: {
    canTamper: true,
    canImplant: false,
    capability: 'semantic',
    description: '语义微调：仅限修改情绪色彩、模糊细节或改变形容词。不能改变事件主体。',
  },
  silver: {
    canTamper: true,
    canImplant: false,
    capability: 'object',
    description: '对象替换：可以修改事件中的物品、地点或次要人物。不能改变核心事件的因果。',
  },
  gold: {
    canTamper: true,
    canImplant: true,
    capability: 'subject_object',
    description: '主客体重置：可以颠倒受害者与施害者的关系，修改事件的核心起因。',
  },
  obsidian: {
    canTamper: true,
    canImplant: true,
    capability: 'reality_rewrite',
    description: '现实重写：神之权限，定义真理。',
  },
} as const;
