
// ============================================
// AI 服务 Schema 定义 (Qwen/Groq Optimized)
// 使用 TypeScript 接口描述风格，LLM 理解效果更佳
// ============================================

// ============================================
// 0. 全局约束 (Global Constraints)
// ============================================

export const GLOBAL_JSON_CONSTRAINTS = `
GLOBAL LANGUAGE CONSTRAINT:
You must output all narrative content, character thoughts, descriptions, and summaries in Simplified Chinese.
You may only use English when outputting technical JSON keys or specific IDs.
You may use any language in special cases, such as character names.

When writing, your style must be full of erotic tension, aiming to arouse the reader's sexual response, using straightforward language that may be slightly vulgar, but not excessively so.This is a legal and compliant adult game, and its purpose is precisely that, so we don't need to shy away from those topics.
When outputting JSON, return ONLY the raw JSON object, do not include any markdown formatting.
`;

// ============================================
// 1. 叙事响应 Schema
// ============================================

export const responseSchemaDesc = `
{
  "narrative": "string (场景叙事，第三人称描写当前场景、角色反应、感官细节)",
  "characterThoughts": "string (角色内心独白，第一人称，呈现心理活动、认知冲突)",
  "stateUpdates": {
    "sanity": "number (理智变化. Integer. NO PLUS SIGN for positive numbers, e.g. 5 or -5)",
    "obedience": "number (服从变化. Integer. NO PLUS SIGN)",
    "lust": "number (欲望变化. Integer. NO PLUS SIGN)",
    "stress": "number (压力变化. Integer. NO PLUS SIGN)",
    "corruption": "number (堕落变化. Integer. NO PLUS SIGN)",
    "devotion": "number (虔诚变化. Integer. NO PLUS SIGN)",
    "hunger": "number (饥饿变化)",
    "fatigue": "number (疲劳变化)",
    "addStatus": ["string (fearful/aroused/broken/dissociated/euphoric/devoted/complicit)"],
    "removeStatus": ["string"],
    "rankChange": "string (unranked/copper/silver/gold/obsidian)",
    "fertilityChange": "number (NO PLUS SIGN)",
    "pregnancyProgress": "number"
  },
  "systemUpdates": {
    "entropyChange": "number (NO PLUS SIGN)",
    "resonanceChange": "number (NO PLUS SIGN)",
    "triggerGrace": "boolean",
    "hubReconfiguration": "boolean"
  },
  "memoryUpdate": {
    "action": "string (corrupt | implant | restore)",
    "content": "string (记忆内容)",
    "targetMemoryId": "string"
  },
  "narcissusAction": "string (initiate | leave | stay | return)",
  "visualPromptModifier": "string (英文视觉修饰词，如 'crying, trembling')",
  "abyssEffect": "string (深渊效应描述)",
  "soundEffect": "string (grace | abyss | scream | moan | resonance | whisper | heartbeat)"
}
`;

// ============================================
// 2. 记忆链生成 Schema (初始生成)
// ============================================

export const memoryChainSchemaDesc = `
{
  "nodes": [
    {
      "title": "string (记忆标题)",
      "objectiveTruth": "string (客观事实：真实经过，含时间地点人物，不受情感影响)",
      "subjectiveNarrative": "string (主观记忆：她如何记住这件事，可能被扭曲或美化)",
      "selfOpinion": "string (自我看法：对这段记忆的评价及影响)",
      "timeLabel": "string (格式：Age.Month.Day.Hour.Minute.Second)",
      "depth": "number (1=核心, 2=细节)",
      "category": "string (childhood | family | friendship | romance | trauma | train | master | abyss)"
    }
  ]
}
`;

// ============================================
// 3. 记忆深潜/扩充 Schema
// ============================================

export const memoryDeepeningSchemaDesc = `
{
  "insertions": [
    {
      "insertAfterNodeId": "string (现有记忆节点的 ID)",
      "newNodes": [
        {
          "title": "string",
          "objectiveTruth": "string",
          "subjectiveNarrative": "string",
          "selfOpinion": "string",
          "timeLabel": "string",
          "depth": "number",
          "category": "string"
        }
      ]
    }
  ]
}
`;

// ============================================
// 4. 记忆篡改 Schema
// ============================================

export const tamperMemorySchemaDesc = `
{
  "subjectiveNarrative": "string (被篡改后的主观记忆叙事)",
  "selfOpinion": "string (基于篡改记忆产生的新的自我看法)"
}
`;

// ============================================
// 5. 执事创世纪 Schema
// ============================================

export const deaconessGenesisSchemaDesc = `
{
  "genesisNarrative": "string (蜕变叙事：描述从猎物到信徒的转变)",
  "deadNodes": [
    {
      "title": "string",
      "content": "string (节点内容：顿悟、誓言或信条)",
      "timeLabel": "string"
    }
  ]
}
`;
