
// ============================================
// 键盘快捷键 Hook
// 集中管理全局键盘事件
// ============================================

import { useEffect } from 'react';

// ============================================
// Props 接口
// ============================================

interface UseKeyboardShortcutsProps {
    // 面板可见性控制
    showHelp: boolean;
    setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
    showMemory: boolean;
    setShowMemory: React.Dispatch<React.SetStateAction<boolean>>;
    showPregnancy: boolean;
    setShowPregnancy: React.Dispatch<React.SetStateAction<boolean>>;
    showRelationship: boolean;
    setShowRelationship: React.Dispatch<React.SetStateAction<boolean>>;
    // 游戏控制
    focusedMaidenId: string | undefined;
    onClearFocus: () => void;
    togglePause: () => void;
}

// ============================================
// Hook 实现
// ============================================

export const useKeyboardShortcuts = ({
    showHelp,
    setShowHelp,
    showMemory,
    setShowMemory,
    showPregnancy,
    setShowPregnancy,
    showRelationship,
    setShowRelationship,
    focusedMaidenId,
    onClearFocus,
    togglePause,
}: UseKeyboardShortcutsProps) => {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 忽略输入框中的按键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'h':
                    setShowHelp(prev => !prev);
                    break;
                case 'escape':
                    if (showHelp) setShowHelp(false);
                    else if (showMemory) setShowMemory(false);
                    else if (showPregnancy) setShowPregnancy(false);
                    else if (showRelationship) setShowRelationship(false);
                    else if (focusedMaidenId) onClearFocus();
                    break;
                case ' ':
                    e.preventDefault();
                    togglePause();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        togglePause, focusedMaidenId,
        showHelp, setShowHelp,
        showMemory, setShowMemory,
        showPregnancy, setShowPregnancy,
        showRelationship, setShowRelationship,
        onClearFocus,
    ]);
};
