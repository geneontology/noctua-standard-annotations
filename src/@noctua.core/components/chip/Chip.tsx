import type React from 'react'

interface ChipProps {
  icon: React.ReactNode
  chipClass: string
  circleClass: string
  onClick?: () => void
  trailing?: React.ReactNode
  className?: string
  children: React.ReactNode
}

const BASE =
  'flex h-[26px] items-center rounded-full border text-xs transition-shadow hover:shadow-sm hover:brightness-95'
const CIRCLE =
  'flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border-r text-xs'

const Chip: React.FC<ChipProps> = ({
  icon,
  chipClass,
  circleClass,
  onClick,
  trailing,
  className = '',
  children,
}) => {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`${BASE} ${chipClass} ${onClick ? 'cursor-pointer' : ''} ${trailing ? 'pr-1' : 'pr-3'} ${className}`}
    >
      <div className={`${CIRCLE} ${circleClass}`}>{icon}</div>
      <span className="grow truncate px-2">{children}</span>
      {trailing}
    </Tag>
  )
}

export default Chip
