import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Solid healthcare primary CTA — filled blue, white label, no resting border/shadow.
 * Explicit hex + border-0 + shadow-none so styles cannot fall back to outline/ghost.
 */
export const primaryButtonClass =
  'inline-flex items-center justify-center rounded-lg h-10 px-4 text-sm font-medium ' +
  'bg-[#1D4ED8] text-white border-0 shadow-none ' +
  'hover:bg-[#1E40AF] active:bg-[#1E3A8A] ' +
  'transition-colors duration-150 ease-out ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50'

type Props = {
  children: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

export function PrimaryButton({ children, className = '', type = 'button', ...props }: Props) {
  return (
    <button type={type} className={`${primaryButtonClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
