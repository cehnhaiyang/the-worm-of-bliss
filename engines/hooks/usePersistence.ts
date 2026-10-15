
// ============================================
// 存档管理 Hook
// 封装存档/读档/重置的业务逻辑
// ============================================

import { useCallback } from 'react';
import { Carriage, Maiden, SystemState, MasterState, GameLog, LogType } from '../../meta';
import { persistenceService, audioService } from '../services';

// ============================================
// Props 接口
// ============================================

interface UsePersistenceProps {
    systemState: SystemState;
    masterState: MasterState;
    carriages: Map<string, Carriage>;
    maidens: Map<string, Maiden>;
    logs: GameLog[];
    setCarriages: React.Dispatch<React.SetStateAction<Map<string, Carriage>>>;
    setMaidens: React.Dispatch<React.SetStateAction<Map<string, Maiden>>>;
    setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
    setMasterState: React.Dispatch<React.SetStateAction<MasterState>>;
    setLogs: React.Dispatch<React.SetStateAction<GameLog[]>>;
    addLog: (type: LogType, content: string, speaker?: string, carriageId?: string) => void;
}

// ============================================
// Hook 实现
// ============================================

export const usePersistence = ({
    systemState,
    masterState,
    carriages,
    maidens,
    logs,
    setCarriages,
    setMaidens,
    setSystemState,
    setMasterState,
    setLogs,
    addLog,
}: UsePersistenceProps) => {

    // 保存游戏
    const handleSave = useCallback(async (slot: number) => {
        try {
            const result = await persistenceService.save(
                slot,
                systemState,
                masterState,
                carriages,
                maidens,
                logs
            );
            if (result.success) {
                addLog('system', `游戏已成功保存到槽位 #${slot}。`);
            } else {
                alert(`保存失败: ${result.error}`);
            }
        } catch (e) {
            alert('保存失败: ' + (e as Error).message);
        }
    }, [systemState, masterState, carriages, maidens, logs, addLog]);

    // 加载存档
    const handleLoad = useCallback(async (slot: number) => {
        try {
            const result = await persistenceService.load(slot);
            if (result.data) {
                // 恢复数据到 React 状态
                const { carriages: savedCarriages, maidens: savedMaidens } = persistenceService.restoreMaps(result.data);

                // 恢复子系统数据
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
            } else {
                alert(`未找到存档: ${result.error || '未知错误'}`);
            }
        } catch (e) {
            alert('加载失败: ' + (e as Error).message);
        }
    }, [setCarriages, setMaidens, setSystemState, setMasterState, setLogs, addLog]);

    // 重置游戏
    const handleReset = useCallback(async () => {
        if (confirm('确定要重置游戏吗？所有进度将丢失。')) {
            await persistenceService.deleteSave('auto');
            for (let i = 1; i <= 5; i++) {
                await persistenceService.deleteSave(i);
            }
            window.location.reload();
        }
    }, []);

    return { handleSave, handleLoad, handleReset };
};
