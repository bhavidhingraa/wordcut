"use client";

import { memo } from "react";

interface WordTokenProps {
  word: string;
  start: number;
  end: number;
  isCut: boolean;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: (e: React.MouseEvent) => void;
  onRestoreClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
}

const WordToken = memo(function WordToken({
  word,
  start,
  end,
  isCut,
  isSelected,
  isCurrent,
  onClick,
  onRestoreClick,
  onMouseEnter,
}: WordTokenProps) {
  let className = "word-token ";
  if (isCut) className += "cut ";
  else if (isSelected) className += "selected ";
  else if (isCurrent) className += "current ";

  return (
    <span
      className={className}
      onClick={isCut ? onRestoreClick : onClick}
      onMouseEnter={onMouseEnter}
      title={`${start.toFixed(2)}s → ${end.toFixed(2)}s`}
    >
      {word}{" "}
    </span>
  );
});

export default WordToken;
