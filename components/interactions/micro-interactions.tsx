'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface MicroInteractionProps {
  children: ReactNode
  className?: string
}

// Hover scale effect
export function HoverScale({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hover lift effect (for cards)
export function HoverLift({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Button press effect
export function ButtonPress({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Pulse effect (for attention-grabbing)
export function Pulse({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Wiggle effect (for error states)
export function Wiggle({ children, className, trigger = false }: MicroInteractionProps & { trigger?: boolean }) {
  return (
    <motion.div
      animate={trigger ? {
        x: [-10, 10, -10, 10, 0],
      } : {}}
      transition={{
        duration: 0.4,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Bounce effect (for success states)
export function Bounce({ children, className, trigger = true }: MicroInteractionProps & { trigger?: boolean }) {
  return (
    <motion.div
      animate={trigger ? {
        y: [0, -20, 0],
      } : {}}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Glow effect (for highlights)
export function Glow({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 0 20px rgba(233, 30, 99, 0)',
          '0 0 20px rgba(233, 30, 99, 0.5)',
          '0 0 20px rgba(233, 30, 99, 0)',
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Rotate effect (for loading states)
export function Rotate({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Flip effect
export function Flip({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      whileHover={{ rotateY: 180 }}
      transition={{ duration: 0.6 }}
      className={className}
      style={{ perspective: 1200 }}
    >
      {children}
    </motion.div>
  )
}

// Shimmer/Loading effect
export function Shimmer({ children, className }: MicroInteractionProps) {
  return (
    <motion.div
      className={className}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.div>
  )
}

// Stagger children animation
interface StaggerProps extends MicroInteractionProps {
  delay?: number
  staggerDelay?: number
}

export function Stagger({ children, className, delay = 0, staggerDelay = 0.1 }: StaggerProps) {
  const childrenArray = Array.isArray(children) ? children : [children]

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: delay + index * staggerDelay,
            ease: 'easeOut',
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
