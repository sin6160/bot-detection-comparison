'use client';

import { useEffect, useState } from 'react';

export default function MouseCursorEffect() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    // マウスイベントリスナーを設定
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <div
      className={`fixed pointer-events-none z-[9999] transition-opacity duration-300 ${
        isVisible ? 'opacity-70' : 'opacity-0'
      }`}
      style={{
        left: mousePosition.x,
        top: mousePosition.y,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'rgba(34, 197, 94, 0.3)', // 薄い緑色 (green-500 with opacity)
        border: '2px solid rgba(34, 197, 94, 0.6)', // より濃い緑の境界線
        transform: 'translate(-50%, -50%)', // 円の中心がマウスカーソル位置になるように調整
      }}
    />
  );
}