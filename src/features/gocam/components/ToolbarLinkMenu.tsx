import type React from 'react'
import { Button } from '@mantine/core'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import { IoChevronDown } from 'react-icons/io5'
import { usePopover } from '@/@noctua.core/hooks/usePopover'

interface LinkItem {
  label: string
  href: string | undefined
}

interface ToolbarLinkMenuProps {
  label: string
  items: LinkItem[]
}

const ToolbarLinkMenu: React.FC<ToolbarLinkMenuProps> = ({ label, items }) => {
  const menu = usePopover()

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        onClick={e => menu.open(e.currentTarget)}
        rightSection={<IoChevronDown size={12} />}
        className="!text-xs !normal-case"
      >
        {label}
      </Button>
      <AnchoredMenu anchorEl={menu.anchor} open={menu.isOpen} onClose={menu.close}>
        {items.map(item => (
          <MenuItem key={item.label} onClick={menu.close}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              {item.label}
            </a>
          </MenuItem>
        ))}
      </AnchoredMenu>
    </>
  )
}

export default ToolbarLinkMenu
