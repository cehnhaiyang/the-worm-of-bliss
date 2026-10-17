
// ============================================
// AI 服务 Schema 定义 (Qwen/Groq Optimized)
// 使用 TypeScript 接口描述风格，LLM 理解效果更佳
// ============================================

import { CharacterStatus, RANK_ORDER } from '../../../meta';

/**
 * 叙事可增删的状态标签。
 *
 * 由 `CharacterStatus` 派生而非手写字面量：v1 这里写的是 `fearful`，
 * 而它属于 MoodState，实体上并不存在这个状态——模型照做之后，
 * 状态标签变成一个既不渲染也无语义的字符串。词表只能有一份，就是类型本身。
 * 同时导出给 TextService 做返回值过滤：提示词里承诺的词表和实际接受的词表必须同源。
 */
export const NARRATIVE_STATUSES: readonly CharacterStatus[] = [
  'panicked', 'aroused', 'broken', 'dissociated', 'euphoric', 'devoted', 'complicit',
];

/**
 * 模型可请求的事件音效。
 *
 * 只列 `AudioService.playEvent` 真正实现了的声音：v1 还写了 scream/moan/whisper/
 * heartbeat，而音频层没有对应生成器，模型请求后静默无声，且不报错。
 */
export const NARRATIVE_SOUND_EFFECTS = ['grace', 'abyss', 'resonance', 'hub_shuffle'] as const;

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
    "addStatus": ["string (仅限: ${NARRATIVE_STATUSES.join(' / ')})"],
    "removeStatus": ["string (仅限与 addStatus 相同的词表)"],
    "rankChange": "string (仅限: ${Object.keys(RANK_ORDER).join(' / ')})",
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
    "action": "string (implant | tamper)",
    "content": "string (记忆内容)",
    "targetMemoryId": "string (仅 tamper 使用：要重写的节点 ID)"
  },
  "narcissusAction": "string (initiate | leave | stay | return)",
  "abyssEffect": "string (深渊效应描述)",
  "soundEffect": "string (仅限: ${NARRATIVE_SOUND_EFFECTS.join(' / ')})"
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
      "insertAfterNodeId": "string (现有记忆节点的 ID，必须是链上真实存在的 ID)",
      "newNodes": [
        {
          "title": "string",
          "objectiveTruth": "string",
          "subjectiveNarrative": "string",
          "selfOpinion": "string",
          "timeLabel": "string",
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
