import { Maiden, CharacterStatus, CarriageType, ClothingState, AttireState, DressLevel, AccessoryItem, deepCopy } from '../../../meta';
import { NAKED_INTIMATE_LAYER, NAKED_UNDERGARMENT_LAYER, NAKED_OUTERWEAR_LAYER, BATHING_OUTERWEAR_LAYER, isCarryableItem, isBondageAccessory } from '../../../constants';

/** 基础空物品标识 */
const NONE_ITEM = { id: 'none', name: '无' };

/** 裸露状态 */
const NAKED_CLOTHING_STATE: ClothingState = {
  intimate: NAKED_INTIMATE_LAYER,
  undergarment: NAKED_UNDERGARMENT_LAYER,
  outerwear: NAKED_OUTERWEAR_LAYER,
  accessories: [],
  state: 'intact',
  dressLevel: 'naked',
};

/** 洗浴状态 */
const BATHING_CLOTHING_STATE: ClothingState = {
  intimate: NAKED_INTIMATE_LAYER,
  undergarment: NAKED_UNDERGARMENT_LAYER,
  outerwear: BATHING_OUTERWEAR_LAYER,
  accessories: [],
  state: 'wet',
  dressLevel: 'underwear_only',
};

/** 睡眠状态 */
const SLEEPING_CLOTHING_STATE: ClothingState = {
  intimate: NAKED_INTIMATE_LAYER,
  undergarment: NAKED_UNDERGARMENT_LAYER,
  outerwear: {
    top: { type: { id: 'nightgown', name: '睡裙' } },
    bottom: { type: { id: 'none', name: '无' } },
    gloves: { type: { id: 'none', name: '无' } },
    shoes: { type: { id: 'none', name: '无' } },
  },
  accessories: [],
  state: 'intact',
  dressLevel: 'naked',
};

// ==========================================
// 服装变化触发器
// ============================================

/** 活动对应的服装状态 */
const ACTIVITY_CLOTHING_MAP: Partial<Record<CharacterStatus, Partial<ClothingState>>> = {
  'bathing': BATHING_CLOTHING_STATE,
  'sleeping': SLEEPING_CLOTHING_STATE,
};

/** 需要放下携带物的活动 */
const DROP_CARRYABLES_ACTIVITIES: CharacterStatus[] = [
  'sleeping',
  'bathing',
  'eating',
  'confessing',
  'devoted',
  'performing',
];

/** 车厢类型对服装状态的影响 */
const CARRIAGE_CLOTHING_EFFECTS: Partial<Record<CarriageType, Partial<ClothingState>>> = {
  'POOLS': {
    state: 'wet' as AttireState,
  },
};

/**
 * @少女着装系统
 * 处理服装随活动/场景的自动变化
 */
export class MaidenClothing {
  /** 存储少女的原始服装 (用于恢复) */
  private originalClothing: Map<string, ClothingState> = new Map();

  /** 存储服装保存时间戳，用于定期清理 */
  private clothingTimestamps: Map<string, number> = new Map();

  /**
   * 根据活动更新服装状态
   * @param maiden 少女实体
   * @param newActivity 新活动
   * @param gameTimePassed 当前流逝时间
   * @returns 更新后的服装状态，如果无需更新则返回null
   */
  updateClothingForActivity(
    maiden: Maiden,
    newActivity: CharacterStatus,
    gameTimePassed: number
  ): ClothingState | null {
    const currentClothing = maiden.clothing;

    // 检查是否需要特殊服装
    const activityClothing = ACTIVITY_CLOTHING_MAP[newActivity];

    if (activityClothing) {
      // 保存原始服装以便恢复（使用深拷贝避免嵌套对象共享引用）
      if (!this.originalClothing.has(maiden.id)) {
        this.originalClothing.set(maiden.id, deepCopy(currentClothing));
        // 记录保存时间戳
        this.clothingTimestamps.set(maiden.id, gameTimePassed);
      }

      // 安全合并：保留当前服装结构，仅覆盖活动指定的字段
      const newClothing: ClothingState = {
        intimate: activityClothing.intimate ?? currentClothing.intimate,
        undergarment: activityClothing.undergarment ?? currentClothing.undergarment,
        outerwear: activityClothing.outerwear ?? currentClothing.outerwear,
        accessories: this.filterAccessoriesForActivity(
          currentClothing.accessories,
          newActivity
        ),
        state: activityClothing.state ?? currentClothing.state,
        dressLevel: currentClothing.dressLevel,
      };

      newClothing.dressLevel = this.getDressLevel(newClothing);
      return newClothing;
    }

    // 检查是否需要放下携带物
    if (DROP_CARRYABLES_ACTIVITIES.includes(newActivity)) {
      const filteredAccessories = this.filterAccessoriesForActivity(
        currentClothing.accessories,
        newActivity
      );

      if (filteredAccessories.length !== currentClothing.accessories.length) {
        return {
          ...currentClothing,
          accessories: filteredAccessories,
        };
      }
    }

    // 检查是否应该恢复原始服装
    if (this.originalClothing.has(maiden.id) && !ACTIVITY_CLOTHING_MAP[newActivity]) {
      const original = this.originalClothing.get(maiden.id)!;
      this.originalClothing.delete(maiden.id);
      this.clothingTimestamps.delete(maiden.id);

      // 保留当前服装的状态信息（如损伤、湿润等），但恢复原始服装的结构
      const restoredClothing: ClothingState = {
        ...original,
        state: currentClothing.state || original.state,
        accessories: original.accessories.map(originalAcc => {
          const currentAcc = currentClothing.accessories.find(ca => ca.type.id === originalAcc.type.id);
          return currentAcc || originalAcc;
        }),
      };

      restoredClothing.dressLevel = this.getDressLevel(restoredClothing);
      return restoredClothing;
    }

    return null;
  }

  /**
   * 根据车厢类型更新服装状态
   */
  updateClothingForCarriage(
    maiden: Maiden,
    carriageType: CarriageType
  ): Partial<ClothingState> | null {
    const effect = CARRIAGE_CLOTHING_EFFECTS[carriageType];
    return effect ? effect : null;
  }

  /**
   * 应用服装损坏
   */
  damageClothing(
    clothing: ClothingState,
    severity: 'minor' | 'moderate' | 'severe'
  ): ClothingState {
    const stateMap: Record<string, AttireState> = {
      minor: 'disheveled',
      moderate: 'torn',
      severe: 'torn',
    };

    return {
      ...clothing,
      state: stateMap[severity],
    };
  }

  /**
   * 弄湿服装
   */
  wetClothing(clothing: ClothingState): ClothingState {
    return {
      ...clothing,
      state: 'wet',
    };
  }

  /**
   * 弄脏服装
   */
  dirtyClothing(clothing: ClothingState): ClothingState {
    return {
      ...clothing,
      state: 'dirty',
    };
  }

  /**
   * 染血服装
   */
  bloodyClothing(clothing: ClothingState): ClothingState {
    return {
      ...clothing,
      state: 'bloody',
    };
  }

  /**
   * 浸透透明服装
   */
  transparentClothing(clothing: ClothingState): ClothingState {
    return {
      ...clothing,
      state: 'transparent',
    };
  }

  /**
   * 恢复服装状态为整洁
   */
  cleanClothing(clothing: ClothingState): ClothingState {
    return {
      ...clothing,
      state: 'intact',
    };
  }

  /**
   * 强制脱除所有服装
   */
  stripAll(maiden: Maiden): ClothingState {
    const currentClothing = maiden.clothing;

    // 保留不可移除的饰品
    const permanentAccessories = currentClothing.accessories.filter(
      acc => acc.isRemovable === false
    );

    return {
      ...NAKED_CLOTHING_STATE,
      accessories: permanentAccessories,
    };
  }

  /**
   * 脱除指定层级
   */
  removeLayer(
    clothing: ClothingState,
    layer: 'intimate' | 'undergarment' | 'outerwear'
  ): ClothingState {
    switch (layer) {
      case 'intimate':
        return {
          ...clothing,
          intimate: {
            bra: { type: NONE_ITEM },
            panties: { type: NONE_ITEM },
          },
          dressLevel: this.getDressLevel({
            ...clothing,
            intimate: { bra: { type: NONE_ITEM }, panties: { type: NONE_ITEM } }
          })
        };
      case 'undergarment':
        return {
          ...clothing,
          undergarment: {
            stockings: { type: NONE_ITEM },
            undershirt: { type: NONE_ITEM },
            underpants: { type: NONE_ITEM },
          },
          dressLevel: this.getDressLevel({
            ...clothing,
            undergarment: { stockings: { type: NONE_ITEM }, undershirt: { type: NONE_ITEM }, underpants: { type: NONE_ITEM } }
          })
        };
      case 'outerwear':
        return {
          ...clothing,
          outerwear: {
            top: { type: NONE_ITEM },
            bottom: { type: NONE_ITEM },
            gloves: { type: NONE_ITEM },
            shoes: { type: NONE_ITEM },
          },
          dressLevel: this.getDressLevel({
            ...clothing,
            outerwear: { top: { type: NONE_ITEM }, bottom: { type: NONE_ITEM }, gloves: { type: NONE_ITEM }, shoes: { type: NONE_ITEM } }
          })
        };
    }
  }

  /**
   * 添加饰品
   */
  addAccessory(
    clothing: ClothingState,
    accessory: AccessoryItem
  ): ClothingState {
    return {
      ...clothing,
      accessories: [...clothing.accessories, accessory],
    };
  }

  /**
   * 移除饰品
   */
  removeAccessory(
    clothing: ClothingState,
    accessoryTypeId: string
  ): ClothingState {
    return {
      ...clothing,
      accessories: clothing.accessories.filter(
        acc => acc.type.id !== accessoryTypeId && acc.isRemovable !== false
      ),
    };
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 根据活动过滤饰品
   * 移除携带物，保留不可移除的饰品
   */
  private filterAccessoriesForActivity(
    accessories: AccessoryItem[],
    activity: CharacterStatus
  ): AccessoryItem[] {
    return accessories.filter(acc => {
      // 不可移除的饰品始终保留
      if (acc.isRemovable === false) return true;

      // 洗浴时移除所有可移除饰品（除了束缚类）
      if (activity === 'bathing') {
        return isBondageAccessory(acc.type.id);
      }

      // 其他活动只移除携带物
      if (DROP_CARRYABLES_ACTIVITIES.includes(activity)) {
        return !isCarryableItem(acc.type.id);
      }

      return true;
    });
  }

  // ============================================
  // 生命周期管理 (Lifecycle)
  // ============================================

  /**
   * 少女离开/死亡时调用，清理 originalClothing 防止内存泄漏
   */
  clearMaiden(maidenId: string): void {
    this.originalClothing.delete(maidenId);
    this.clothingTimestamps.delete(maidenId);
  }

  /**
   * 定期清理过期的服装备份，防止内存泄漏
   * @param maxAge 最大保存时间（毫秒），默认为1小时
   */
  cleanupExpiredClothing(currentGameTime: number, maxAge: number = 60 * 60 * 1000): void {
    const now = currentGameTime;
    const expiredIds: string[] = [];

    for (const [maidId, timestamp] of this.clothingTimestamps.entries()) {
      if (now - timestamp > maxAge) {
        expiredIds.push(maidId);
      }
    }

    for (const maidId of expiredIds) {
      this.originalClothing.delete(maidId);
      this.clothingTimestamps.delete(maidId);
    }
  }

  // ============================================
  // 序列化 / 反序列化 (Save & Load)
  // ============================================

  /**
   * 序列化原始服装备份，用于存档
   */
  serialize(): [string, ClothingState][] {
    return Array.from(this.originalClothing.entries());
  }

  /**
   * 序列化时间戳数据，用于存档
   */
  serializeTimestamps(): [string, number][] {
    return Array.from(this.clothingTimestamps.entries());
  }

  /**
   * 获取服装穿着层级
   */
  getDressLevel(clothing: ClothingState): DressLevel {
    const hasOuterwear = clothing.outerwear.top.type.id !== 'none' || clothing.outerwear.bottom.type.id !== 'none';
    const hasUndergarment = clothing.undergarment.undershirt.type.id !== 'none' || clothing.undergarment.underpants.type.id !== 'none';
    const hasIntimate = clothing.intimate.bra.type.id !== 'none' || clothing.intimate.panties.type.id !== 'none';

    if (hasOuterwear) return 'fully_dressed';
    if (hasUndergarment || hasIntimate) return hasIntimate && !hasUndergarment ? 'underwear_only' : 'partially_dressed';
    return 'naked';
  }

  /**
   * 从存档恢复原始服装备份，防止读档后服装恢复机制失效
   */
  deserialize(data: [string, ClothingState][]): void {
    if (!Array.isArray(data)) return;
    this.originalClothing = new Map(
      data.filter(entry =>
        Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string'
      )
    );
  }

  /**
   * 从存档恢复时间戳数据
   */
  deserializeTimestamps(data: [string, number][]): void {
    if (!Array.isArray(data)) return;
    this.clothingTimestamps = new Map(
      data.filter(entry =>
        Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && typeof entry[1] === 'number'
      )
    );
  }
}

// 单例导出
export const maidenClothing = new MaidenClothing();