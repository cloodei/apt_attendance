import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
 
interface TypeWriterProps {
  words: string;
  className?: string;
  duration?: number;
}
export function TypeWriter({ words, className = "", duration = 2.5 }: TypeWriterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayText = useTransform(rounded, (latest) => words.slice(0, latest));
 
  useEffect(() => {
    const controls = animate(count, words.length, {
      type: "tween",
      duration,
      ease: "easeInOut",
    });
    
    return controls.stop;
  }, [words]);
 
  return (
    <motion.span className={className}>
      {displayText}
    </motion.span>
  );
}
