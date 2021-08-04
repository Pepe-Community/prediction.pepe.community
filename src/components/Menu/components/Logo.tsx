import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'

import { Flex } from '@pancakeswap/uikit'
import { HamburgerIcon, HamburgerCloseIcon } from '../icons'
import MenuButton from './MenuButton'

interface Props {
  isPushed: boolean
  isDark: boolean
  togglePush: () => void
  href: string
}

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  .mobile-icon {
    width: 32px;
  }
  .desktop-icon {
    width: 40px;
    display: none;
    ${({ theme }) => theme.mediaQueries.nav} {
      display: block;
    }
  }
`

const Logo: React.FC<Props> = ({ isPushed, togglePush, href }) => {
  const innerLogo = (
    <>
      <img src="https://pepe.community/assets/img/logo.png" alt="ok" className="mobile-icon desktop-icon" />
    </>
  )

  return (
    <Flex>
      <MenuButton aria-label="Toggle menu" onClick={togglePush} mr="24px">
        {isPushed ? (
          <HamburgerCloseIcon width="24px" color="textSubtle" />
        ) : (
          <HamburgerIcon width="24px" color="textSubtle" />
        )}
      </MenuButton>

      <StyledLink as="a" href={href} aria-label="Pepe home page">
        {innerLogo}
      </StyledLink>
    </Flex>
  )
}

export default React.memo(Logo, (prev, next) => prev.isPushed === next.isPushed && prev.isDark === next.isDark)
