// ============================================
// 存档管理 Hook
// 封装存档/读档/重置的业务逻辑
// ============================================

import { useCallback } from 'react';
import {
    Carriage,
    Maiden,
    SystemState,
    MasterState,
    GameLog,
    LogType,
} from '../../meta';
import { persistenceService, audioService } from '../services';

// ============================================
// 入参契约
// ============================================

/**
 * 存档需要"按下按钮那一刻"的完整状态。
 *
 * 因此入参是 `stateRef` 而不是各个值本身：按值传入会让三个回调随每次渲染重建，
 * 而它们只在用户点击时执行，重建毫无收益，还会让依赖数组失真。
 */
interface UsePersistenceParams {
    stateRef: React.RefObject<{
        systemState: SystemState;
        masterState: MasterState;
        carriages: Map<string, Carriage>;
        maidens: Map<string, Maiden>;
        logs: GameLog[];
    }>;
    setCarriages: React.Dispatch<React.SetStateAction<Map<string, Carriage>>>;
    setMaidens: React.Dispatch<React.SetStateAction<Map<string, Maiden>>>;
    setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
    setMasterState: React.Dispatch<React.SetStateAction<MasterState>>;
    setLogs: React.Dispatch<React.SetStateAction<GameLog[]>>;
    addLog: (type: LogType, content: string, speaker?: string, carriageId?: string) => void;
}

interface UsePersistenceReturn {
    handleSave: (slot: number) => Promise<void>;
    handleLoad: (slot: number) => Promise<void>;
    handleReset: () => Promise<void>;
}

// ============================================
// Hook 实现
// ============================================

export const usePersistence = ({
    stateRef,
    setCarriages,
    setMaidens,
    setSystemState,
    setMasterState,
    setLogs,
    addLog,
}: UsePersistenceParams): UsePersistenceReturn => {

    const handleSave = useCallback(async (slot: number) => {
        const { systemState, masterState, carriages, maidens, logs } = stateRef.current;
        try {
            const result = await persistenceService.save(
                slot, systemState, masterState, carriages, maidens, logs
            );
            if (result.success) {
                addLog('system', `游戏已成功保存到槽位 #${slot}。`);
            } else {
                alert(`保存失败: ${result.error}`);
            }
        } catch (e) {
            alert('保存失败: ' + (e as Error).message);
        }
    }, [stateRef, addLog]);

    const handleLoad = useCallback(async (slot: number) => {
        try {
            const result = await persistenceService.load(slot);
            if (!result.data) {
                alert(`未找到存档: ${result.error || '未知错误'}`);
                return;
            }

            const { carriages: savedCarriages, maidens: savedMaidens } = persistenceService.restoreMaps(result.data);
            if (result.data.subsystems) {
                persistenceService.restoreSubsystems(result.data.subsystems, savedMaidens);
            }

            setCarriages(savedCarriages);
            setMaidens(savedMaidens);
            setSystemState(result.data.systemState);
            setMasterState(result.data.masterState);
            setLogs(result.data.logs);

            addLog('system', `>>> 记忆重载完成 >>> 读取槽位 #${slot} (D${result.data.stats.daysElapsed})`);
            audioService.playUI('confirm');
        } catch (e) {
            alert('加载失败: ' + (e as Error).message);
        }
    }, [setCarriages, setMaidens, setSystemState, setMasterState, setLogs, addLog]);

    const handleReset = useCallback(async () => {
        if (!confirm('确定要重置游戏吗？所有进度将丢失。')) return;

        await persistenceService.deleteSave('auto');
        for (let i = 1; i <= 5; i++) {
            await persistenceService.deleteSave(i);
        }
        window.location.reload();
    }, []);

    return { handleSave, handleLoad, handleReset };
};
