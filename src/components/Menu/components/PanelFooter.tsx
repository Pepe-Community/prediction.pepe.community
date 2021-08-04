import React from 'react'
import styled from 'styled-components'
import { IconButton } from '@pancakeswap/uikit'
import { MENU_ENTRY_HEIGHT } from '../config'
import { PanelProps, PushedProps } from '../types'
import ThemeSwitcher from './ThemeSwitcher'
import SocialLinks from './SocialLinks'
import LangSelector from './LangSelector'
import Cog from '../icons/Cog'

interface Props extends PanelProps, PushedProps {}

const Container = styled.div`
  flex: none;
  padding: 8px 4px;
  background-color: ${({ theme }) => theme.nav.background};
  border-top: solid 2px rgba(133, 133, 133, 0.1);
`

const SettingsEntry = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${MENU_ENTRY_HEIGHT}px;
  padding: 0 8px;
`

const SocialEntry = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${MENU_ENTRY_HEIGHT}px;
  padding: 0 16px;
`

const PanelFooter: React.FC<Props> = ({ isPushed, pushNav, toggleTheme, isDark, currentLang, langs, setLang }) => {
  if (!isPushed) {
    return (
      <Container>
        <IconButton variant="text" onClick={() => pushNav(true)}>
          <Cog />
        </IconButton>
      </Container>
    )
  }

  return (
    <Container>
      <SocialEntry>
        <SocialLinks />
      </SocialEntry>
      <SettingsEntry>
        <ThemeSwitcher isDark={isDark} toggleTheme={toggleTheme} />
        <LangSelector currentLang={currentLang} langs={langs} setLang={setLang} />
      </SettingsEntry>
    </Container>
  )
}

export default PanelFooter
