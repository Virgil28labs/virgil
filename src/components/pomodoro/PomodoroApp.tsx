import React from "react";
import { PomodoroTimer } from "./PomodoroTimer";
import type { PomodoroModalProps } from "../../types/pomodoro.types";
import "./Pomodoro.css";

export const PomodoroApp: React.FC<PomodoroModalProps> = ({
  isOpen,
  onClose,
}) => {
  return <PomodoroTimer isOpen={isOpen} onClose={onClose} />;
};
