// ============================================
// 主应用组件 (Main Application Component)
// 整合所有UI组件和游戏引擎
// ============================================

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useGameEngine, usePersistence, audioService } from './engines';
import { formatGameTimeDisplay, getCurrentCarriageId } from './meta';

import { Log, Control } from './components/TerminalPanel';
import { MaidenList } from './components/MaidenPanel';
import { CarriagePanel } from './components/CarriagePanel';
import { SplashScreen } from './components';
import { Memory, Pregnancy, Relationship, MaidenCard } from './components/MaidenPanel/Card';
import { ABYSS_TYPES, CARRIAGE_TYPE_INFO } from './constants';

// ============================================
// 主组件
// ============================================

export default function App() {
    // 游戏引擎
    const {
        carriages,
        maidens,
        systemState,
        masterState,
        logs,
        isProcessing,
        handleAction,
        moveMaster,
        focusMaiden,
        updateResonance,
        triggerGrace,
        setTimeScale,
        togglePause,
        setMemoryChain,
        replaceMemoryNode,
        implantMemory,
        getCurrentCarriage,
        getFocusedMaiden,
        getMaidensInCarriage,
        getAllMaidenSummaries,
        // 暴露设置状态的方法以便加载存档
        setCarriages,
        setMaidens,
        setSystemState,
        setMasterState,
        setLogs,
        addLog,
    } = useGameEngine();

    // UI 状态
    const [showSplash, setShowSplash] = useState(true);
    const [showMemory, setShowMemory] = useState(false);
    const [showPregnancy, setShowPregnancy] = useState(false);
    const [showRelationship, setShowRelationship] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // 初始化完成检测
    useEffect(() => {
        if (maidens.size > 0 && carriages.size > 0) {
            setIsInitialized(true);
        }
    }, [maidens.size, carriages.size]);

    // 清除聚焦
    const handleClearFocus = useCallback(() => {
        setMasterState((prev: any) => ({ ...prev, focusedMaidenId: undefined }));
    }, [setMasterState]);

    // 存档管理
    const { handleSave, handleLoad, handleReset } = usePersistence({
        systemState, masterState, carriages, maidens, logs,
        setCarriages, setMaidens, setSystemState, setMasterState, setLogs, addLog,
    });

    // 当前车厢
    const currentCarriage = getCurrentCarriage();
    const isInAbyss = currentCarriage ? ABYSS_TYPES.includes(currentCarriage.type) : false;
    const carriageInfo = currentCarriage ? CARRIAGE_TYPE_INFO.find(info => info.type === currentCarriage.type) : null;

    // 聚焦的少女
    const focusedMaiden = getFocusedMaiden();

    // 当前车厢的少女
    const maidensInCarriage = useMemo(() => {
        return currentCarriage ? getMaidensInCarriage(currentCarriage.id) : [];
    }, [currentCarriage, getMaidensInCarriage, maidens]);

    // 所有少女摘要
    const allMaidenSummaries = useMemo(() => {
        return getAllMaidenSummaries();
    }, [getAllMaidenSummaries, maidens]);

    const handleSplashComplete = useCallback(() => {
        setShowSplash(false);
        // 初始化音频上下文，因为这是在用户交互（点击）之后
        audioService.init().then(() => {
            // 恢复音频上下文（如果被浏览器挂起）
            audioService.resume();
        });
    }, []);

    // 显示启动画面
    if (showSplash) {
        return (
            <SplashScreen
                onComplete={handleSplashComplete}
                isLoading={!isInitialized}
            />
        );
    }

    // 计算显示时间 - 使用新的真实时间格式
    const gameTimeString = formatGameTimeDisplay(systemState.gameTimePassed);

    return (
        <div className={`h-screen w-screen bg-black text-zinc-300 flex flex-col overflow-hidden font-serif ${isInAbyss ? 'abyss-mode' : ''} relative`}>

            {/* 顶部标题栏 */}
            <header className={`h-11 shrink-0 border-b flex items-center justify-between px-4 z-20 transition-colors duration-500 ${isInAbyss ? 'border-purple-900/40 bg-gradient-to-r from-purple-950/40 via-black/90 to-purple-950/40' : 'border-zinc-800/60 bg-gradient-to-r from-zinc-950/95 via-black/95 to-zinc-950/95'} backdrop-blur-md`}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className={`text-lg ${isInAbyss ? 'text-purple-400' : 'text-red-500'} opacity-80`}>◈</span>
                        <h1 className="font-header text-base text-zinc-100 tracking-[0.2em] drop-shadow-sm">THE WORM OF BLISS</h1>
                    </div>
                    <span className="text-[9px] text-zinc-600 font-tech tracking-wider hidden sm:inline">至乐之蠕虫</span>
                </div>

                <div className="flex items-center gap-2 font-tech text-xs">
                    {/* 当前位置 */}
                    <div className={`px-2.5 py-1 rounded-md flex items-center gap-2 transition-colors ${isInAbyss ? 'bg-purple-900/25 text-purple-300 border border-purple-800/30' : 'bg-zinc-900/80 text-zinc-300 border border-zinc-800/50'}`}>
                        <span className="opacity-60">{isInAbyss ? '◈' : '◇'}</span>
                        <span>{carriageInfo?.nameCN || '未知'}</span>
                        <span className="text-[10px] opacity-50 font-mono">{masterState.carriageId}</span>
                    </div>

                    {/* 时间 */}
                    <div className="px-2.5 py-1 bg-zinc-900/80 rounded-md text-zinc-300 font-mono border border-zinc-800/50 tracking-wider">
                        {gameTimeString}
                    </div>

                    {/* 状态指示 */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${systemState.isPaused ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-zinc-900/60 border border-zinc-800/30'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${systemState.isPaused ? 'bg-yellow-400' : 'bg-emerald-400'} ${!systemState.isPaused ? 'animate-pulse' : ''}`} />
                        <span className={`text-[10px] ${systemState.isPaused ? 'text-yellow-400' : 'text-zinc-500'}`}>
                            {systemState.isPaused ? 'PAUSED' : `${systemState.timeScale}x`}
                        </span>
                    </div>
                </div>
            </header>

            {/* 主内容区 */}
            <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 z-10">

                {/* 左侧面板：角色卡片 或 少女列表 */}
                <div className={`w-80 shrink-0 border-r flex flex-col overflow-hidden relative transition-colors duration-300 ${isInAbyss ? 'border-purple-900/30 bg-gradient-to-b from-purple-950/20 to-black/80' : 'border-zinc-800/50 bg-gradient-to-b from-zinc-900/40 to-black/80'} backdrop-blur-sm`}>

                    {/* 角色卡片层 - 有选中少女时显示 */}
                    {focusedMaiden ? (
                        <div className="absolute inset-0 z-20 bg-black/98 flex flex-col p-2.5 animate-fade-in h-full">
                            <MaidenCard
                                maiden={focusedMaiden}
                                carriageType={currentCarriage?.type}
                                onClose={handleClearFocus}
                                onOpenMemory={() => setShowMemory(true)}
                                onOpenPregnancy={() => setShowPregnancy(true)}
                                onOpenRelationship={() => setShowRelationship(true)}
                            />
                        </div>
                    ) : (
                        /* 列表层 - 无选中时显示 */
                        <div className="flex-1 p-2.5 min-h-0 overflow-hidden flex flex-col h-full">
                            <MaidenList
                                maidens={maidensInCarriage}
                                allMaidenSummaries={allMaidenSummaries}
                                focusedMaidenId={masterState.focusedMaidenId}
                                onMaidenSelect={focusMaiden}
                                currentCarriageId={masterState.carriageId}
                            />
                        </div>
                    )}
                </div>

                {/* 中间区域：终端 + 控制面板 */}
                <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-colors duration-300 ${isInAbyss ? 'bg-purple-950/10' : 'bg-black/30'}`}>
                    {/* 终端日志 */}
                    <div className="flex-1 p-2.5 min-h-0 overflow-hidden flex flex-col">
                        <Log logs={logs} />
                    </div>

                    {/* 控制面板 */}
                    <div className="shrink-0">
                        <Control
                            onSend={handleAction}
                            disabled={isProcessing}
                            systemState={systemState}
                            onResonanceChange={updateResonance}
                            onGrace={() => triggerGrace()}
                            onTimeScaleChange={setTimeScale}
                            onTogglePause={togglePause}
                            hasFocusedMaiden={!!focusedMaiden}
                            focusedMaidenName={focusedMaiden?.name}
                            gameTimeDisplay={gameTimeString}
                        />
                    </div>
                </div>

                {/* 右侧面板：整合的车厢面板 */}
                <CarriagePanel
                    carriages={carriages}
                    maidens={maidens}
                    masterCarriageId={masterState.carriageId}
                    onCarriageClick={moveMaster}
                    focusedMaidenCarriageId={focusedMaiden ? getCurrentCarriageId(focusedMaiden) : undefined}
                    currentCarriage={currentCarriage}
                    occupantCount={maidensInCarriage.length}
                    systemState={systemState}
                    onSave={handleSave}
                    onLoad={handleLoad}
                    onReset={handleReset}
                />
            </div>

            {/* 记忆回廊全屏面板 */}
            {showMemory && focusedMaiden && (
                <Memory
                    maiden={focusedMaiden}
                    gameStartTime={systemState.gameStartTime}
                    onClose={() => setShowMemory(false)}
                    onSetChain={setMemoryChain}
                    onReplaceNode={replaceMemoryNode}
                    onImplant={implantMemory}
                />
            )}

            {/* 怀孕监控全屏面板 */}
            {showPregnancy && focusedMaiden && (
                <Pregnancy
                    maiden={focusedMaiden}
                    allMaidens={maidens}
                    onClose={() => setShowPregnancy(false)}
                    onMaidenSelect={focusMaiden}
                />
            )}

            {/* 关系网络全屏面板 */}
            {showRelationship && focusedMaiden && (
                <Relationship
                    maiden={focusedMaiden}
                    allMaidens={maidens}
                    onClose={() => setShowRelationship(false)}
                    onMaidenSelect={focusMaiden}
                />
            )}
        </div>
    );
}
