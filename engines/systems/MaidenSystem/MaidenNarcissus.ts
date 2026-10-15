import {
  Maiden,
  NarcissusStage,
  NarcissusState,
  NarcissusEligibility,
  CharacterStatus, clamp
} from '../../../meta';
import { maidenMemory } from './MaidenMemory';

/**
 * @水仙平原协议
 */
class MaidenNarcissus {

  // ============================================
  // 检查资格
  // ============================================

  checkEligibility(maiden: Maiden, gameTimePassed: number): NarcissusEligibility {
    const reasons: string[] = [];

    const requirements = {
      minDaysOnTrain: 30,
      minAbyssExposure: 3,
      sanityRange: [20, 70] as [number, number],
      hasExperiencedGrace: true,
    };

    if (!maiden || !maiden.attributes) {
      reasons.push('实体数据结构不完整');
      return { eligible: false, reasons, requirements };
    }

    const daysOnTrain = Math.floor(gameTimePassed / (24 * 60 * 60 * 1000));

    if (daysOnTrain < requirements.minDaysOnTrain) {
      reasons.push(`在列车上的时间不足 (${daysOnTrain}/${requirements.minDaysOnTrain}天)`);
    }

    if (maiden.abyssExposureCount < requirements.minAbyssExposure) {
      reasons.push(`深渊暴露次数不足 (${maiden.abyssExposureCount}/${requirements.minAbyssExposure}次)`);
    }

    if (maiden.attributes.sanity < requirements.sanityRange[0]) {
      reasons.push('理智过低，无法做出选择');
    }

    if (maiden.attributes.sanity > requirements.sanityRange[1]) {
      reasons.push('理智过高，尚未被充分"教化"');
    }

    if (maiden.graceReceived === 0 && requirements.hasExperiencedGrace) {
      reasons.push('未曾体验过神恩');
    }

    const currentState = maiden.narcissusState;
    if (currentState && currentState.stage !== 'none') {
      reasons.push('已在水仙平原协议中');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      requirements,
    };
  }

  // ============================================
  // 判断是否应该自动触发 (Autonomous Trigger)
  // ============================================

  shouldAutonomousTrigger(maiden: Maiden, gameTimePassed: number): boolean {
    const eligibility = this.checkEligibility(maiden, gameTimePassed);
    if (!eligibility.eligible) return false;

    if (!maiden.isshex || !maiden.isshex.hexaco || !maiden.isshex.facets || !maiden.isshex.behaviorWeights || !maiden.isshex.metaTraits) {
      return false; // 阻断残缺的人格模型导致的计算错误
    }

    // 基础触发概率：每Tick极低，因为这是稀有且重大的个人觉醒事件
    let chance = 0.002;

    // 1. 理智修正
    if (maiden.attributes.sanity < 35) chance += 0.003;

    // 2. 压力修正
    if (maiden.attributes.stress > 80) chance += 0.003;

    // 3. 深渊暴露修正
    chance += maiden.abyssExposureCount * 0.0005;

    // 4. IS-SHEX人格修正
    const { hexaco, facets, behaviorWeights, metaTraits } = maiden.isshex;

    chance *= (1 + (facets.fearfulness - 50) * 0.01);

    if (behaviorWeights.riskTolerance > 0.5 && hexaco.H < 40) {
      chance *= 2.0;
    }

    if (hexaco.A > 60 && behaviorWeights.obedienceBase > 10) {
      chance *= 0.5;
    }

    if (behaviorWeights.devotionTendency > 0.6) {
      chance *= 0.1;
    }

    if (hexaco.O > 60 && hexaco.C < 40) {
      chance *= 0.6;
    }

    if (metaTraits.alpha < 40) {
      chance *= 1.3;
    }

    return Math.random() < chance;
  }

  // ============================================
  // 触发协议
  // ============================================

  initiateProtocol(maiden: Maiden, gameTimePassed: number): { success: boolean; description: string; maidenUpdate: Partial<Maiden> } {
    const eligibility = this.checkEligibility(maiden, gameTimePassed);

    if (!eligibility.eligible) {
      return {
        success: false,
        description: `${maiden?.name || '未知实体'}尚未满足水仙平原协议的条件：${eligibility.reasons.join('；')}`,
        maidenUpdate: {},
      };
    }

    const newState: NarcissusState = {
      stage: 'choice',
      fadingLevel: 0,
      daysOutside: 0,
      hasReceivedInvitation: false,
    };

    return {
      success: true,
      description: `${maiden.name}在恍惚中偏离了路线。在一节未被标记的车厢尽头，她发现了那扇门。\n\n它没有上锁，门缝中透出一种令她战栗的、属于"过去"的气息。\n\n水仙平原协议已触发：她站在了选择的边缘。`,
      maidenUpdate: { narcissusState: newState },
    };
  }

  // ============================================
  // 选择离开
  // ============================================

  chooseToDeparture(maiden: Maiden, gameTimePassed: number): { description: string; maidenUpdate: Partial<Maiden> } {
    const state = maiden.narcissusState;
    if (!state || state.stage !== 'choice') {
      return {
        description: '协议状态异常。',
        maidenUpdate: {},
      };
    }

    const newState: NarcissusState = {
      ...state,
      stage: 'departed',
      departureTime: gameTimePassed,
    };

    // 去重写入 dissociated 状态
    const newStatus: CharacterStatus[] = maiden.status.filter(s => s !== 'panicked' && s !== 'dissociated');
    newStatus.push('dissociated');

    return {
      description: `${maiden.name}推开了那扇门。\n\n` +
        `她发现自己站在一个普通的火车站台上。身后，列车的轮廓在晨雾中逐渐消散，仿佛从未存在过。\n\n` +
        `她"自由"了。\n\n` +
        `但当她走出车站，踏入阳光下时，她感到了一丝异样——阳光是温暖的，但她感受不到那种温度。`,
      maidenUpdate: {
        narcissusState: newState,
        status: newStatus,
      },
    };
  }

  // ============================================
  // 选择留下
  // ============================================

  chooseToStay(maiden: Maiden): { description: string; maidenUpdate: Partial<Maiden> } {
    const state = maiden.narcissusState;
    if (!state || state.stage !== 'choice') {
      return {
        description: '协议状态异常。',
        maidenUpdate: {},
      };
    }

    if (!maiden.attributes) {
      return { description: '实体属性异常，操作中断。', maidenUpdate: {} };
    }

    return {
      description: `${maiden.name}看着那扇门，然后缓缓地转过身去。\n\n` +
        `她选择了留下。\n\n` +
        `也许是恐惧，也许是依赖，也许是某种她自己都无法理解的渴望。但在这一刻，她做出了选择——这个世界，才是她的归属。`,
      maidenUpdate: {
        narcissusState: undefined,
        attributes: {
          ...maiden.attributes,
          devotion: clamp(maiden.attributes.devotion + 20, 0, 100),
          obedience: clamp(maiden.attributes.obedience + 15, 0, 100),
        },
      },
    };
  }

  // ============================================
  // 更新外部世界状态（褪色）
  // ============================================

  updateFading(maiden: Maiden, deltaMs: number): {
    description?: string;
    stageChanged: boolean;
    newStage?: NarcissusStage;
    updatedState?: NarcissusState;
  } {
    const state = maiden.narcissusState;
    if (!state || state.stage !== 'departed') {
      return { stageChanged: false };
    }

    if (typeof deltaMs !== 'number' || deltaMs <= 0 || isNaN(deltaMs)) {
      return { stageChanged: false };
    }

    const hoursPassed = deltaMs / (1000 * 60 * 60);
    const daysOutside = state.daysOutside + hoursPassed / 24;

    const oldFading = state.fadingLevel;
    const fadingLevel = clamp(daysOutside * 2, 0, 100);

    let newStage: NarcissusStage = state.stage;
    let description: string | undefined = undefined;
    let stageChanged = false;
    let hasReceivedInvitation = state.hasReceivedInvitation;

    if (fadingLevel >= 30 && oldFading < 30) {
      newStage = 'fading';
      stageChanged = true;
      description = '世界开始褪色。食物尝起来像蜡，颜色变得灰暗，声音变得沉闷。';
    } else if (fadingLevel >= 70 && !hasReceivedInvitation) {
      newStage = 'invitation';
      stageChanged = true;
      hasReceivedInvitation = true;
      description = '在她精神濒临崩溃的边缘，一个陌生人出现了。他没有劝说，只是静静地聆听。\n\n' +
        '"如果你愿意回去，"他最后说，"契约已经准备好了。"';
    }

    const updatedState: NarcissusState = {
      ...state,
      daysOutside,
      fadingLevel,
      stage: newStage,
      hasReceivedInvitation,
    };

    return {
      description,
      stageChanged,
      newStage: stageChanged ? newStage : undefined,
      updatedState,
    };
  }

  // ============================================
  // 接受邀请回归
  // ============================================

  acceptInvitation(maiden: Maiden, gameTimePassed: number): { description: string; maidenUpdate: Partial<Maiden> } {
    const state = maiden.narcissusState;
    if (!state || state.stage !== 'invitation') {
      return {
        description: '协议状态异常。',
        maidenUpdate: {},
      };
    }

    if (!maiden.attributes || !maiden.status) {
      return { description: '实体核心数据丢失，操作中断。', maidenUpdate: {} };
    }

    const updatedState: NarcissusState = {
      ...state,
      stage: 'returned',
      returnTime: gameTimePassed,
    };

    // 归档旧记忆
    const archivedMaiden = maidenMemory.archiveMemoryChain(maiden);

    // 状态原子化处理：清洗对立状态，注入归拢状态
    const newStatus: CharacterStatus[] = maiden.status.filter(s =>
      s !== 'panicked' &&
      s !== 'dissociated' &&
      s !== 'deaconess' &&
      s !== 'devoted'
    );
    newStatus.push('deaconess', 'devoted');

    return {
      description: `${maiden.name}在那份印有黑色鸢尾花徽章的契约上签下了自己的名字。\n\n` +
        `当她再次睁开眼睛时，她已经回到了列车上。但这一次，她不再是猎物。\n\n` +
        `她是信徒。是女执事。是经过现实淬炼后，证明了我的世界才是唯一"真实"的灵魂。\n` +
        `（旧日人格已封存，等待注入新的记忆与意志。）`,
      maidenUpdate: {
        ...archivedMaiden,
        narcissusState: updatedState,
        rank: 'obsidian',
        rankColor: 'obsidian black with purple shimmer',
        status: newStatus,
        attributes: {
          ...maiden.attributes,
          devotion: 100,
          obedience: clamp(maiden.attributes.obedience + 90, 0, 100),
          corruption: clamp(maiden.attributes.corruption + 30, 0, 100),
          sanity: 60,
        },
      },
    };
  }

  // ============================================
  // 拒绝邀请
  // ============================================

  rejectInvitation(maiden: Maiden, gameTimePassed: number): { description: string; maidenUpdate: Partial<Maiden> } {
    const state = maiden.narcissusState;
    if (!state || state.stage !== 'invitation') {
      return {
        description: '协议状态异常。',
        maidenUpdate: {},
      };
    }

    const updatedState: NarcissusState = {
      ...state,
      stage: 'rejected',
      rejectionTime: gameTimePassed,
    };

    return {
      description: '她拒绝了邀请。\n\n' +
        '聆听者点了点头，没有说什么，转身离开了。\n\n' +
        '她继续活着，在那个褪色的世界里。但每一天，她都感觉自己在消失。' +
        '最终，她会成为一个空壳——活着，但感受不到任何活着的情感。',
      maidenUpdate: {
        narcissusState: updatedState,
      },
    };
  }

  // ============================================
  // 状态查询
  // ============================================

  getState(maiden: Maiden): NarcissusState | undefined {
    return maiden?.narcissusState;
  }

  isInProtocol(maiden: Maiden): boolean {
    const state = maiden?.narcissusState;
    return state !== undefined && state.stage !== 'none';
  }

  // ============================================
  // 序列化
  // ============================================

  serialize(maidens: Map<string, Maiden>): [string, NarcissusState][] {
    if (!maidens || !(maidens instanceof Map)) return [];

    const result: [string, NarcissusState][] = [];

    for (const [id, maiden] of maidens) {
      if (maiden && maiden.narcissusState) {
        result.push([id, maiden.narcissusState]);
      }
    }

    return result;
  }

  deserialize(data: [string, NarcissusState][], maidens: Map<string, Maiden>): void {
    if (!Array.isArray(data) || !maidens || !(maidens instanceof Map)) return;

    for (const [id, state] of data) {
      if (!id || !state) continue;

      const maiden = maidens.get(id);
      if (maiden) {
        maiden.narcissusState = state;
      }
    }
  }
}

export const maidenNarcissus = new MaidenNarcissus();